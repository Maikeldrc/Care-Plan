
import type { TriggerTemplate, TaskTriggerEvent } from '../types';

export const triggerTemplates: TriggerTemplate[] = [
  {
    templateId: 'obs_crit_001',
    name: 'Critical BP Alert Workflow',
    description: 'Generates urgent communication and follow-up tasks for critical blood pressure events.',
    triggerId: 'observation_critical',
    tags: ['Observation', 'Critical Alert'],
    actions: [
      {
        type: 'SendMessage',
        details: {
          recipient: 'Care Manager',
          channel: 'In-app',
          message: 'Critical BP detected: [Observation_Value] at [Observation_Date]. Please review immediately.',
        }
      },
      {
        type: 'CreateTask',
        details: {
          title: 'Follow-up: Critical BP reading',
          subjectRole: 'Care Manager',
          priority: 'High',
          acceptanceCriteria: 'Patient contacted and next steps documented.',
          kind: 'Task',
          autoCompleteRule: false,
          extra: {},
        }
      },
      {
        type: 'CreateTask',
        details: {
          title: 'Physician review: Critical BP reading',
          subjectRole: 'PCP',
          priority: 'High',
          acceptanceCriteria: 'Clinical review completed and guidance provided.',
          kind: 'Task',
          autoCompleteRule: false,
          extra: {},
        }
      }
    ]
  },
  {
    templateId: 'obs_crit_002',
    name: 'Critical Glucose Response',
    description: 'Notifies the patient and care team about a critical blood glucose reading.',
    triggerId: 'observation_critical',
    tags: ['Observation', 'Diabetes'],
    actions: [
       {
        type: 'SendMessage',
        details: {
          recipient: 'Patient',
          channel: 'SMS',
          message: 'Your recent glucose reading of [Observation_Value] is critically high. Please take action as discussed and call us if you feel unwell.',
        }
      },
       {
        type: 'CreateTask',
        details: {
          title: 'Immediate follow-up: Critical glucose reading',
          subjectRole: 'Care Manager',
          priority: 'High',
          acceptanceCriteria: 'Patient has been contacted and situation is stable or escalated.',
          kind: 'Task',
          extra: {},
        }
      }
    ]
  },
  {
    templateId: 'obs_caut_001',
    name: 'Follow-up Call for Caution Readings',
    description: 'Schedules a medium-priority task for the care manager to check in with the patient about a caution-level reading.',
    triggerId: 'observation_caution',
    tags: ['Observation', 'Follow-up'],
    actions: [
        {
            type: 'CreateTask',
            details: {
                title: 'Follow-up on caution reading: [Observation_Value]',
                subjectRole: 'Care Manager',
                priority: 'Medium',
                acceptanceCriteria: 'Patient contacted, educated, and plan confirmed.',
                kind: 'Communication',
                extra: { mode: 'Phone Call' },
            }
        }
    ]
  },
  {
    templateId: 'obs_norm_001',
    name: 'Patient Positive Reinforcement',
    description: 'Sends a positive reinforcement message to the patient for a normal reading.',
    triggerId: 'observation_normal',
    tags: ['Patient Engagement'],
    actions: [
        {
            type: 'SendMessage',
            details: {
                recipient: 'Patient',
                channel: 'In-app',
                message: 'Great job! Your reading of [Observation_Value] today is right on target. Keep up the great work, [Patient_FirstName]!',
            }
        }
    ]
  },
   {
    templateId: 'comm_fail_001',
    name: 'Retry Outreach Sequence',
    description: 'If an initial SMS fails, creates a task to attempt a phone call.',
    triggerId: 'patient_communication_failed',
    tags: ['Patient Engagement'],
    actions: [
        {
            type: 'CreateTask',
            details: {
                title: 'Attempt alternative communication: Phone call',
                subjectRole: 'Care Manager',
                priority: 'Medium',
                acceptanceCriteria: 'Patient contacted or new attempt documented.',
                kind: 'Communication',
                extra: { mode: 'Phone Call' },
            }
        }
    ]
  },
  {
    templateId: 'obs_new_001',
    name: 'Log-only Workflow',
    description: 'A simple workflow that creates a task to document that a new observation was received.',
    triggerId: 'new_observation_recorded',
    tags: ['Observation', 'Documentation'],
    actions: [
        {
            type: 'CreateTask',
            details: {
                title: 'Document new observation: [Observation_Value]',
                subjectRole: 'System',
                priority: 'Low',
                acceptanceCriteria: 'Observation logged in patient chart.',
                autoCompleteRule: true,
                extra: { category: 'Documentation' },
            }
        }
    ]
  }
];
