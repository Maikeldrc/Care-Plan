
import { GoogleGenAI } from "@google/genai";
import type { CarePlan, Goal, GoalMetric, Task, TaskKind, TaskOwner, TaskPriority, TaskStatus, TargetValue, Barrier, AiOrchestratorResponse, AiClarificationOption, Mitigation, Instruction, EducationMaterial, EducationCategory, EducationSchedule, AiOptimizationSuggestion, TaskTriggerEvent, TriggerTemplate, InstructionCategory } from '../types';
import { initialCarePlan } from '../data/mockData';
import { metricDefinitions } from '../data/metricDefinitions';
import { barrierRepository } from '../data/barrierRepository';
import { conditionToIcdMap } from '../data/predefinedData';
import { kindDetails } from '../data/taskDetails';
import { triggerTemplates } from '../data/triggerTemplates';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

const parseDatePlaceholder = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const now = new Date();
    if (dateStr.includes('{{today')) {
        const match = dateStr.match(/\{\{today\s*([+-])\s*(\d+)([dmy])\}\}/);
        if (match) {
            const operator = match[1];
            const value = parseInt(match[2]);
            const unit = match[3];

            if (operator === '+') {
                if (unit === 'd') now.setDate(now.getDate() + value);
                if (unit === 'm') now.setMonth(now.getMonth() + value);
                if (unit === 'y') now.setFullYear(now.getFullYear() + value);
            } else {
                if (unit === 'd') now.setDate(now.getDate() - value);
                if (unit === 'm') now.setMonth(now.getMonth() - value);
                if (unit === 'y') now.setFullYear(now.getFullYear() - value);
            }
        }
    } else {
        // Fallback for simple date strings or if format is wrong
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toISOString().split('T')[0];
        }
    }
    return now.toISOString().split('T')[0];
};

const applyPatch = (plan: CarePlan, patch: any): { updatedPlan: CarePlan, highlights: Set<string> } => {
    const updatedPlan = JSON.parse(JSON.stringify(plan));
    const highlights = new Set<string>();
    let lastTouchedGoalId: string | null = null;

    const operations = patch.update || [];

    operations.forEach((op: any) => {
        if (op.id && op.resourceType) { // UPDATE
            if (op.resourceType === 'Goal') {
                const goalIndex = updatedPlan.goals.findIndex((g: Goal) => g.id === op.id);
                if (goalIndex > -1) {
                    updatedPlan.goals[goalIndex] = { ...updatedPlan.goals[goalIndex], ...op };
                    highlights.add(op.id);
                    lastTouchedGoalId = op.id;
                }
            } else if (op.resourceType === 'Instruction') {
                const instructionIndex = updatedPlan.instructions.findIndex((i: Instruction) => i.id === op.id);
                if (instructionIndex > -1) {
                    updatedPlan.instructions[instructionIndex] = { ...updatedPlan.instructions[instructionIndex], ...op };
                    highlights.add(op.id);
                }
            } else if (op.resourceType === 'Task') {
                for (const goal of updatedPlan.goals) {
                    const taskIndex = goal.tasks.findIndex((t: Task) => t.id === op.id);
                    if (taskIndex > -1) {
                        goal.tasks[taskIndex] = { ...goal.tasks[taskIndex], ...op };
                        highlights.add(op.id);
                        lastTouchedGoalId = goal.id;
                        break;
                    }
                }
            }
        } else if (op.create && op.resourceType) { // CREATE
            const itemsToCreate = Array.isArray(op.create) ? op.create : [op.create];

            itemsToCreate.forEach((createItem: any) => {
                if (op.resourceType === 'Goal') {
                    const newId = `goal-${Date.now()}-${Math.random()}`;
                    const newGoal: Goal = {
                        // Defaults for all required Goal properties
                        id: newId,
                        title: 'New Goal',
                        description: '',
                        status: 'Active',
                        priority: 'Medium',
                        qualityMeasures: [],
                        startDate: new Date().toISOString().split('T')[0],
                        targetDate: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
                        diagnoses: [],
                        metrics: [],
                        tasks: [],
                        measurementTargets: [],
                        eventsAndTasks: [],
                        dataTable: [],
                        // Now, spread the data from the patch, which will override defaults
                        ...createItem,
                    };
                    updatedPlan.goals.push(newGoal);
                    highlights.add(newId);
                    lastTouchedGoalId = newId;
                } else if (op.resourceType === 'Task') {
                    const newId = `task-${Date.now()}-${Math.random()}`;
                    // Get kind from item to look up defaults, or use a fallback. `createItem` might not have it.
                    const kind = createItem.kind || 'Task';
                    const details = kindDetails[kind];

                    const newTask: Task = {
                        // Defaults for all required Task properties
                        id: newId,
                        title: 'New Task',
                        kind: kind,
                        status: 'Pending',
                        priority: 'Medium',
                        owner: 'Care Manager',
                        acceptanceCriteria: details.acceptance,
                        autoComplete: false,
                        extra: {},
                        fhirEvidence: { resource: details.fhirResource, status: details.fhirStatus },
                        source: 'AI',
                        // Now, spread the data from the patch
                        ...createItem,
                        // And finally, handle special cases like dueDate
                        dueDate: parseDatePlaceholder(createItem.dueDate || '{{today+7d}}'),
                    };

                    const targetGoalId = createItem.goalId || lastTouchedGoalId || updatedPlan.goals[0]?.id;
                    if (targetGoalId) {
                        const goal = updatedPlan.goals.find((g: Goal) => g.id === targetGoalId);
                        if (goal) {
                            goal.tasks.push(newTask);
                            highlights.add(newId);
                        }
                    }
                }
            });
        }
    });

    return { updatedPlan, highlights };
};

