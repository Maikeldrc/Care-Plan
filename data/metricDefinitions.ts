export interface MetricDefinition {
    name: string;
    unit: string;
    referenceRange: string;
}

export const metricDefinitions: MetricDefinition[] = [
    { name: 'Systolic BP', unit: 'mmHg', referenceRange: 'Normal: < 130 mmHg' },
    { name: 'Diastolic BP', unit: 'mmHg', referenceRange: 'Normal: < 80 mmHg' },
    { name: 'HbA1c', unit: '%', referenceRange: 'Normal: < 7.0%' },
    { name: 'Fasting Glucose', unit: 'mg/dL', referenceRange: 'Normal: 80-130 mg/dL' },
    { name: 'LDL Cholesterol', unit: 'mg/dL', referenceRange: 'Normal: < 100 mg/dL' },
    { name: 'Med Adherence', unit: '%', referenceRange: 'Target: > 95%' },
    { name: 'Weight', unit: 'kg', referenceRange: 'Varies by patient' },
    { name: 'BMI', unit: 'kg/m²', referenceRange: 'Normal: 18.5-24.9' },
    { name: 'PHQ-9 Score', unit: 'points', referenceRange: 'Remission: < 5' },
    { name: 'DASH Diet Compliance', unit: '%', referenceRange: 'Self-reported compliance' },
    { name: 'Weekly Exercise', unit: 'minutes', referenceRange: '>= 150 minutes/week' },
    { name: 'SMBG Adherence', unit: '%', referenceRange: 'Self-reported adherence to Self-Monitoring of Blood Glucose' },
    { name: 'Annual Microalbumin Test', unit: 'Completed', referenceRange: '0 (No) or 1 (Yes)' },
    { name: 'Annual Foot Exam', unit: 'Completed', referenceRange: '0 (No) or 1 (Yes)' },
    { name: 'Annual Eye Exam', unit: 'Completed', referenceRange: '0 (No) or 1 (Yes)' },
    { name: 'Statin Adherence (MPR)', unit: '%', referenceRange: 'Medication Possession Ratio' },
    { name: 'ASCVD Risk Score', unit: '%', referenceRange: '10-year risk score' },
];
