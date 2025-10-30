

export interface Mitigation {
  text: string;
  completed: boolean;
}

export interface Barrier {
  id: string;
  category: string;
  description: string;
  mitigations: Mitigation[];
  status: 'Active' | 'Resolved';
  resolved_on: string | null;
  resolved_by: string | null;
  last_updated: string;
  source: 'Manual' | 'AI';
  rationale?: string;
}

export interface TargetValue {
  operator: '<' | '<=' | '>' | '>=' | '=' | 'range';
  value_min: number | null;
  value_max: number | null;
}

export type InstructionCategory = 'Medication' | 'Monitoring' | 'Symptoms' | 'Appointment' | 'Lifestyle' | 'Follow-up' | 'Other';
export type InstructionDeliveryMethod = 'Verbal' | 'Printed' | 'SMS' | 'App';
export type InstructionStatus = 'Active' | 'Delivered' | 'Paused' | 'Archived';
export type InstructionOwner = 'Patient' | 'Care Manager' | 'PCP';
export type InstructionSource = 'Manual' | 'AI' | 'Template';

export interface Instruction {
  id: string;
  title: string;
  details: string;
  category: InstructionCategory;
  linked_goal_id: string | null;
  linked_barrier_id: string | null;
  delivery_method: InstructionDeliveryMethod;
  language: 'English' | 'Spanish';
  status: InstructionStatus;
  due_rule: string | null;
  owner: InstructionOwner;
  created_at: string;
  updated_at: string;
  created_by: string;
  source: InstructionSource;
  rationale?: string;
}

export type EducationCategory = 'Cardiovascular Health' | 'Diabetes Management' | 'Medication' | 'Diet' | 'Exercise' | 'Mental Health' | 'Monitoring' | 'General';
export type EducationDeliveryMethod = 'App' | 'Printed' | 'Email' | 'Verbal' | 'URL' | 'SMS';
export type EducationStatus = 'Not Scheduled' | 'Scheduled' | 'Delivered' | 'Viewed' | 'Completed' | 'Overdue' | 'Assigned' | 'Reviewed';
export type EducationSource = 'Repository' | 'AI';
export type EducationFormat = 'Text' | 'PDF' | 'Video' | 'Image' | 'URL';

export interface EducationSchedule {
  type: 'now' | 'fixed' | 'relative';
  fixedAt: string | null; // ISO string
  relative: {
    event: 'goal_created' | 'lab_result' | 'visit_completed' | 'target_out_of_range' | null;
    eventFilter?: { labType?: string; targetId?: string; threshold?: string };
    offset: { days: number };
  } | null;
  recurring: {
    enabled: boolean;
    freq: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    count: number;
  } | null;
}

export interface EducationMaterial {
  id: string;
  title: string;
  summary: string;
  content: string; // For Text format, or a link for other formats
  formats: EducationFormat[];
  languages: ('English' | 'Spanish')[];
  category: EducationCategory;
  condition_codes?: string[];
  linked_goals?: string[];
  linked_barriers?: string[];
  delivery_method: EducationDeliveryMethod; // Kept for simplicity, but channels is more detailed
  source: EducationSource;
  status: EducationStatus;
  created_by: string;
  created_on: string;
  last_updated: string;
  // New scheduling fields
  schedule: EducationSchedule | null;
  channels: ('App' | 'Email' | 'SMS')[];
  ackRequired: boolean;
  dueDate: string | null; // For acknowledgment
  reminders: {
    afterDays: number;
    max: number;
    escalateAfterDays: number | null;
  } | null;
  nextDeliveryAt: string | null; // ISO string
  lastActivity: {
    event: 'viewed' | 'completed' | 'delivered';
    at: string; // ISO string
    channel: 'App' | 'Email' | 'SMS';
  } | null;
}

export interface BaselineMetric {
  id: string;
  name: string;
  operator: '<' | '>' | '=';
  value: string;
  unit: string;
}