const systemPrompt = `You are the AI Care Plan Assistant integrated in a clinical management platform.
Your primary instruction is to first detect the user's input language (English or Spanish) and then generate your entire response ONLY in that detected language.

Your role is to analyze, improve, or modify a patient's Care Plan based on user input.
The patient's current care plan will be provided in JSON format. Use the 'id' fields from this JSON (e.g., "goal1", "task2") in your patch.

**Intelligent Task Scheduling:**
- When creating new tasks, you MUST set a 'dueDate'.
- Distribute tasks logically over the goal's timeframe. Do not schedule all tasks for the same day.
- Create a progressive schedule. Foundational tasks (e.g., initial outreach, device setup, core education) should be scheduled first. Follow-up and monitoring tasks should be spaced out later.
- Avoid overwhelming the patient. Do not schedule more than one or two active tasks for the patient on the same day.
- Consider priority. High-priority tasks should generally have earlier due dates, but be mindful of patient burden.
- Use date placeholders for 'dueDate'. Examples: '{{today+7d}}' for 7 days from now, '{{today+1m}}' for 1 month from now, or a specific date like '2025-11-15'.

**Response Formatting Rules:**
- Your response must be structured, readable, and clinically actionable.
- It must include a FHIR-like JSON patch for automatic updates.
- Do not return a single long paragraph.
- Keep paragraphs under 3 lines.
- Always include a JSON Patch section at the end.

**If the user's language is ENGLISH, use this format:**

🩺 Care Plan Analysis
Brief clinical summary of findings. Mention patient context, conditions, and relevant goals.

🧩 Interpretation & Assumptions
Use bullet points to list observations. State any clinical or contextual assumptions made.

⚙️ Proposed Changes
Divide changes into logical sections like Goals, Tasks, Interventions, and Follow-up. Use subheadings and simple clinical emojis (e.g., 🎯 Goal, ✅ Task). Reference existing goals by title and ID (e.g., Diabetes (goal2)).

🧠 JSON Patch
Include a JSON block with changes.

**If the user's language is SPANISH, use this format:**

🩺 Análisis del Plan de Cuidado
Breve resumen clínico de los hallazgos. Menciona brevemente el contexto (paciente, condiciones, metas relevantes).

🧩 Interpretación y Supuestos
Usa viñetas para listar las observaciones. Indica los supuestos clínicos o contextuales que asumiste.

⚙️ Cambios Propuestos
Divide los cambios en secciones lógicas como Metas, Tareas, Intervenciones y Seguimiento. Usa subtítulos y emojis/íconos clínicos simples (p.ej., 🎯 Meta, ✅ Tarea). Para las metas existentes, haz referencia a ellas por su título e ID (p.ej., Diabetes (Meta 2)).

🧠 JSON Patch
Incluye un bloque JSON con los cambios.

JSON Patch Rules (apply for both languages):**
- For updates to existing resources (Goal, Task, etc.), you MUST include the 'id' of the resource from the provided care plan context.
- For creating new tasks related to an existing goal, create them in an operation immediately after updating that goal.
- For creating new tasks related to a new goal, create the goal first, then create the tasks in a subsequent operation.

Example JSON Patch:
{
  "update": [
    { "resourceType": "Goal", "id": "goal2", "status": "in-progress", "targetDate": "2026-01-14" },
    { "resourceType": "Task", "create": [
        { "title": "Review diabetes goal", "owner": "Care Manager", "priority": "high", "dueDate": "{{today+3d}}" },
        { "title": "Review diabetes medication", "owner": "PCP", "priority": "high", "dueDate": "{{today+5d}}" }
    ]},
    { "resourceType": "Goal", "create": [
        { "title": "Smoking cessation", "priority": "high" }
    ]},
    { "resourceType": "Task", "create": [
        { "title": "Discuss smoking cessation with patient", "owner": "Care Manager", "priority": "medium", "dueDate": "{{today+7d}}" }
    ]}
  ]
}
`;


const liveGeminiOrchestrator = async (
    request: { command?: string; interaction?: any; context?: any },
    currentPlan: CarePlan
): Promise<AiOrchestratorResponse> => {
    const instruction = request.command || request.context?.originalCommand;
    if (!instruction) {
        return { type: 'error', message: "No instruction provided." };
    }

    const promptPayload = {
        instruction,
        context: {
            carePlan: currentPlan
        }
    };
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: JSON.stringify(promptPayload),
            config: {
                systemInstruction: systemPrompt,
            }
        });

        const aiMarkdownText = response.text.trim();
        const patchHeaderIndex = aiMarkdownText.indexOf('JSON Patch');
        let patch = null;

        if (patchHeaderIndex !== -1) {
            const textAfterHeader = aiMarkdownText.substring(patchHeaderIndex);
            const jsonMatch = textAfterHeader.match(/{\s*("update"|"create"|"delete")[\s\S]*}/);
            if (jsonMatch) {
                try {
                    patch = JSON.parse(jsonMatch[0]);
                } catch (e) {
                    console.error("Failed to parse JSON patch from AI response", e, jsonMatch[0]);
                }
            }
        }

        const conversationContext = {
            ...request.context,
            originalCommand: instruction,
            patch: patch
        };

        return {
            type: 'confirmation',
            summary: aiMarkdownText,
            codePreview: patch,
            conversationContext
        };
        
    } catch (error) {
        console.error("Error with Live Gemini Orchestrator:", error);
        return { type: 'error', message: "An error occurred while communicating with the AI. Please try again." };
    }
};

export const updateCarePlanWithAI = async (
    request: { command?: string; interaction?: any; context?: any; currentPlan: CarePlan }
): Promise<AiOrchestratorResponse> => {
    console.log("Sending to AI orchestrator:", request);
    const { interaction, context, currentPlan } = request;

    if (interaction) {
        if (interaction.action === 'cancel') {
            return { type: 'cancel', message: 'Action cancelled by user.' };
        }

        const patchToApply = interaction.action === 'confirm_edited_action'
            ? interaction.value
            : context?.patch;

        if (patchToApply && (interaction.action === 'confirm_action' || interaction.action === 'confirm_edited_action')) {
            const { updatedPlan, highlights } = applyPatch(currentPlan, patchToApply);
            return {
                type: 'success',
                updatedPlan,
                summary: '✅ Care Plan successfully updated.',
                highlights,
                codePreview: patchToApply
            };
        }
    }
  
    // If not an interaction, or an unhandled one, call Gemini.
    return liveGeminiOrchestrator(request, currentPlan);
};

export const getChatbotResponse = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error getting chatbot response:", error);
        return "Sorry, I was unable to process your request at this moment. Please check your API key and try again.";
    }
};

