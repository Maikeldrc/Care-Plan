import type { TaskKind } from '../types';

export const kindDetails: { [key in TaskKind]: { acceptance: string; fhirResource: string; fhirStatus: string; } } = {
    Communication: { acceptance: "Contact successfully made and documented with summary.", fhirResource: "Communication", fhirStatus: "completed" },
    'Service Request': { acceptance: "Service order created and fulfilled or appointment scheduled.", fhirResource: "ServiceRequest", fhirStatus: "completed" },
    Task: { acceptance: "Subtasks completed or result attached.", fhirResource: "Task", fhirStatus: "completed" },
    'Device Request': { acceptance: "Device delivered and linked with serial number.", fhirResource: "DeviceRequest", fhirStatus: "completed" },
    'Nutrition Order': { acceptance: "Nutrition plan approved and two follow-ups completed.", fhirResource: "NutritionOrder", fhirStatus: "active" },
    'Medication Request': { acceptance: "Prescription has been created and is active.", fhirResource: "MedicationRequest", fhirStatus: "active" },
    Questionnaire: { acceptance: "Questionnaire completed and score recorded.", fhirResource: "QuestionnaireResponse", fhirStatus: "completed" },
    Other: { acceptance: "Task is completed as per description.", fhirResource: "Task", fhirStatus: "completed" },
};


export const inferTaskKind = (title: string): TaskKind => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('monitor') || lowerTitle.includes('reading')) return 'Task';
    if (lowerTitle.includes('education') || lowerTitle.includes('counseling')) return 'Communication';
    if (lowerTitle.includes('schedule') || lowerTitle.includes('appointment') || lowerTitle.includes('refer')) return 'Service Request';
    if (lowerTitle.includes('order') || lowerTitle.includes('device')) return 'Device Request';
    if (lowerTitle.includes('prescribe') || lowerTitle.includes('medication')) return 'Medication Request';
    if (lowerTitle.includes('diet')) return 'Nutrition Order';
    if (lowerTitle.includes('administer') || lowerTitle.includes('questionnaire')) return 'Questionnaire';
    return 'Other';
};