
import { GoogleGenAI } from "@google/genai";
import type { CarePlan, Goal, GoalMetric, Task, TaskKind, TaskOwner, TaskPriority, TaskStatus, TargetValue, Barrier, AiOrchestratorResponse, AiClarificationOption, Mitigation, Instruction, EducationMaterial, EducationCategory, EducationSchedule, AiOptimizationSuggestion, TaskTriggerEvent, TriggerTemplate } from '../types';
import { initialCarePlan } from '../data/mockData';
import { metricDefinitions } from '../data/metricDefinitions';
import { barrierRepository } from '../data/barrierRepository';
import { conditionToIcdMap } from '../data/predefinedData';
import { kindDetails } from '../data/taskDetails';
import { triggerTemplates } from '../data/triggerTemplates';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

const getFutureDate = (durationStr: string): string => {
    const now = new Date();
    const match = durationStr.match(/(\d+)\s(week|day|month)s?/i);
    if (match) {
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        if (unit === 'week') now.setDate(now.getDate() + value * 7);
        else if (unit === 'day') now.setDate(now.getDate() + value);
        else if (unit === 'month') now.setMonth(now.getMonth() + value);
    }
    return now.toISOString().split('T')[0];
};

// --- Mock Gemini Orchestrator with Conversation Flow ---
const mockGeminiOrchestrator = (
    request: { command?: string; interaction?: any; context?: any },
    currentPlan: CarePlan
): AiOrchestratorResponse => {
    let context = request.context || {};
    const command = request.command;
    const interaction = request.interaction;

    // If there's an interaction, we're continuing a conversation
    if (interaction) {
        if (interaction.action === 'cancel') {
            return { type: 'cancel', message: "Action cancelled. No changes applied." };
        }
        if (interaction.action === 'confirm_action') {
            // Apply the changes stored in the context
            const updatedPlan = JSON.parse(JSON.stringify(currentPlan));
            const highlights = new Set<string>();
            let summary = "Changes applied successfully.";

            if (context.intent === 'addGoal') {
                updatedPlan.goals.push(context.proposedGoal);
                highlights.add(context.proposedGoal.id);
                summary = `✅ Added new goal: "${context.proposedGoal.title}"`;
            } else if (context.intent === 'addTask') {
                const goalIndex = updatedPlan.goals.findIndex((g: Goal) => g.id === context.goalId);
                if (goalIndex > -1) {
                    updatedPlan.goals[goalIndex].tasks.push(context.proposedTask);
                    highlights.add(context.proposedTask.id);
                    summary = `✅ Added new task: "${context.proposedTask.title}"`;
                }
            }
            // Add other intents (update, delete) here...

            return { type: 'success', updatedPlan, summary, highlights };
        }
        // Handle clarification responses
        context[interaction.action] = interaction.value;
    }

    // If there's a command, we're starting a new conversation
    if (command) {
        context = { originalCommand: command };
        // --- ADD GOAL INTENT ---
        const addGoalMatch = command.match(/add a goal for (.*)/i);
        if (addGoalMatch) {
            context.intent = 'addGoal';
            const goalSubject = addGoalMatch[1].trim();
            const newId = `goal-${Date.now()}`;
            const newGoal: Goal = {
                id: newId,
                title: `Manage ${goalSubject.charAt(0).toUpperCase() + goalSubject.slice(1)}`,
                description: `A new goal to address ${goalSubject}.`,
                status: 'Active', priority: 'Medium', qualityMeasures: [],
                startDate: new Date().toISOString().split('T')[0],
                targetDate: getFutureDate('3 months'),
                diagnoses: [], metrics: [], tasks: [],
                measurementTargets: [], eventsAndTasks: [], dataTable: []
            };
            if (goalSubject.toLowerCase().includes('hypertension')) {
                 newGoal.metrics.push({ name: 'Systolic BP', target: { operator: '<', value_min: null, value_max: 130 }, unit: 'mmHg', referenceRange: 'Normal: < 130 mmHg', source: 'AI' });
                 newGoal.qualityMeasures.push('CMS165');
            }
            context.proposedGoal = newGoal;
            return {
                type: 'confirmation',
                summary: `I will create a new goal: "${newGoal.title}" and link it to ${newGoal.qualityMeasures[0] || 'relevant quality measures'}. Is that correct?`,
                conversationContext: context,
            };
        }
        // --- ADD TASK INTENT ---
        const addTaskMatch = command.match(/add a task for (.*)/i);
        if (addTaskMatch) {
            context.intent = 'addTask';
            context.taskTitle = addTaskMatch[1].trim();

            if (currentPlan.goals.length === 0) {
                return { type: 'error', message: 'There are no goals to add a task to. Please add a goal first.' };
            }
            if (currentPlan.goals.length === 1) {
                 context.goalId = currentPlan.goals[0].id; // Assume the only goal
            } else {
                 // AMBIGUITY: Ask which goal
                 return {
                     type: 'clarification',
                     message: 'Which goal should this task belong to?',
                     options: currentPlan.goals.map(g => ({ text: g.title, action: 'select_goal', value: g.id })),
                     conversationContext: context
                 };
            }
        }
    }

    // --- CONTINUE CONVERSATION AFTER CLARIFICATION ---
    if (context.intent === 'addTask' && context.select_goal) {
        context.goalId = context.select_goal;
        const newTaskId = `task-${Date.now()}`;
        const newTask: Task = {
            id: newTaskId,
            kind: 'Communication', title: context.taskTitle,
            owner: 'Care Manager', dueDate: getFutureDate('7 days'),
            priority: 'Medium', status: 'Pending',
            acceptanceCriteria: 'Task completed.', autoComplete: false,
            extra: {}, fhirEvidence: { resource: 'Task', status: 'requested' }, source: 'AI',
        };
        context.proposedTask = newTask;
        const goalTitle = currentPlan.goals.find(g => g.id === context.goalId)?.title;
        return {
            type: 'confirmation',
            summary: `I will add the task "${newTask.title}" to the goal "${goalTitle}". Does this look correct?`,
            conversationContext: context,
        };
    }
    
    return { type: 'error', message: "I couldn't understand that command. Please try a different phrasing, like 'add a goal for hypertension'." };
}