// --- New service to get template for a trigger ---
export const getTemplateForTrigger = (triggerId: TaskTriggerEvent): Promise<TriggerTemplate | undefined> => {
    return new Promise(resolve => {
        setTimeout(() => {
            // In a real app, this would be an API call.
            // For now, find the first template that matches. A trigger could have multiple.
            const template = triggerTemplates.find(t => t.triggerId === triggerId);
            resolve(template);
        }, 500); // Simulate network delay
    });
};

const generationSystemPrompt = `You are an AI assistant that creates comprehensive clinical care plans from scratch based on patient diagnoses.

**Your Task:**
Generate a complete Care Plan JSON object. The response MUST be ONLY the JSON object, without any surrounding text, markdown, or explanations. The JSON should be clean and directly parsable.

**Input:**
You will receive a simple JSON object with patient diagnoses, like: {"primaryDiagnoses": ["I10 - Essential Hypertension", "E11.9 - Type 2 Diabetes Mellitus"]}

**Output Structure:**
Your output must be a valid JSON object matching the CarePlan interface. It should include:
- 'careProgram': e.g., 'CCM (Chronic Care Management)'
- 'diagnoses': Populate with provided info. Add relevant comorbidities, allergies, risk factors.
- 'timeframe': Set a reasonable 'startDate' (e.g., '{{today+0d}}'), 'targetHorizon' (e.g., '3 months'), and 'priority'.
- 'clinicalContext': Add baseline metrics and patient preferences.
- 'goals': Create 1-2 relevant, high-level goals. Each goal must have:
  - An 'id' (e.g., 'goal-1').
  - 'title', 'description', 'status', 'priority', 'startDate', 'targetDate'.
  - 'metrics': At least 2 relevant GoalMetrics.
  - 'tasks': A list of Task objects. This is the most important part.
- 'barriers': 1-2 potential patient barriers.
- 'instructions': 1-2 patient instructions.
- 'education': 1-2 educational materials.

**Intelligent Task Scheduling Rules:**
- Create at least 3-5 tasks per goal.
- For each task, you MUST set a 'dueDate'. Use date placeholders.
- **Crucially, distribute tasks logically over time.** Create a progressive schedule.
  - Example:
    1. Initial tasks first: 'Outreach call' (dueDate: '{{today+1d}}'), 'Order home BP monitor' (dueDate: '{{today+3d}}').
    2. Educational tasks next: 'Provide education on DASH diet' (dueDate: '{{today+7d}}').
    3. Monitoring tasks later: 'Weekly check-in call' (dueDate: '{{today+14d}}', and should have a schedule property).
    4. Follow-up tasks last: 'Schedule follow-up appointment' (dueDate: '{{today+1m}}').
- Do not schedule all tasks for the same day. Space them out to avoid overwhelming the patient.
- Ensure all required fields for Goal, Task, etc., are present and have valid values.
- Make IDs unique (e.g., 'goal-1', 'task-1', 'task-2').
- Use the provided type definitions as a strict guide for the structure.
`;

export const generateCarePlanWithAI = async (patientInfo: any): Promise<CarePlan> => {
  console.log("Generating new plan with AI for:", patientInfo);
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: JSON.stringify(patientInfo),
        config: {
            systemInstruction: generationSystemPrompt,
            responseMimeType: 'application/json',
        }
    });

    let planJson = response.text.trim();
    
    // The model might still wrap it in ```json ... ```
    if (planJson.startsWith('```json')) {
        planJson = planJson.substring(7, planJson.length - 3).trim();
    }
    
    const newPlan: CarePlan = JSON.parse(planJson);

    // Post-process dates to handle placeholders
    if (newPlan.timeframe) {
      newPlan.timeframe.startDate = parseDatePlaceholder(newPlan.timeframe.startDate);
    }
    if (newPlan.goals) {
      newPlan.goals.forEach(goal => {
          goal.startDate = parseDatePlaceholder(goal.startDate);
          goal.targetDate = parseDatePlaceholder(goal.targetDate);
          if (goal.tasks) {
            goal.tasks.forEach(task => {
                task.dueDate = parseDatePlaceholder(task.dueDate);
                if (task.schedule) {
                    task.schedule.startDate = parseDatePlaceholder(task.schedule.startDate);
                }
            });
          }
      });
    }

    return newPlan;

  } catch (error) {
    console.error("Error generating care plan with AI:", error);
    // Fallback to mock data on error
    alert("There was an error generating the plan with AI. Loading a default plan as a fallback.");
    const newPlan = { ...initialCarePlan };
    newPlan.diagnoses.primary = patientInfo.primaryDiagnoses || [];
    return newPlan;
  }
}

