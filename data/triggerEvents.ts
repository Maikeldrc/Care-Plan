import type { TaskTriggerEvent } from '../types';

export interface TriggerEvent {
  id: TaskTriggerEvent | '';
  label: string;
  description: string;
  icon: string;
  context: 'global' | 'local' | 'both';
  params?: { name: string, type: 'number' | 'string', defaultValue: any }[];
  details: {
    source: string;
    condition: string;
    useCase: string;
    preview: string;
  };
}

export interface TriggerEventCategory {
    name: string;
    icon: string;
    events: TriggerEvent[];
}

export const triggerEventCategories: TriggerEventCategory[] = [
    {
        name: 'Care Plan Lifecycle',
        icon: 'ClipboardListIcon',
        events: [
            { id: 'care_plan_activated', label: 'Care Plan activated', description: 'When the plan is first activated.', icon: 'StarIcon', context: 'global', details: { source: 'CarePlan.status', condition: 'status: "active"', useCase: 'Send a welcome message or schedule an initial outreach call.', preview: 'This task will trigger when this care plan is activated.' }},
            { id: 'care_plan_updated', label: 'Care Plan updated', description: 'When details or goals are updated.', icon: 'PencilIcon', context: 'global', details: { source: 'CarePlan', condition: 'Any property change', useCase: 'Notify the care team about a change in the plan.', preview: 'This task will trigger when any part of the care plan is updated.' }},
            { id: 'goal_updated_or_achieved', label: 'Goal updated or achieved', description: 'When a care goal changes or is completed.', icon: 'TargetIcon', context: 'both', details: { source: 'Goal.lifecycleStatus', condition: 'lifecycleStatus changes', useCase: 'Congratulate the patient on achieving a goal and set a new one.', preview: 'This task will trigger when a goal\'s status is updated.' }},
        ],
    },
    {
        name: 'Task Outcomes',
        icon: 'CheckCircleIcon',
        events: [
            { id: 'task_completed', label: 'Task completed', description: 'When this task is successfully completed.', icon: 'CheckCircleIcon', context: 'local', details: { source: 'Task.status', condition: 'status: "completed"', useCase: 'Create a follow-up task, like documenting results or scheduling the next step.', preview: 'This action will trigger after this task is marked as completed.' }},
            { id: 'task_failed', label: 'Task failed or skipped', description: 'When this task is failed, skipped, or canceled.', icon: 'XCircleIcon', context: 'local', details: { source: 'Task.status', condition: 'status: "failed" or "skipped"', useCase: 'Create a task to investigate why the original task was not completed and re-assign if necessary.', preview: 'This action will trigger if this task is not successfully completed.' }},
            { id: 'task_overdue', label: 'Task overdue', description: 'When the due date passes without completion.', icon: 'ExclamationTriangleIcon', context: 'both', details: { source: 'Task.dueDate', condition: 'dueDate < now and status != "completed"', useCase: 'Send a reminder to the owner and escalate if necessary.', preview: 'This task will trigger if it becomes overdue.' }},
        ]
    },
    {
        name: 'Clinical Observations',
        icon: 'HeartIcon',
        events: [
            { id: 'new_observation_recorded', label: 'New observation recorded', description: 'When a new measurement is logged.', icon: 'HeartIcon', context: 'both', details: { source: 'Observation.resource', condition: 'BP, Glucose, HR', useCase: 'Create documentation or review task.', preview: 'This task will trigger each time a new observation is recorded.' }},
            { id: 'observation_out_of_range', label: 'Observation out of range', description: 'When a measurement falls below or above thresholds.', icon: 'ExclamationTriangleIcon', context: 'both', details: { source: 'Observation.valueQuantity', condition: 'Systolic BP > 140 mmHg', useCase: 'Notify Care Manager for intervention.', preview: 'This task will trigger automatically when a new out-of-range observation is received.' }},
            { id: 'observation_critical', label: 'Observation: Critical', description: 'When observation status = “critical”.', icon: 'CircleRedIcon', context: 'local', details: { source: 'Observation.status', condition: 'status = "critical"', useCase: 'Auto-create high-priority alert task for immediate clinical review.', preview: 'This action will trigger if this task produces a "critical" observation.' }},
            { id: 'observation_caution', label: 'Observation: Caution', description: 'When observation status = “caution”.', icon: 'CircleYellowIcon', context: 'local', details: { source: 'Observation.status', condition: 'status = "caution"', useCase: 'Create medium-priority follow-up task to monitor patient.', preview: 'This action will trigger if this task produces a "caution" observation.' }},
            { id: 'observation_normal', label: 'Observation: Normal', description: 'When observation status = “normal”.', icon: 'CircleGreenIcon', context: 'local', details: { source: 'Observation.status', condition: 'status = "normal"', useCase: 'Create documentation task confirming within range.', preview: 'This action will trigger if this task produces a "normal" observation.' }},
        ],
    },
    {
        name: 'Patient Engagement',
        icon: 'ChatBubbleLeftRightIcon',
        events: [
            { id: 'patient_message_received', label: 'Patient message received', description: 'When a patient replies or sends a message.', icon: 'ChatBubbleLeftRightIcon', context: 'global', details: { source: 'Communication', condition: 'Communication.medium: "sms" or "portal"', useCase: 'Create a task for the care team to respond to an incoming patient message.', preview: 'This task will trigger when the patient sends a message.' }},
            { id: 'patient_communication_failed', label: 'Patient communication failed', description: 'When a message or call attempt fails.', icon: 'NoSymbolIcon', context: 'both', details: { source: 'Communication.status', condition: 'status: "failed"', useCase: 'Attempt communication via an alternative channel.', preview: 'This task will trigger if an attempt to communicate with the patient fails.' }},
        ],
    },
    {
        name: 'Medication & Treatment',
        icon: 'PillIcon',
        events: [
             { id: 'medication_change_detected', label: 'Medication change detected', description: 'When a medication is added or modified.', icon: 'PillIcon', context: 'global', details: { source: 'MedicationStatement / MedicationRequest', condition: 'A new resource is created or status changes.', useCase: 'Schedule a medication reconciliation call with the patient.', preview: 'This task will trigger when a medication is changed.' }},
             { id: 'medication_non_adherence', label: 'Medication non-adherence detected', description: 'When adherence falls below target.', icon: 'PillIcon', context: 'both', details: { source: 'MedicationDispense.status', condition: 'adherence_score < 80%', useCase: 'Task a care manager to follow up on missed doses.', preview: 'This task will trigger when the system detects medication non-adherence.' }},
             { id: 'treatment_plan_updated', label: 'Treatment plan updated', description: 'When a treatment protocol changes.', icon: 'PencilIcon', context: 'global', details: { source: 'CarePlan.activity', condition: 'activity definition changes', useCase: 'Review changes with the patient to ensure they understand the new plan.', preview: 'This task will trigger when the overall treatment plan is updated.' }},
        ],
    },
    {
        name: 'Questionnaire & Assessment',
        icon: 'ClipboardDocumentCheckIcon',
        events: [
            { id: 'questionnaire_completed', label: 'Survey/questionnaire completed', description: 'When a patient completes a survey (e.g., PHQ-9).', icon: 'ClipboardDocumentCheckIcon', context: 'both', details: { source: 'QuestionnaireResponse.status', condition: 'QuestionnaireResponse.status: "completed"', useCase: 'Review PHQ-9 results and follow up if the score indicates depression.', preview: 'This task will trigger upon completion of a patient questionnaire.' }},
            { id: 'questionnaire_score_above', label: 'Questionnaire score above threshold', description: 'When a completed survey exceeds a set value.', icon: 'ClipboardDocumentCheckIcon', context: 'local', params: [{ name: 'score', type: 'number', defaultValue: 10 }], details: { source: 'QuestionnaireResponse.value', condition: 'value > 10', useCase: 'Create a high priority follow-up if a PHQ-9 score indicates severe depression.', preview: 'This action will trigger if the questionnaire score is above your defined threshold.' }},
            { id: 'questionnaire_score_below', label: 'Questionnaire score below threshold', description: 'When a completed survey score is below target.', icon: 'ClipboardDocumentCheckIcon', context: 'local', params: [{ name: 'score', type: 'number', defaultValue: 5 }], details: { source: 'QuestionnaireResponse.value', condition: 'value < 5', useCase: 'Confirm patient is not at risk or has achieved remission (e.g., PHQ-9 < 5).', preview: 'This action will trigger if the questionnaire score is below your defined threshold.' }},
            { id: 'questionnaire_not_completed', label: 'Questionnaire not completed', description: 'When the due date passes without submission.', icon: 'ExclamationTriangleIcon', context: 'both', details: { source: 'Questionnaire.dueDate', condition: 'dueDate < today and status != "completed"', useCase: 'Send a reminder to the patient and create a task for the care manager to follow up.', preview: 'This task will trigger if an assigned questionnaire is not completed by its due date.' }},
            { id: 'questionnaire_response_flagged', label: 'Questionnaire response flagged', description: 'When a specific answer matches a flag condition.', icon: 'ExclamationTriangleIcon', context: 'both', details: { source: 'QuestionnaireResponse.item.answer', condition: 'answer matches predefined flag', useCase: 'Immediately alert the care team for high-risk responses, such as suicidal ideation.', preview: 'This task will trigger if a specific answer in a questionnaire is flagged.' }},
        ],
    },
    {
        name: 'Conditions & Encounters',
        icon: 'DocumentAddIcon',
        events: [
             { id: 'new_diagnosis_recorded', label: 'New diagnosis recorded', description: 'When a new condition is entered.', icon: 'DocumentAddIcon', context: 'global', details: { source: 'Condition.code', condition: 'A new Condition resource is created.', useCase: 'Assign new educational materials related to the new diagnosis.', preview: 'This task will trigger when a new condition is documented.' }},
             { id: 'encounter_completed', label: 'Encounter completed', description: 'When an appointment or visit concludes.', icon: 'CalendarDaysIcon', context: 'both', details: { source: 'Encounter.status', condition: 'Encounter.status: "finished"', useCase: 'Send a post-visit survey to the patient.', preview: 'This task will trigger after a clinical encounter is completed.' }},
             { id: 'encounter_canceled', label: 'Encounter canceled', description: 'When an encounter is canceled.', icon: 'XCircleIcon', context: 'both', details: { source: 'Encounter.status', condition: 'Encounter.status: "cancelled"', useCase: 'Create a task to reschedule the canceled encounter.', preview: 'This task will trigger if an encounter is canceled.' }},
        ],
    },
    {
        name: 'Appointments & Follow-ups',
        icon: 'CalendarDaysIcon',
        events: [
            { id: 'appointment_scheduled', label: 'Appointment scheduled', description: 'When a follow-up visit is added.', icon: 'CalendarDaysIcon', context: 'both', details: { source: 'Appointment.status', condition: 'status: "booked"', useCase: 'Send an appointment confirmation and reminder to the patient.', preview: 'This task will trigger when a new appointment is scheduled.' }},
            { id: 'appointment_missed', label: 'Appointment missed', description: 'When a patient doesn’t attend a scheduled visit.', icon: 'NoSymbolIcon', context: 'both', details: { source: 'Appointment.status', condition: 'Appointment.status: "noshow"', useCase: 'Task a care coordinator to reschedule the missed appointment.', preview: 'This task will trigger when an appointment is marked as a no-show.' }},
            { id: 'appointment_completed', label: 'Appointment completed', description: 'When a visit concludes successfully.', icon: 'CheckCircleIcon', context: 'both', details: { source: 'Appointment.status = "fulfilled"', condition: 'Appointment.status is "fulfilled"', useCase: 'Create a task to follow up on lab orders from the visit.', preview: 'This task will trigger after an appointment is successfully completed.' }},
        ],
    },
    {
        name: 'System & Device Events',
        icon: 'SettingsIcon',
        events: [
            { id: 'device_alert_received', label: 'Device alert received', description: 'When a monitoring device sends an alert.', icon: 'SignalIcon', context: 'both', details: { source: 'DeviceAlert', condition: 'DeviceAlert.type = "battery"', useCase: 'Notify technical support or patient for device maintenance.', preview: 'This task will trigger when a connected device sends an alert.' }},
            { id: 'device_disconnected', label: 'Device disconnected', description: 'When a device stops reporting.', icon: 'SignalIcon', context: 'both', details: { source: 'Device.status', condition: 'status: "inactive"', useCase: 'Create a task for the care manager to contact the patient and troubleshoot the device.', preview: 'This task will trigger if a device stops reporting data.' }},
            { id: 'data_sync_failure', label: 'Data sync failure', description: 'When data upload from a connected app fails.', icon: 'ExclamationTriangleIcon', context: 'global', details: { source: 'System Log', condition: 'event: "sync_fail"', useCase: 'Alert the IT team to investigate the data synchronization issue.', preview: 'This task will trigger if a data sync from a connected application fails.' }},
        ],
    },
    {
        name: 'Manual / Scheduled',
        icon: 'SettingsIcon',
        events: [
            { id: '', label: 'None (Manual/Scheduled)', description: 'Task is created on a schedule or manually by a user.', icon: 'XIcon', context: 'global', details: { source: 'User/System', condition: 'N/A', useCase: 'Create a task that repeats daily, weekly, or is added on-demand by a care manager.', preview: 'This task will not be triggered by a clinical event.' }},
        ]
    }
];

export const triggerEvents: TriggerEvent[] = triggerEventCategories.reduce((acc, category) => acc.concat(category.events), [] as TriggerEvent[]);