export const updateCarePlanWithAI = (
    request: { command?: string; interaction?: any; context?: any; currentPlan: CarePlan }
): Promise<AiOrchestratorResponse> => {
  console.log("Sending to AI orchestrator:", request);
  return new Promise((resolve) => {
    setTimeout(() => {
      const result = mockGeminiOrchestrator(request, request.currentPlan);
      console.log("Received from AI:", result);
      resolve(result);
    }, 1000);
  });
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


// --- Other AI services remain unchanged ---

export const generateCarePlanWithAI = async (patientInfo: any): Promise<CarePlan> => {
  console.log("Generating new plan with AI for:", patientInfo);
  return new Promise((resolve) => {
    setTimeout(() => {
      const newPlan = { ...initialCarePlan };
      newPlan.diagnoses.primary = patientInfo.primaryDiagnoses || [];
      resolve(newPlan);
    }, 2000);
  });
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
                    // FIX: Added missing referenceRange property.
                    { name: 'Systolic BP', target: { operator: '<', value_min: null, value_max: 130 }, unit: 'mmHg', source: 'AI', referenceRange: 'Normal: < 130 mmHg' },
                    // FIX: Added missing referenceRange property.
                    { name: 'Diastolic BP', target: { operator: '<', value_min: null, value_max: 80 }, unit: 'mmHg', source: 'AI', referenceRange: 'Normal: < 80 mmHg' },
                ],
                qualityMeasures: ['CMS165'],
            },
            {
                title: 'Enhance Medication Adherence',
                description: 'Ensure consistent adherence to antihypertensive medications to reduce variability in BP readings.',
                priority: 'Medium',
                metrics: [
                    // FIX: Added missing referenceRange property.
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
                    // FIX: Added missing referenceRange property.
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
                    // FIX: Added missing referenceRange property.
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

export const getAiInstructionProposals = (carePlan: CarePlan): Promise<Partial<Instruction>[]> => {
  const proposals: Partial<Instruction>[] = [];
  const hasHypertensionGoal = carePlan.goals.some(g => g.title.toLowerCase().includes('blood pressure'));

  if (hasHypertensionGoal) {
    proposals.push({
      title: "Follow a low-sodium diet",
      details: "Limit your sodium intake to less than 2,300 mg per day. Avoid processed foods, canned soups, and salty snacks.",
      category: 'Lifestyle',
      delivery_method: 'Printed',
      rationale: 'Low-sodium diet is a key lifestyle modification for managing hypertension.'
    });
    proposals.push({
      title: "Report side effects of new medication",
      details: "If you experience dizziness, coughing, or swelling, contact the care management team immediately via the patient app or phone.",
      category: 'Symptoms',
      delivery_method: 'App',
      rationale: 'Ensures proactive management of potential adverse drug reactions for hypertension medications.'
    });
  }

  const hasDiabetesGoal = carePlan.goals.some(g => g.title.toLowerCase().includes('diabetes'));
  if(hasDiabetesGoal) {
      proposals.push({
          title: "Check blood sugar twice daily",
          details: "Check your blood sugar before breakfast and before dinner. Log your readings and share them with your care manager weekly.",
          category: 'Monitoring',
          delivery_method: 'App',
          rationale: 'Regular glucose monitoring is crucial for managing Type 2 Diabetes.'
      });
  }
  
  return new Promise(resolve => setTimeout(() => resolve(proposals), 1500));
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
            if (adherenceBarrier && bpMedInstruction) {
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
                    dueDate: getFutureDate('3 days'),
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