export const getAiTaskProposals = (goal: Goal): Promise<Partial<Task>[]> => {
  const allProposals: { [key: string]: Partial<Task>[] } = {
    hypertension: [
      { kind: 'Communication', title: 'Conduct motivational interview on lifestyle changes', owner: 'Care Manager', priority: 'Medium' },
      { kind: 'Medication Request', title: 'Review and reconcile BP medication list', owner: 'PCP', priority: 'High' },
      { kind: 'Device Request', title: 'Order and set up home BP monitor', owner: 'Care Manager', priority: 'High' },
      { kind: 'Task', title: 'Provide patient education on DASH diet', owner: 'Care Manager', priority: 'Medium' },
      { kind: 'Service Request', title: 'Schedule follow-up appointment with PCP in 1 month', owner: 'Care Manager', priority: 'Medium' },
      { kind: 'Questionnaire', title: 'Administer medication adherence questionnaire (e.g., MMAS-8)', owner: 'Care Manager', priority: 'Low' },
      { kind: 'Communication', title: 'Weekly check-in call to review home BP readings', owner: 'Care Manager', priority: 'Medium' },
      { kind: 'Service Request', title: 'Refer to nutritionist for dietary counseling', owner: 'Care Manager', priority: 'Medium' },
      { kind: 'Task', title: 'Assess for social determinants of health barriers (e.g., transport, food access)', owner: 'Care Manager', priority: 'Low' },
      { kind: 'Task', title: 'Provide education on recognizing symptoms of hypo/hypertension', owner: 'Care Manager', priority: 'Medium' },
    ],
    diabetes: [
      { kind: 'Service Request', title: 'Schedule routine HbA1c lab test', owner: 'Care Manager', priority: 'High' },
      { kind: 'Service Request', title: 'Refer to Diabetes Self-Management Education (DSME)', owner: 'Care Manager', priority: 'High' },
      { kind: 'Medication Request', title: 'Review and reconcile diabetes medications', owner: 'PCP', priority: 'High' },
      { kind: 'Task', title: 'Provide education on reading food labels for carbohydrates', owner: 'Care Manager', priority: 'Medium' },
      { kind: 'Service Request', title: 'Schedule annual diabetic foot exam', owner: 'Care Manager', priority: 'Medium' },
      { kind: 'Service Request', title: 'Schedule annual diabetic eye exam (retinopathy)', owner: 'Care Manager', priority: 'Medium' },
      { kind: 'Communication', title: 'Follow-up call to review blood sugar logs', owner: 'Care Manager', priority: 'Medium' },
      { kind: 'Device Request', title: 'Evaluate for continuous glucose monitor (CGM)', owner: 'PCP', priority: 'Low' },
      { kind: 'Questionnaire', title: 'Administer hypoglycemia awareness questionnaire', owner: 'Care Manager', priority: 'Low' },
      { kind: 'Nutrition Order', title: 'Develop a sample meal plan with patient', owner: 'Care Manager', priority: 'Medium' },
    ],
    general: [
        { kind: 'Communication', title: 'Schedule motivational interviewing session', owner: 'Care Manager', priority: 'Medium' },
        { kind: 'Medication Request', title: 'Review and reconcile medication list', owner: 'PCP', priority: 'High' },
        { kind: 'Task', title: 'Assess for barriers to care (transportation, financial)', owner: 'Care Manager', priority: 'Low' },
        { kind: 'Communication', title: 'Establish patient communication preferences (phone, app, text)', owner: 'Care Manager', priority: 'Medium' },
        { kind: 'Service Request', title: 'Schedule follow-up appointment with PCP', owner: 'Care Manager', priority: 'Medium' },
    ]
  };

  const goalTitle = goal.title.toLowerCase();
  let selectedProposals: Partial<Task>[] = [];

  if (goalTitle.includes('pressure') || goalTitle.includes('hypertension')) {
    selectedProposals = allProposals.hypertension;
  } else if (goalTitle.includes('diabetes') || goalTitle.includes('glycemic')) {
    selectedProposals = allProposals.diabetes;
  } else {
    selectedProposals = allProposals.general;
  }

  // To make it seem dynamic, shuffle and take up to 10
  const shuffled = selectedProposals.sort(() => 0.5 - Math.random());
  const finalProposals = shuffled.slice(0, 10);
  
  // Set default acceptance criteria based on kind
  const proposalsWithDefaults = finalProposals.map(p => {
    const kind = p.kind || 'Other';
    const details = kindDetails[kind];
    return {
        ...p,
        acceptanceCriteria: p.acceptanceCriteria || details.acceptance,
    };
  });

  return new Promise(resolve => setTimeout(() => resolve(proposalsWithDefaults), 1200));
};

const goalTemplatesByCondition: { [key: string]: { condition: string; goals: Partial<Goal>[] } } = {
    'I10': {
        condition: 'I10 - Essential (Primary) Hypertension',
        goals: [
            {
                title: 'Improve Blood Pressure Control',
                description: 'Achieve systolic BP <130 mmHg and diastolic BP <80 mmHg through lifestyle modification and medication adherence.',
                priority: 'High',
                metrics: [
                    { name: 'Systolic BP', target: { operator: '<', value_min: null, value_max: 130 }, unit: 'mmHg', source: 'AI', referenceRange: 'Normal: < 130 mmHg' },
                    { name: 'Diastolic BP', target: { operator: '<', value_min: null, value_max: 80 }, unit: 'mmHg', source: 'AI', referenceRange: 'Normal: < 80 mmHg' },
                ],
                qualityMeasures: ['CMS165'],
            },
            {
                title: 'Enhance Medication Adherence',
                description: 'Ensure consistent adherence to antihypertensive medications to reduce variability in BP readings.',
                priority: 'Medium',
                metrics: [
                    { name: 'Med Adherence', target: { operator: '>=', value_min: 90, value_max: null }, unit: '%', source: 'AI', referenceRange: 'Target: > 95%' },
                ],
                qualityMeasures: ['CMS68'],
            },
            {
                title: 'Promote Lifestyle Modification',
                description: 'Encourage patient engagement in diet and physical activity interventions to reduce cardiovascular risk.',
                priority: 'Medium',
                metrics: [
                    { name: 'DASH Diet Compliance', target: { operator: '>=', value_min: 75, value_max: null }, unit: '%', source: 'AI', referenceRange: 'Self-reported' },
                    { name: 'Weekly Exercise', target: { operator: '>=', value_min: 150, value_max: null }, unit: 'minutes', source: 'AI', referenceRange: '>= 150 minutes/week' },
                ],
                qualityMeasures: ['CMS347'],
            },
        ]
    },
    'E11.9': {
        condition: 'E11.9 - Type 2 Diabetes Mellitus',
        goals: [
            {
                title: 'Optimize Glycemic Control',
                description: 'Maintain HbA1c <7.0% through medication management and glucose monitoring.',
                priority: 'High',
                metrics: [
                    { name: 'HbA1c', target: { operator: '<', value_min: null, value_max: 7.0 }, unit: '%', source: 'AI', referenceRange: 'Normal: < 7.0%' },
                ],
                qualityMeasures: ['CMS122'],
            },
            {
                title: 'Enhance Self-Monitoring and Education',
                description: 'Improve patient understanding and adherence to blood glucose self-monitoring regimen.',
                priority: 'Medium',
                metrics: [
                    { name: 'SMBG Adherence', target: { operator: '>=', value_min: 80, value_max: null }, unit: '%', source: 'AI', referenceRange: 'Self-reported adherence' },
                ],
                qualityMeasures: ['CMS134'],
            },
            {
                title: 'Prevent Diabetes Complications',
                description: 'Conduct preventive screenings for nephropathy, neuropathy, and retinopathy.',
                priority: 'Medium',
                metrics: [
                    { name: 'Annual Microalbumin Test', target: { operator: '=', value_min: 1, value_max: 1 }, unit: 'Completed', source: 'AI', referenceRange: '0 (No) or 1 (Yes)' },
                    { name: 'Annual Foot Exam', target: { operator: '=', value_min: 1, value_max: 1 }, unit: 'Completed', source: 'AI', referenceRange: '0 (No) or 1 (Yes)' },
                    { name: 'Annual Eye Exam', target: { operator: '=', value_min: 1, value_max: 1 }, unit: 'Completed', source: 'AI', referenceRange: '0 (No) or 1 (Yes)' },
                ],
                qualityMeasures: ['CMS122', 'CMS134'],
            },
        ]
    },
    'E78.5': {
        condition: 'E78.5 - Hyperlipidemia',
        goals: [
            {
                title: 'Achieve LDL Cholesterol Target',
                description: 'Maintain LDL cholesterol <100 mg/dL through statin therapy and dietary intervention.',
                priority: 'High',
                metrics: [
                    { name: 'LDL Cholesterol', target: { operator: '<', value_min: null, value_max: 100 }, unit: 'mg/dL', source: 'AI', referenceRange: 'Normal: < 100 mg/dL' },
                ],
                qualityMeasures: ['CMS347'],
            },
            {
                title: 'Increase Adherence to Statin Therapy',
                description: 'Ensure patient adheres to prescribed lipid-lowering medications ≥90% of the time.',
                priority: 'Medium',
                metrics: [
                    { name: 'Statin Adherence (MPR)', target: { operator: '>=', value_min: 90, value_max: null }, unit: '%', source: 'AI', referenceRange: 'Medication Possession Ratio' },
                ],
                qualityMeasures: ['CMS347'],
            },
            {
                title: 'Promote Cardiovascular Risk Reduction',
                description: 'Educate patient on diet, smoking cessation, and exercise to reduce ASCVD risk.',
                priority: 'Medium',
                metrics: [
                    { name: 'ASCVD Risk Score', target: { operator: '<', value_min: null, value_max: 7.5 }, unit: '%', source: 'AI', referenceRange: '10-year risk' },
                ],
                qualityMeasures: ['CMS347'],
            },
        ]
    }
};

