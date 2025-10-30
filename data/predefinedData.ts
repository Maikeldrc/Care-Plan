export const predefinedPrimaryDiagnoses = [
  'I10 - Essential (Primary) Hypertension',
  'E11.9 - Type 2 Diabetes Mellitus',
  'J44.9 - Chronic Obstructive Pulmonary Disease',
  'I50.9 - Heart Failure, Unspecified',
  'E78.5 - Hyperlipidemia, Unspecified',
  'N18.3 - Chronic Kidney Disease, Stage 3',
  'G47.33 - Obstructive Sleep Apnea',
  'F32.9 - Major Depressive Disorder, Single Episode, Unspecified',
  'M19.90 - Unspecified Osteoarthritis, Unspecified Site',
  'I25.10 - Atherosclerotic Heart Disease of Native Coronary Artery',
];

export const predefinedComorbidities = [
  'Diabetes Mellitus',
  'Chronic Kidney Disease',
  'COPD',
  'Heart Failure',
  'Hyperlipidemia',
  'Osteoarthritis',
  'Sleep Apnea',
  'Depression',
  'CKD Stage 3-5',
  'CAD',
  'Asthma',
  'Hypertension',
];

export const predefinedAllergies = [
  'NKDA (No Known Drug Allergies)',
  'Penicillin',
  'Sulfa Drugs',
  'Latex',
  'Aspirin',
  'Shellfish',
  'Peanuts',
  'Codeine',
  'Contrast Media',
];

export const predefinedRiskFactors = [
  'Smoking',
  'Obesity',
  'Sedentary lifestyle',
  'Alcohol use',
  'Uncontrolled BP',
  'Poor diet',
  'Family history of heart disease',
  'Stress',
  'Low health literacy',
];

export const conditionToIcdMap: { [condition: string]: string[] } = {
    'Hypertension': ['I10 - Essential (Primary) Hypertension'],
    'Diabetes Mellitus': ['E11.9 - Type 2 Diabetes Mellitus'],
    'COPD': ['J44.9 - Chronic Obstructive Pulmonary Disease'],
    'Heart Failure': ['I50.9 - Heart Failure, Unspecified'],
    'Hyperlipidemia': ['E78.5 - Hyperlipidemia, Unspecified'],
    'Chronic Kidney Disease': ['N18.3 - Chronic Kidney Disease, Stage 3'],
    'CKD Stage 3-5': ['N18.3 - Chronic Kidney Disease, Stage 3'],
    'Sleep Apnea': ['G47.33 - Obstructive Sleep Apnea'],
    'Depression': ['F32.9 - Major Depressive Disorder, Single Episode, Unspecified'],
    'Osteoarthritis': ['M19.90 - Unspecified Osteoarthritis, Unspecified Site'],
    'CAD': ['I25.10 - Atherosclerotic Heart Disease of Native Coronary Artery'],
};
