
import type { CarePlan, Task, TaskOwner, TaskPriority, TaskStatus, EducationMaterial, ReactiveFlow, CreateTaskActionDetails, SendMessageActionDetails } from '../types';

const generateDatePoints = (startDate: Date, days: number, startValue: number, fluctuation: number) => {
  const data = [];
  for (let i = 0; i < days; i++) {
    const newDate = new Date(startDate);
    newDate.setDate(startDate.getDate() + i);
    const value = startValue + (Math.random() - 0.5) * fluctuation;
    data.push({
      date: newDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: parseFloat(value.toFixed(1)),
    });
  }
  return data;
};

const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const systolicData = generateDatePoints(thirtyDaysAgo, 30, 140, 5);
const diastolicData = generateDatePoints(thirtyDaysAgo, 30, 85, 4);

export const initialCarePlan: CarePlan = {
  careProgram: 'CCM (Chronic Care Management)',
  diagnoses: {
    primary: ['I10 - Essential (Primary) Hypertension', 'E11.9 - Type 2 Diabetes Mellitus'],
    comorbidities: ['Diabetes Mellitus', 'Hypertension'],
    allergies: ['NKDA (No Known Drug Allergies)'],
    riskFactors: ['Smoking'],
  },
  timeframe: {
    startDate: '2025-10-24',
    targetHorizon: '3 months',
    priority: 'Medium',
  },
  clinicalContext: {
    baselineMetrics: [{ id: 'bm-1', name: 'Systolic BP', operator: '=', value: '145', unit: 'mmHg' }],
    patientPreferences: 'Prefers telehealth appointments and home monitoring.',
  },
  goals: [
    {
      id: 'goal1',
      title: 'Improve Blood Pressure Control',
      description: 'Reduce systolic BP to target range through medication optimization and lifestyle modifications',
      status: 'On track',
      priority: 'High',
      qualityMeasures: ['CMS165'],
      startDate: '2025-10-14',
      targetDate: '2026-01-14',
      diagnoses: ['I10 - Essential (Primary) Hypertension', 'E11.9 - Type 2 Diabetes Mellitus'],
      metrics: [
        { name: 'Systolic BP', target: { operator: '<', value_min: null, value_max: 130 }, current: '142', unit: 'mmHg', referenceRange: 'Normal: < 130 mmHg', source: 'Manual' },
        { name: 'Diastolic BP', target: { operator: '<', value_min: null, value_max: 80 }, current: '88', unit: 'mmHg', referenceRange: 'Normal: < 80 mmHg', source: 'Manual' },
        { name: 'Med Adherence', target: { operator: '>', value_min: 95, value_max: null }, current: '87', unit: '%', referenceRange: 'Target: > 95%', source: 'Manual' },
      ],
      tasks: [
        {
          id: 'task1',
          kind: 'Communication',
          title: 'Outreach call to patient',
          owner: 'Care Manager' as TaskOwner,
          dueDate: '2025-10-27',
          status: 'Pending' as TaskStatus,
          priority: 'Medium' as TaskPriority,
          isAuto: true,
          autoComplete: true,
          acceptanceCriteria: 'Contact made and documented',
          extra: { channel: 'Phone', direction: 'Outbound', topic: 'Initial assessment' },
          fhirEvidence: { resource: 'Communication', status: 'completed' },
          source: 'Manual',
          startTriggers: ['care_plan_activated'],
          triggerConfig: {
            offset: { value: 1, unit: 'days' },
            earliestStartWindow: { start: '09:00', end: '17:00' },
            dueDatePolicy: { type: 'fixed_duration', value: '3 days' },
          },
        },
        {
          id: 'task2',
          kind: 'Device Request',
          title: 'Order home BP monitor',
          owner: 'PCP' as TaskOwner,
          dueDate: '2025-10-30',
          status: 'In progress' as TaskStatus,
          priority: 'High' as TaskPriority,
          autoComplete: false,
          linkedQM: ['CMS165'],
          acceptanceCriteria: 'Device delivered, connected, and first observation received',
          extra: { deviceType: 'BP Monitor', supplier: 'Medline', coverageCheck: true },
          fhirEvidence: { resource: 'DeviceRequest', status: 'completed' },
          source: 'Manual',
          startTriggers: [],
        },
        {
            id: 'task3',
            kind: 'Service Request',
            title: 'Measure blood pressure',
            owner: 'Patient' as TaskOwner,
            performer: ['Sarah Johnson — Care Manager', 'Dr. Emily Carter — PCP'],
            dueDate: new Date().toISOString().split('T')[0],
            priority: 'High' as TaskPriority,
            status: 'Pending' as TaskStatus,
            acceptanceCriteria: 'Patient submitted BP reading captured and linked to this request.',
            autoComplete: true,
            extra: {
                category: 'Observation',
                observationCode: {
                    system: 'http://loinc.org',
                    code: '85354-9',
                    display: 'Blood pressure panel'
                }
            },
            fhirEvidence: {
                resource: 'ServiceRequest',
                status: 'completed'
            },
            source: 'Manual',
            startTriggers: [],
            schedule: {
                frequency: 1,
                period: 1,
                unit: 'days',
                startDate: new Date().toISOString(),
            },
            reactiveFlows: [
                {
                    id: 'flow-crit-1',
                    name: 'On Critical Observation',
                    trigger: { id: 'observation_critical' },
                    actions: [
                        {
                            id: 'action-crit-msg-1',
                            actionType: 'SendMessage',
                            target: 'Care Manager',
                            actionDetails: {
                                channel: 'In-app',
                                recipient: 'Care Manager',
                                message: 'Critical BP detected: [Observation_Value] at [DateTime]. Please review and follow up.'
                            } as SendMessageActionDetails
                        },
                        {
                            id: 'action-crit-task1-1',
                            actionType: 'CreateTask',
                            target: 'Care Manager',
                            actionDetails: {
                                kind: 'Task',
                                title: 'Follow-up: Critical BP reading',
                                priority: 'High',
                                subjectRole: 'Care Manager',
                                acceptanceCriteria: 'Patient contacted and next steps documented.',
                                extra: {}
                            } as CreateTaskActionDetails
                        },
                        {
                            id: 'action-crit-task2-1',
                            actionType: 'CreateTask',
                            target: 'PCP',
                            actionDetails: {
                                kind: 'Task',
                                title: 'Physician review: Critical BP reading',
                                priority: 'High',
                                subjectRole: 'PCP',
                                acceptanceCriteria: 'Clinical review completed and guidance provided.',
                                extra: {}
                            } as CreateTaskActionDetails
                        }
                    ]
                } as ReactiveFlow,
                {
                    id: 'flow-caut-1',
                    name: 'On Caution Observation',
                    trigger: { id: 'observation_caution' },
                    actions: [
                        {
                            id: 'action-caut-task1-1',
                            actionType: 'CreateTask',
                            target: 'Care Manager',
                            actionDetails: {
                                kind: 'Task',
                                title: 'Follow-up: Caution BP reading',
                                priority: 'Medium',
                                subjectRole: 'Care Manager',
                                acceptanceCriteria: 'Patient contacted; education or adjustments documented.',
                                extra: {}
                            } as CreateTaskActionDetails
                        }
                    ]
                } as ReactiveFlow,
                {
                    id: 'flow-norm-1',
                    name: 'On Normal Observation',
                    trigger: { id: 'observation_normal' },
                    actions: [
                        {
                            id: 'action-norm-msg-1',
                            actionType: 'SendMessage',
                            target: 'Patient',
                            actionDetails: {
                                channel: 'In-app',
                                recipient: 'Patient',
                                message: 'Your BP reading [Observation_Value] is within range today. Keep it up!'
                            } as SendMessageActionDetails
                        }
                    ]
                } as ReactiveFlow
            ]
        } as Task,
      ],
      measurementTargets: [
        {
          name: 'Systolic BP',
          target: { operator: '<', value_min: null, value_max: 130 },
          latestValue: 148.8,
          delta: 18.8,
          withinTargetPercent: 0,
          data: systolicData,
        },
        {
          name: 'Diastolic BP',
          target: { operator: '<', value_min: null, value_max: 80 },
          latestValue: 75.5,
          delta: -4.5,
          withinTargetPercent: 6,
          data: diastolicData,
        },
      ],
      eventsAndTasks: [
        { id: 'et1', description: 'Medication adherence check completed', date: 'Oct 20, 2025', status: 'Completed', type: 'Medication' },
        { id: 'et2', description: 'Blood pressure reading recorded', date: 'Oct 18, 2025', status: 'Completed', type: 'Blood pressure' },
        { id: 'et3', description: 'Follow-up appointment scheduled', date: 'Oct 25, 2025', status: 'Pending', type: 'Appointment' },
      ],
      dataTable: [
        { id: 'dt1', timestamp: '9/25/2025, 9:35:57 AM', target: 'Systolic BP', value: 142.0, unit: 'mmHg', source: 'RPM' },
        { id: 'dt2', timestamp: '9/26/2025, 9:35:57 AM', target: 'Systolic BP', value: 141.3, unit: 'mmHg', source: 'RPM' },
        { id: 'dt3', timestamp: '9/27/2025, 9:35:57 AM', target: 'Systolic BP', value: 139.7, unit: 'mmHg', source: 'RPM' },
        { id: 'dt4', timestamp: '9/28/2025, 9:35:57 AM', target: 'Systolic BP', value: 138.7, unit: 'mmHg', source: 'Manual' },
        { id: 'dt5', timestamp: '9/29/2025, 9:35:57 AM', target: 'Systolic BP', value: 144.0, unit: 'mmHg', source: 'RPM' },
        { id: 'dt6', timestamp: '9/30/2025, 9:35:57 AM', target: 'Systolic BP', value: 141.4, unit: 'mmHg', source: 'RPM' },
        { id: 'dt7', timestamp: '10/1/2025, 9:35:57 AM', target: 'Systolic BP', value: 142.4, unit: 'mmHg', source: 'RPM' },
      ],
    },
    {
      id: 'goal2',
      title: 'Optimize Diabetes Management',
      description: 'Achieve target HbA1c through medication adherence and dietary modifications',
      status: 'At risk',
      priority: 'Medium',
      qualityMeasures: ['CMS122'],
      startDate: '2025-08-14',
      targetDate: '2025-10-14',
      isOverdue: true,
      diagnoses: ['E11.9 - Type 2 Diabetes Mellitus', 'E78.5 - Hyperlipidemia, Unspecified'],
      metrics: [
        { name: 'HbA1c', target: { operator: '<', value_min: null, value_max: 7.0 }, current: '7.8', unit: '%', referenceRange: 'Normal: < 7.0%', source: 'Manual' },
        { name: 'Fasting Glucose', target: { operator: 'range', value_min: 70, value_max: 100 }, current: '125', unit: 'mg/dL', referenceRange: 'Normal: 70-100 mg/dL', source: 'Manual' },
      ],
      tasks: [],
      measurementTargets: [],
      eventsAndTasks: [],
      dataTable: [],
    },
  ],
  barriers: [
    {
      id: 'barrier-1',
      category: 'Medication Adherence',
      description: 'Patient reports difficulty remembering to take medications on time.',
      mitigations: [
        { text: 'Set up pill organizer', completed: true },
        { text: 'Use a medication reminder app', completed: false },
        { text: 'Simplify regimen with combination pills', completed: false },
      ],
      status: 'Active',
      resolved_on: null,
      resolved_by: null,
      last_updated: '2025-10-22',
      source: 'Manual',
    },
    {
      id: 'barrier-2',
      category: 'Access to Care',
      description: 'Patient has limited transportation to attend in-person appointments.',
      mitigations: [
        { text: 'Schedule telehealth visits', completed: true },
        { text: 'Connect with local transport services', completed: true },
        { text: 'Arrange for home health visits', completed: true },
      ],
      status: 'Resolved',
      resolved_on: '2025-10-20',
      resolved_by: 'Dr. Emily Carter',
      last_updated: '2025-10-20',
      source: 'Manual',
    },
  ],
  instructions: [
    {
      id: 'instr-1',
      title: 'Check blood pressure every morning',
      details: 'Check your blood pressure before taking your morning medication. Record the reading in your logbook or app. Report any readings above 140/90 mmHg.',
      category: 'Monitoring',
      linked_goal_id: 'goal1',
      linked_barrier_id: null,
      delivery_method: 'App',
      language: 'English',
      status: 'Active',
      due_rule: 'Daily at 8:00 AM',
      owner: 'Patient',
      created_at: '2025-10-24',
      updated_at: '2025-10-24',
      created_by: 'Dr. Emily Carter',
      source: 'Template',
    },
    {
      id: 'instr-2',
      title: 'Take Lisinopril 10mg once daily',
      details: 'Take one tablet in the morning with or without food. If you miss a dose, take it as soon as you remember, unless it is close to the time for your next dose.',
      category: 'Medication',
      linked_goal_id: 'goal1',
      linked_barrier_id: 'barrier-1',
      delivery_method: 'Printed',
      language: 'English',
      status: 'Delivered',
      due_rule: 'Daily',
      owner: 'Patient',
      created_at: '2025-10-24',
      updated_at: '2025-10-25',
      created_by: 'Dr. Emily Carter',
      source: 'Manual',
    },
     {
      id: 'instr-3',
      title: 'Follow up with Cardiology',
      details: 'An appointment has been scheduled with Dr. Smith on November 15th at 10:00 AM. Please confirm your attendance.',
      category: 'Appointment',
      linked_goal_id: 'goal1',
      linked_barrier_id: null,
      delivery_method: 'Verbal',
      language: 'English',
      status: 'Paused',
      due_rule: '2025-11-15',
      owner: 'Care Manager',
      created_at: '2025-10-20',
      updated_at: '2025-10-22',
      created_by: 'AI Assistant',
      source: 'AI',
      rationale: 'Patient has a high-risk cardiac profile.'
    }
  ],
  education: [
    {
      id: 'edu-1',
      title: 'Understanding Hypertension',
      summary: 'Learn what high blood pressure is, why it matters, and how to manage it through lifestyle changes and medication.',
      content: 'Full content explaining hypertension...',
      formats: ['Text', 'PDF'],
      languages: ['English', 'Spanish'],
      category: 'Cardiovascular Health',
      condition_codes: ['I10'],
      delivery_method: 'App',
      source: 'Repository',
      status: 'Delivered',
      created_by: 'System',
      created_on: '2025-10-24',
      last_updated: '2025-10-24',
      // New fields
      schedule: null,
      channels: ['App', 'Email'],
      ackRequired: false,
      dueDate: null,
      reminders: null,
      nextDeliveryAt: null,
      lastActivity: { event: 'delivered', at: '2025-10-24T10:00:00Z', channel: 'App' },
    },
    {
      id: 'edu-2',
      title: 'Living with Type 2 Diabetes',
      summary: 'An overview of Type 2 Diabetes, including how to monitor blood sugar, the importance of diet, and when to contact your doctor.',
      content: 'Full content for diabetes education...',
      formats: ['Text'],
      languages: ['English'],
      category: 'Diabetes Management',
      condition_codes: ['E11.9'],
      delivery_method: 'Printed',
      source: 'Repository',
      status: 'Reviewed',
      created_by: 'Dr. Emily Carter',
      created_on: '2025-10-25',
      last_updated: '2025-10-25',
       // New fields
      schedule: {
        type: 'fixed',
        fixedAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        relative: null,
        recurring: { enabled: true, freq: 'WEEKLY', count: 4 },
      },
      channels: ['App'],
      ackRequired: true,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      reminders: { afterDays: 3, max: 2, escalateAfterDays: 10 },
      nextDeliveryAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      lastActivity: null,
    }
  ]
};