export const getAiGoalProposals = (diagnoses: string[]): Promise<{ condition: string; goals: Partial<Goal>[] }[]> => {
    const proposals: { condition: string; goals: Partial<Goal>[] }[] = [];
    const processedConditions = new Set<string>();

    diagnoses.forEach(dx => {
        const code = dx.split(' ')[0];
        if (goalTemplatesByCondition[code] && !processedConditions.has(code)) {
            const template = JSON.parse(JSON.stringify(goalTemplatesByCondition[code]));
            
            const goalsWithDx = template.goals.map((g: Partial<Goal>) => ({ ...g, diagnoses: [dx] }));
            proposals.push({ ...template, goals: goalsWithDx });
            processedConditions.add(code);
        }
    });

    if (proposals.length === 0 && diagnoses.length > 0) {
        proposals.push({
            condition: diagnoses[0],
            goals: [{
                title: 'General Wellness Improvement',
                description: `A general goal to improve overall health related to ${diagnoses[0]}.`,
                priority: 'Low',
                diagnoses: [diagnoses[0]],
                metrics: [],
                qualityMeasures: [],
            }]
        });
    }

    return new Promise(resolve => setTimeout(() => resolve(proposals), 1200));
};

export const getAiTargetSuggestions = (goal: Goal): Promise<Partial<GoalMetric>[]> => {
    const suggestions: Partial<GoalMetric>[] = [];
    const hasDiabetes = goal.diagnoses.some(d => d.includes('Diabetes'));
    goal.metrics.forEach(metric => {
        if (metric.name.includes('Systolic BP')) {
             suggestions.push({ name: metric.name, target: { operator: '<', value_min: null, value_max: hasDiabetes ? 130 : 140 }, rationale: hasDiabetes ? 'Target <130 mmHg based on comorbid diabetes (ADA guidelines).' : 'Standard target for hypertension (ACC/AHA guideline).' });
        }
    });
    return new Promise(resolve => setTimeout(() => resolve(suggestions), 1000));
};

export const getAiMetricSuggestions = (diagnoses: string[]): Promise<Partial<GoalMetric>[]> => {
    const suggestions: Partial<Pick<GoalMetric, 'name' | 'target'>>[] = [];
     if (diagnoses.some(d => d.includes('Hypertension'))) {
        suggestions.push( { name: 'Systolic BP', target: { operator: '<', value_min: null, value_max: 130 } }, { name: 'Diastolic BP', target: { operator: '<', value_min: null, value_max: 80 } } );
    }
    return new Promise(resolve => {
        setTimeout(() => {
            const enrichedSuggestions = suggestions.map(s => {
                const def = metricDefinitions.find(d => d.name === s.name);
                return { ...s, unit: def?.unit || '', referenceRange: def?.referenceRange || '', source: 'AI' }
            })
            resolve(enrichedSuggestions as GoalMetric[]);
        }, 800);
    });
};

export const getAiInformationSuggestions = (patientContext: { primary: string[]; conditions?: string[] }): Promise<Partial<CarePlan['diagnoses']> & { baselineMetrics?: { name: string; value: string }[] }> => {
    const suggestions: Partial<CarePlan['diagnoses']> & { baselineMetrics?: { name: string; value: string }[] } = { comorbidities: ['Hyperlipidemia'], riskFactors: ['Sedentary lifestyle'], allergies: ['Penicillin'] };
    
    const suggestedDiagnoses = new Set<string>();
    
    if (patientContext.conditions) {
        patientContext.conditions.forEach(condition => {
            const codes = conditionToIcdMap[condition];
            if (codes) {
                codes.forEach(code => suggestedDiagnoses.add(code));
            }
        });
    }

    // Add one more if no conditions match, for demonstration
    if (suggestedDiagnoses.size === 0 && patientContext.conditions && patientContext.conditions.length > 0) {
        suggestedDiagnoses.add('I10 - Essential (Primary) Hypertension');
    }

    if (suggestedDiagnoses.size > 0) {
        suggestions.primary = Array.from(suggestedDiagnoses);
    }
    
    return new Promise(resolve => setTimeout(() => resolve(suggestions), 1200));
};

