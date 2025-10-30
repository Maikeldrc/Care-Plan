export interface BarrierTemplate {
    category: string;
    description: string;
    suggested_mitigations: string[];
    linked_quality_measures: string[];
}

export const barrierRepository: BarrierTemplate[] = [
    {
        category: 'Medication Adherence',
        description: 'Patient reports difficulty remembering to take medications on time.',
        suggested_mitigations: [
            'Set up pill organizer',
            'Use medication reminder app',
            'Simplify regimen with combination pills'
        ],
        linked_quality_measures: ['CMS165', 'CMS122']
    },
    {
        category: 'Access to Care',
        description: 'Patient has limited transportation to attend in-person appointments.',
        suggested_mitigations: [
            'Schedule telehealth visits',
            'Connect with local transport services',
            'Arrange for home health visits'
        ],
        linked_quality_measures: []
    },
    {
        category: 'Health Literacy',
        description: 'Patient seems to have a limited understanding of their conditions and the importance of treatment.',
        suggested_mitigations: [
            "Provide educational materials with simple language and visuals (e.g., 'teach-back' method).",
            'Involve family members or caregivers in educational sessions.',
            'Refer to a health educator or community health worker.'
        ],
        linked_quality_measures: ['CMS122']
    },
    {
        category: 'Financial Barriers',
        description: 'Patient expresses concern about the cost of medications or copayments.',
        suggested_mitigations: [
            'Refer to a social worker for financial assistance programs.',
            'Switch to generic or lower-cost alternative medications.',
            'Explore patient assistance programs from pharmaceutical companies.'
        ],
        linked_quality_measures: []
    },
    {
        category: 'Technology Access',
        description: 'Patient lacks a reliable smartphone or internet access for telehealth or RPM.',
        suggested_mitigations: [
            'Provide a cellular-enabled RPM device.',
            'Assist patient in applying for low-cost internet programs.',
            'Prioritize in-person or phone-based communication.'
        ],
        linked_quality_measures: []
    },
    {
        category: 'Social & Lifestyle',
        description: 'Patient lives alone, reports feelings of social isolation, and has limited engagement with community activities which may impact motivation for self-care.',
        suggested_mitigations: [
            'Refer to local community groups or senior centers.',
            'Schedule regular social check-in calls with care manager.',
            'Involve family or friends in the care plan and appointments.',
            'Explore options for pet therapy or volunteer companionship programs.'
        ],
        linked_quality_measures: []
    },
    {
        category: 'Cognitive Impairment',
        description: 'Patient has difficulty remembering appointments or complex instructions.',
        suggested_mitigations: [
            'Use automated appointment reminders (call/text).',
            'Provide written instructions in a simple, large-print format.',
            'Ensure a caregiver is present during appointments.'
        ],
        linked_quality_measures: []
    }
];