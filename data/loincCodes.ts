
export interface LoincCode {
    code: string;
    display: string;
    isPanel?: boolean;
}

export const commonLoincCodes: LoincCode[] = [
    { code: '85354-9', display: 'Blood pressure panel', isPanel: true },
    { code: '8480-6', display: 'Systolic blood pressure' },
    { code: '8462-4', display: 'Diastolic blood pressure' },
    { code: '8867-4', display: 'Heart rate' },
    { code: '59408-5', display: 'SpO₂' },
    { code: '29463-7', display: 'Body weight' },
    { code: '8302-2', display: 'Body height' },
    { code: '8310-5', display: 'Body temperature' },
    { code: '2339-0', display: 'Glucose (plasma)' },
];