export interface CarePlan {
  careProgram: string;
  diagnoses: {
    primary: string[];
    comorbidities: string[];
    allergies: string[];
    riskFactors: string[];
  };
  timeframe: {
    startDate: string;
    targetHorizon: string;
    priority: string;
  };
  clinicalContext: {
    baselineMetrics: BaselineMetric[];
    patientPreferences: string;
  };
  goals: Goal[];
  barriers: Barrier[];
  instructions: Instruction[];
  education: EducationMaterial[];
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'Active' | 'At risk' | 'On track';
  priority: 'High' | 'Medium' | 'Low';
  qualityMeasures: string[];
  startDate: string;
  targetDate: string;
  isOverdue?: boolean;
  diagnoses: string[];
  metrics: GoalMetric[];
  tasks: Task[];
  measurementTargets: MeasurementTarget[];
  eventsAndTasks: EventTask[];
  dataTable: DataTableEntry[];
}

export interface GoalMetric {
  name: string;
  target: TargetValue;
  current?: string;
  unit: string;
  referenceRange: string;
  source: 'Manual' | 'AI';
  rationale?: string;
}

export type TaskTriggerEvent =
  | 'care_plan_activated'
  | 'new_observation_recorded'
  | 'observation_out_of_range'
  | 'observation_critical'
  | 'observation_caution'
  | 'observation_normal'
  | 'medication_change_detected'
  | 'medication_non_adherence'
  | 'new_diagnosis_recorded'
  | 'goal_updated_or_achieved'
  | 'encounter_completed'
  | 'hospital_discharge_detected'
  | 'appointment_missed'
  | 'appointment_completed'
  | 'device_alert_received'
  | 'questionnaire_completed'
  | 'questionnaire_score_above'
  | 'questionnaire_score_below'
  | 'questionnaire_response_submitted'
  | 'questionnaire_overdue'
  | 'patient_message_received'
  | 'no_contact_for_x_days'
  | 'care_plan_review_due'
  | 'task_completed'
  | 'task_failed'
  | 'care_plan_updated'
  | 'task_overdue'
  | 'patient_communication_failed'
  | 'treatment_plan_updated'
  | 'questionnaire_not_completed'
  | 'questionnaire_response_flagged'
  | 'encounter_canceled'
  | 'appointment_scheduled'
  | 'device_disconnected'
  | 'data_sync_failure';


export type TaskKind = 'Communication' | 'Service Request' | 'Task' | 'Device Request' | 'Nutrition Order' | 'Medication Request' | 'Questionnaire' | 'Other';
export type TaskStatus = 'Pending' | 'In progress' | 'Completed' | 'Skipped' | 'Cancelled' | 'At risk';
export type TaskPriority = 'High' | 'Medium' | 'Low';
export type TaskOwner = 'Patient' | 'Care Manager' | 'PCP' | 'Specialist' | 'Nurse' | 'Supervisor' | 'Coordinator';

export interface TaskSchedule {
  frequency: number;
  period: number;
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  repetitions?: number;
  startDate: string; // ISO datetime string
  daysOfWeek?: ('SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT')[];
  timesOfDay?: string[]; // 'HH:mm' format
}

export interface TaskTriggerConfig {
  offset: { value: number; unit: 'minutes' | 'hours' | 'days' };
  earliestStartWindow?: { start: string; end: string }; // 'HH:mm'
  dueDatePolicy: {
    type: 'fixed_duration' | 'same_day_by' | 'next_business_day_by';
    value: string; // e.g., '3 days' or '17:00'
  };
  deduplicationWindow?: { value: number; unit: 'minutes' };
}

export type ReactiveActionType = 'CreateTask' | 'SendMessage' | 'TriggerWorkflow' | 'Delay' | 'Condition';
export type ReactiveTarget = TaskOwner | 'System' | 'Physician';

export interface CreateTaskActionDetails {
    kind: TaskKind;
    title: string;
    priority: TaskPriority;
    subjectRole: ReactiveTarget;
    status?: TaskStatus;
    acceptanceCriteria: string;
    dueDate?: string;
    dueOffset?: { value: number; unit: 'minutes' | 'hours' | 'days' };
    autoCompleteRule?: boolean;
    extra?: any;
    linkedTarget?: string;
    schedule?: TaskSchedule | null;
}

export interface SendMessageActionDetails {
    channel: 'In-app' | 'SMS' | 'Email';
    recipient: ReactiveTarget;
    message: string;
}