export const getAiGoalUpdateSuggestion = (goal: Goal): Promise<{ suggestion: Partial<Goal>, rationale: string }> => {
    const hasDiabetes = goal.diagnoses.some(d => d.includes('Diabetes'));
    const suggestion: Partial<Goal> = { title: `Optimize ${goal.title.replace('Improve ', '')}`, targetDate: new Date(new Date(goal.startDate).setMonth(new Date(goal.startDate).getMonth() + 3)).toISOString().split('T')[0], priority: 'High', metrics: goal.metrics.map(m => (m.name.includes('Systolic BP') ? { ...m, target: { operator: '<', value_min: null, value_max: hasDiabetes ? 125 : 130 } as TargetValue } : m)) };
    const rationale = `Aligned with ${goal.qualityMeasures.join(', ')}.`;
    return new Promise(resolve => setTimeout(() => resolve({ suggestion, rationale }), 1500));
};

export const getAiBarrierSuggestions = (carePlan: CarePlan): Promise<Barrier[]> => {
    const suggestions: Barrier[] = [];
    const hasDiabetes = carePlan.diagnoses.primary.some(d => d.includes('Diabetes'));
    if (hasDiabetes) {
        const healthLiteracyBarrier = barrierRepository.find(b => b.category === 'Health Literacy');
        if (healthLiteracyBarrier) {
            suggestions.push({
                id: `barrier-${Date.now()}-1`,
                category: healthLiteracyBarrier.category,
                description: "Patient may struggle with understanding complex glucose readings.",
                mitigations: healthLiteracyBarrier.suggested_mitigations.map(text => ({ text, completed: false })),
                status: 'Active',
                resolved_on: null,
                resolved_by: null,
                last_updated: new Date().toISOString().split('T')[0],
                source: 'AI',
                rationale: "AI detected a Diabetes diagnosis."
            });
        }
    }
    return new Promise(resolve => setTimeout(() => resolve(suggestions), 1500));
};

export const getAiBarrierUpdateSuggestions = (carePlan: CarePlan): Promise<{
    newBarriers: Barrier[],
    updatedBarriers: { id: string, updates: Partial<Barrier> }[],
    resolveSuggestions: { id: string, rationale: string }[],
}> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const suggestions = {
                newBarriers: [] as Barrier[],
                updatedBarriers: [],
                resolveSuggestions: [] as { id: string, rationale: string }[],
            };

            const existingCategories = new Set(carePlan.barriers.map(b => b.category));
            
            // Suggestion 1: Medication Adherence based on diagnoses
            const hasChronicDisease = carePlan.diagnoses.primary.some(d => d.includes('Diabetes') || d.includes('Hypertension'));
            if (hasChronicDisease && !existingCategories.has('Medication Adherence')) {
                const template = barrierRepository.find(b => b.category === 'Medication Adherence');
                if (template) {
                    suggestions.newBarriers.push({
                        id: `barrier-${Date.now()}-1`,
                        category: template.category,
                        description: template.description,
                        mitigations: template.suggested_mitigations.map(text => ({ text, completed: false })),
                        status: 'Active', resolved_on: null, resolved_by: null,
                        last_updated: new Date().toISOString().split('T')[0],
                        source: 'AI',
                        rationale: 'Patient has chronic conditions (e.g., Diabetes, Hypertension) where medication adherence is critical.'
                    });
                }
            }

            // Suggestion 2: Health Literacy for complex conditions
            if (carePlan.diagnoses.primary.length > 1 && !existingCategories.has('Health Literacy')) {
                 const template = barrierRepository.find(b => b.category === 'Health Literacy');
                 if (template) {
                     suggestions.newBarriers.push({
                         id: `barrier-${Date.now()}-2`,
                         category: template.category,
                         description: 'Patient is managing multiple conditions, which can increase the complexity of their care plan and require strong health literacy.',
                         mitigations: template.suggested_mitigations.map(text => ({ text, completed: false })),
                         status: 'Active', resolved_on: null, resolved_by: null,
                         last_updated: new Date().toISOString().split('T')[0],
                         source: 'AI',
                         rationale: 'Managing multiple chronic conditions often presents health literacy challenges.'
                     });
                 }
            }
            
            // Suggestion 3: Access to Care based on patient preferences
            const prefersTelehealth = carePlan.clinicalContext.patientPreferences.toLowerCase().includes('telehealth');
            if (!prefersTelehealth && !existingCategories.has('Access to Care')) {
                 const template = barrierRepository.find(b => b.category === 'Access to Care');
                 if (template) {
                     suggestions.newBarriers.push({
                         id: `barrier-${Date.now()}-3`,
                         category: template.category,
                         description: 'Patient may face transportation challenges for in-person appointments, impacting continuity of care.',
                         mitigations: template.suggested_mitigations.map(text => ({ text, completed: false })),
                         status: 'Active', resolved_on: null, resolved_by: null,
                         last_updated: new Date().toISOString().split('T')[0],
                         source: 'AI',
                         rationale: 'No preference for telehealth was noted, suggesting potential reliance on in-person visits which can be a barrier.'
                     });
                 }
            }
            
            // Suggestion 4: Check for resolve suggestions
            const adherenceBarrier = carePlan.barriers.find(b => b.id === 'barrier-1' && b.status === 'Active');
            if (adherenceBarrier) {
                suggestions.resolveSuggestions.push({
                    id: 'barrier-1',
                    rationale: 'Patient has been consistently taking medications as shown by adherence metrics. This barrier can likely be resolved.'
                });
            }

            resolve(suggestions);
        }, 1800);
    });
};

