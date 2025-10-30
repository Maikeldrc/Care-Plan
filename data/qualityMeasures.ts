import type { QualityMeasure } from '../types';

export const qualityMeasures: QualityMeasure[] = [
    {
        id: 'CMS165',
        title: 'Controlling High Blood Pressure',
        description: 'Percentage of patients aged 18-85 years who had a diagnosis of hypertension and whose blood pressure was adequately controlled (<140/90 mmHg) during the measurement period.',
        source: 'CMS',
        clinicalArea: 'Cardiovascular Health',
        suggestedTasks: [
            'Monitor blood pressure regularly (home or clinic)',
            'Provide patient education on diet (e.g., DASH) and exercise',
            'Medication adherence counseling',
            'Schedule follow-up appointment for BP check'
        ]
    },
    {
        id: 'CMS122',
        title: 'Diabetes: Hemoglobin A1c (HbA1c) Poor Control (>9%)',
        description: 'Percentage of patients 18-75 years of age with diabetes who had hemoglobin A1c > 9.0% during the measurement period, indicating poor control.',
        source: 'CMS',
        clinicalArea: 'Diabetes Care',
        suggestedTasks: [
            'Order HbA1c lab test every 3 months',
            'Conduct diabetes self-management education',
            'Review and adjust medications as needed',
            'Document patient goals for glucose control'
        ]
    },
    {
        id: 'CMS347',
        title: 'Statin Therapy for Patients with Cardiovascular Disease',
        description: 'Percentage of patients with clinical atherosclerotic cardiovascular disease (ASCVD) who were dispensed at least one high- or moderate-intensity statin medication.',
        source: 'CMS',
        clinicalArea: 'Cardiovascular Health',
        suggestedTasks: [
            'Review medication list and verify statin prescription',
            'Educate patient on statin benefits and adherence',
            'Schedule lipid panel every 6 months',
            'Follow up on any reported side effects'
        ]
    },
    {
        id: 'CMS127',
        title: 'Pneumococcal Vaccination Status for Older Adults',
        description: 'Percentage of patients 65 years and older who have ever received a pneumococcal vaccine to prevent pneumonia.',
        source: 'CMS',
        clinicalArea: 'Preventive Screenings',
        suggestedTasks: [
            'Check vaccination status in EHR',
            'Schedule pneumococcal vaccine if due',
            'Provide patient education material on vaccine benefits'
        ]
    },
    {
        id: 'CMS130',
        title: 'Colorectal Cancer Screening',
        description: 'Percentage of adults 50-75 years of age who had appropriate screening for colorectal cancer.',
        source: 'CMS',
        clinicalArea: 'Preventive Screenings',
        suggestedTasks: [
            'Identify eligible patients based on age and risk',
            'Schedule screening (FIT, colonoscopy, or sigmoidoscopy)',
            'Document screening results and follow-up plan'
        ]
    },
    {
        id: 'CMS68',
        title: 'Medication Adherence for Hypertension (RAS)',
        description: 'Percentage of patients with a prescription for a RAS antagonist who have a proportion of days covered (PDC) of at least 80%.',
        source: 'CMS',
        clinicalArea: 'Cardiovascular Health',
        suggestedTasks: [
            'Send medication reminders',
            'Conduct medication reconciliation',
            'Provide patient education on importance of adherence'
        ]
    },
    {
        id: 'CMS134',
        title: 'Diabetes: Eye Exam',
        description: 'Percentage of patients with diabetes who had a retinal eye exam performed.',
        source: 'CMS',
        clinicalArea: 'Diabetes Care',
        suggestedTasks: [
            'Refer patient to ophthalmology for retinal exam',
            'Schedule annual diabetic eye exam',
            'Document results of eye exam'
        ]
    }
];