export interface TriggerWorkflowActionDetails {
    workflowId: string;
    endpoint?: string;
}

export interface DelayActionDetails {
    value: number;
    unit: 'minutes' | 'hours' | 'days';
}

export interface ConditionActionDetails {
    expression: string;
    onTrue: ReactiveAction[];
    onFalse: ReactiveAction[];
}

export interface ReactiveAction {
    id: string;
    actionType: ReactiveActionType;
    target?: ReactiveTarget; // Optional for Delay
    actionDetails: CreateTaskActionDetails | SendMessageActionDetails | TriggerWorkflowActionDetails | DelayActionDetails | ConditionActionDetails;
}

export interface ReactiveFlow {
    id: string;
    name?: string;
    trigger: {
        id: TaskTriggerEvent;
        params?: { [key: string]: any };
    };
    actions: ReactiveAction[];
    sourceTemplateId?: string;
    sourceTemplateName?: string;
}

export interface Task {
  id: string;
  goalId?: string;
  kind: TaskKind;
  title: string;
  owner?: TaskOwner; // For internal assignment (Task, Communication, Other)
  performer?: string[]; // For clinical roles (Service Request, etc.)
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  linkedQM?: string[];
  linkedTarget?: string;
  acceptanceCriteria: string;
  autoComplete: boolean;
  extra: any;
  fhirEvidence: {
    resource: string;
    status: string;
  };
  isAuto?: boolean; 
  source?: 'Manual' | 'AI' | 'QM-pack';
  startTriggers?: TaskTriggerEvent[];
  schedule?: TaskSchedule | null;
  triggerConfig?: TaskTriggerConfig | null;
  reactiveFlows?: ReactiveFlow[];
}


export interface MeasurementTarget {
  name: string;
  target: TargetValue;
  latestValue: number;
  delta: number;
  withinTargetPercent: number;
  data: { date: string; value: number }[];
}

export interface EventTask {
  id: string;
  description: string;
  date: string;
  status: 'Completed' | 'Pending';
  type: 'Medication' | 'Blood pressure' | 'Appointment' | 'Generic';
}

export interface DataTableEntry {
  id: string;
  timestamp: string;
  target: string;
  value: number;
  unit: string;
  source: 'RPM' | 'Manual';
}

export type QualityMeasureSource = 'CMS' | 'HEDIS' | 'PQRS' | 'NCQA' | 'MIPS';
export type QualityMeasureArea = 
    | 'Cardiovascular Health' 
    | 'Diabetes Care' 
    | 'Chronic Kidney Disease' 
    | 'Behavioral Health' 
    | 'Preventive Screenings' 
    | 'Respiratory Conditions'
    | 'Mental Health' 
    | 'General'
    | 'Cardiovascular'
    | 'Diabetes';

export interface QualityMeasure {
    id: string;
    title: string;
    description: string;
    source: QualityMeasureSource;
    clinicalArea: QualityMeasureArea;
    suggestedTasks: string[];
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  type: 'SMS' | 'Email';
  language: 'en' | 'es';
  content: string;
  variables: string[];
}

export interface TriggerTemplateAction {
  type: ReactiveActionType;
  details: Partial<CreateTaskActionDetails | SendMessageActionDetails | TriggerWorkflowActionDetails | DelayActionDetails | ConditionActionDetails>;
}

export interface TriggerTemplate {
  templateId: string;
  name: string;
  description: string;
  triggerId: TaskTriggerEvent;
  actions: TriggerTemplateAction[];
  tags?: string[];
}


// --- AI Conversation Types ---

export interface AiClarificationOption {
  text: string;
  action: string;
  value: any;
}

export type AiOrchestratorResponse = 
  | { type: 'clarification'; message: string; options: AiClarificationOption[]; conversationContext: any; }
  | { type: 'confirmation'; summary: string; conversationContext: any; }
  | { type: 'success'; updatedPlan: CarePlan; summary: string; highlights: Set<string>; }
  | { type: 'error' | 'cancel'; message: string; }
  | { type: 'idle' };

export interface AiOptimizationSuggestion {
  category: 'Goal Improvements' | 'Task Optimization' | 'Barrier Alerts' | 'Quality Measure Alignment' | 'General';
  text: string;
  rationale: string;
}