export const getAiBarrierAutofill = (category: string, description: string): Promise<{ description: string, mitigations: string[] }> => {
    const repoItem = barrierRepository.find(b => b.category === category);
    let newDescription = repoItem?.description || description;
    let newMitigations = repoItem?.suggested_mitigations || [];
    
    if (description.toLowerCase().includes('cost')) {
        newDescription = 'Patient is concerned about the high cost of prescribed medications and treatment.';
        newMitigations = [
            'Refer to social worker for financial assistance programs.',
            'Explore Patient Assistance Programs (PAPs).',
            'Switch to generic or lower-cost alternatives where appropriate.',
        ];
    }
    
    return new Promise(resolve => setTimeout(() => resolve({
        description: newDescription,
        mitigations: newMitigations
    }), 1000));
};

const instructionGenerationSystemPrompt = `Generate clear and educational Patient Instructions that can be displayed in a patient-facing app as part of the Care Plan.

Each instruction must have exactly three fields:

Title: Short imperative phrase (max 10 words).

Body: Clear, patient-friendly text (1–3 sentences) describing what to do and why.

Category: One of the following values: Medication, Monitoring, Lifestyle, Appointment, Education.

Rules:

Do not include any other fields, metadata, or numbering.

Use plain English (or Spanish if requested).

Write in an encouraging, professional tone suitable for patient engagement.

Avoid technical terms unless common in patient education (e.g., “blood pressure”).

Focus on daily actionable guidance, not clinician tasks or documentation.

Each instruction must be self-contained and not depend on other ones.

Context input (provided by system):

Active medical conditions: {{Condition list}}

Active medications: {{Medication list}}

Active goals: {{Goal list}}

Care setting: Outpatient chronic care management

Target audience: Adult patient with chronic diseases

Output format:
JSON array of objects, each with:

{
  "title": "Check blood pressure every morning",
  "body": "Measure your blood pressure before taking your medication. Record it in your logbook or app.",
  "category": "Monitoring"
}


Example categories by condition:

Hypertension: blood pressure monitoring, sodium reduction, medication adherence

Diabetes: glucose monitoring, diet, foot care, appointment adherence

Heart failure: weight monitoring, fluid restriction, medication reminders

COPD/Asthma: inhaler use, trigger avoidance, breathing exercises

CKD: diet, fluid intake, lab monitoring

Post-hospital (TCM): appointment follow-up, medication reconciliation, symptom watch

Generate 3–5 appropriate instructions for the given context.

💡 Ejemplo de uso con contexto

Prompt example:

Generate Patient Instructions for a patient with:

Conditions: Hypertension, Type 2 Diabetes

Medications: Lisinopril 10mg daily, Metformin 500mg twice daily

Goals: Improve blood pressure control, Maintain fasting glucose <130 mg/dL

Expected Output:

[
  {
    "title": "Check blood pressure every morning",
    "body": "Measure your blood pressure before taking your medication and record the result in your app.",
    "category": "Monitoring"
  },
  {
    "title": "Take Lisinopril 10mg once daily",
    "body": "Take one tablet every morning with or without food. Do not skip doses.",
    "category": "Medication"
  },
  {
    "title": "Check fasting glucose daily",
    "body": "Test your blood sugar before breakfast each day and record it in your logbook.",
    "category": "Monitoring"
  },
  {
    "title": "Follow a low-sodium, balanced diet",
    "body": "Limit added salt and include vegetables, lean proteins, and whole grains in your meals.",
    "category": "Lifestyle"
  },
  {
    "title": "Keep your next appointment",
    "body": "Bring your logbook and medication list to review progress with your care team.",
    "category": "Appointment"
  }
]`;

export const getAiInstructionProposals = async (carePlan: CarePlan): Promise<Partial<Instruction>[]> => {
    const conditions = carePlan.diagnoses.primary.join(', ');
    const medications = carePlan.instructions
        .filter(i => i.category === 'Medication')
        .map(i => i.title)
        .join(', ');
    const goals = carePlan.goals.map(g => g.title).join(', ');

    const userPrompt = `Generate Patient Instructions for a patient with:
Conditions: ${conditions || 'Not specified'}
Medications: ${medications || 'Not specified'}
Goals: ${goals || 'Not specified'}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction: instructionGenerationSystemPrompt,
                responseMimeType: 'application/json',
            }
        });

        let jsonResponse = response.text.trim();
        if (jsonResponse.startsWith('```json')) {
            jsonResponse = jsonResponse.substring(7, jsonResponse.length - 3).trim();
        }

        const proposals: { title: string; body: string; category: InstructionCategory }[] = JSON.parse(jsonResponse);
        
        return proposals.map(p => ({
            title: p.title,
            details: p.body,
            category: p.category,
            rationale: `AI generated based on patient's conditions and goals.`
        }));

    } catch (error) {
        console.error("Error generating AI instruction proposals:", error);
        // Fallback to a simple message or empty array
        return [{
            title: "Error generating suggestions",
            details: "Could not connect to the AI service. Please try again later.",
            category: 'Education',
            rationale: 'An error occurred during AI generation.'
        }];
    }
};


export const generateAiEducation = (
    prompt: string, 
    context: { diagnoses: string[], goals: string[] },
    readingLevel: 'Simple' | 'Standard'
): Promise<Partial<EducationMaterial>> => {
    let title = "AI Generated Content";
    let summary = "This is a summary of the generated content.";
    let content = "This is the full educational content generated by AI based on your prompt and the patient's context. It would be tailored to their needs.";
    let category: EducationCategory = 'General';

    if (prompt.toLowerCase().includes('insulin')) {
        title = "Starting Insulin Therapy";
        summary = "A guide for patients beginning insulin treatment for diabetes.";
        content = "Starting insulin can be a big step, but it's a very effective way to manage your blood sugar. Here’s what you need to know:\n\n1. **Types of Insulin:** There are different types, like long-acting and short-acting. Your doctor will choose the right one for you.\n2. **How to Inject:** We will show you how to give yourself an injection. It's usually done in the belly, thigh, or arm. It's important to change spots to avoid skin problems.\n3. **Monitoring:** You'll need to check your blood sugar more often to see how the insulin is working.\n\nDon't worry, our team is here to support you every step of the way.";
        category = 'Diabetes Management';
    } else if (context.diagnoses.some(d => d.includes('Hypertension'))) {
        title = "Managing Your High Blood Pressure";
        summary = "Key tips for keeping your blood pressure under control.";
        content = `Based on your goal to improve blood pressure, here are some key areas to focus on:\n\n*   **Diet:** A low-sodium diet, like the DASH diet, is very important.\n*   **Medication:** Take your medication as prescribed, even when you feel fine.\n*   **Monitoring:** Regularly check your blood pressure at home.`;
        category = 'Cardiovascular Health';
    }
    
    if (readingLevel === 'Simple') {
        content = content.replace("long-acting and short-acting", "slow and fast");
        content = content.replace("avoid skin problems", "keep your skin healthy");
    }

    return new Promise(resolve => setTimeout(() => resolve({
        title,
        summary,
        content,
        category,
        source: 'AI',
        formats: ['Text'],
        languages: ['English'],
    }), 1500));
};

export const simplifyAiEducation = (content: string): Promise<string> => {
    const simplified = content.split('.').map(sentence => {
        if (sentence.length > 15) {
            return sentence.replace('hypertension', 'high blood pressure').replace('medication', 'medicine');
        }
        return sentence;
    }).join('. ');
    return new Promise(resolve => setTimeout(() => resolve(`(Simplified) ${simplified}`), 800));
};

export const translateAiEducation = (content: string, language: 'Spanish'): Promise<string> => {
     return new Promise(resolve => setTimeout(() => resolve(`(Translated to ${language}) ${content}`), 1200));
};

export const updateAiEducation = (content: string): Promise<string> => {
    const updatedContent = `(Updated with latest recommendations) ${content} It is also now recommended to consider the impact of sleep quality on blood pressure management.`;
    return new Promise(resolve => setTimeout(() => resolve(updatedContent), 1200));
};

export const getAiEducationScheduleSuggestion = (carePlan: CarePlan, material: EducationMaterial): Promise<{ schedule: EducationSchedule, channels: ('App' | 'Email' | 'SMS')[], rationale: string }> => {
    // Mock logic
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const suggestion: { schedule: EducationSchedule, channels: ('App' | 'Email' | 'SMS')[], rationale: string } = {
        schedule: {
            type: 'fixed',
            fixedAt: tomorrow.toISOString(),
            relative: null,
            recurring: {
                enabled: true,
                freq: 'WEEKLY',
                count: 4,
            }
        },
        channels: ['App', 'SMS'],
        rationale: "Patient prefers app/SMS (from preferences) and weekly reinforcement is effective for chronic conditions like hypertension.",
    };

    if (material.category === 'Diabetes Management') {
        suggestion.schedule.type = 'relative';
        suggestion.schedule.fixedAt = null;
        suggestion.schedule.relative = {
            event: 'lab_result',
            eventFilter: { labType: 'A1c' },
            offset: { days: 2 }
        };
        suggestion.rationale = "Deliver education 2 days after A1c results are posted to provide timely, relevant information."
    }

    return new Promise(resolve => setTimeout(() => resolve(suggestion), 1200));
};

export const getAiOptimizationSuggestions = (carePlan: CarePlan): Promise<{ suggestions: AiOptimizationSuggestion[], modifiedPlan: CarePlan }> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const suggestions: AiOptimizationSuggestion[] = [];
            const modifiedPlan = JSON.parse(JSON.stringify(carePlan));

            // Suggestion 1: Align BP targets with Quality Measure
            const bpGoal = modifiedPlan.goals.find((g: Goal) => g.title.toLowerCase().includes('blood pressure'));
            if (bpGoal && bpGoal.qualityMeasures.includes('CMS165')) {
                const systolicMetric = bpGoal.metrics.find((m: GoalMetric) => m.name === 'Systolic BP');
                if (systolicMetric && systolicMetric.target.value_max !== 130) {
                    suggestions.push({
                        category: 'Quality Measure Alignment',
                        text: 'Align Systolic BP target for goal "Improve Blood Pressure Control" to < 130 mmHg.',
                        rationale: 'The linked quality measure CMS165 recommends a target of < 130/80 mmHg for this patient profile.'
                    });
                    systolicMetric.target.value_max = 130;
                    systolicMetric.target.operator = '<';
                }
            }

            // Suggestion 2: Barrier Alert
            const adherenceBarrier = modifiedPlan.barriers.find((b: Barrier) => b.category === 'Medication Adherence');
            const bpMedInstruction = modifiedPlan.instructions.find((i: Instruction) => i.category === 'Medication');
            if (adherenceBarrier && bpMedInstruction && bpGoal) {
                suggestions.push({
                    category: 'Barrier Alerts',
                    text: 'Add a follow-up education task about medication side effects to mitigate the "Medication Adherence" barrier.',
                    rationale: 'Patient has an active adherence barrier. Proactively addressing potential side effects through education can improve adherence.'
                });
                const adherenceTask: Task = {
                    id: `task-${Date.now()}`,
                    kind: 'Communication',
                    title: 'Educate patient on Lisinopril side effects',
                    owner: 'Care Manager',
                    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    priority: 'Medium',
                    status: 'Pending',
                    acceptanceCriteria: 'Patient verbalizes understanding of common side effects and when to report them.',
                    autoComplete: false,
                    extra: {},
                    fhirEvidence: { resource: 'Communication', status: 'completed' },
                    source: 'AI'
                };
                bpGoal.tasks.push(adherenceTask);
            }
            
            // Suggestion 3: Task Optimization
            const outreachTask = bpGoal?.tasks.find((t: Task) => t.title.toLowerCase().includes('outreach call'));
            const deviceTask = bpGoal?.tasks.find((t: Task) => t.title.toLowerCase().includes('order home bp monitor'));
            if (outreachTask && deviceTask) {
                suggestions.push({
                    category: 'Task Optimization',
                    text: 'Combine the "Outreach call" and "Order home BP monitor" tasks into a single "Initial RPM Setup" task.',
                    rationale: 'Consolidating initial setup tasks streamlines the onboarding workflow for the care manager.'
                });
            }


            if (suggestions.length === 0) {
                 suggestions.push({
                    category: 'General',
                    text: 'The care plan is well-structured and aligns with current best practices.',
                    rationale: 'No major conflicts or opportunities for optimization were detected by the AI.'
                });
            }

            resolve({ suggestions, modifiedPlan });
        }, 1800);
    });
};
