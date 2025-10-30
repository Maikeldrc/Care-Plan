import React, { useState, useMemo, useEffect } from 'react';
import type { Task, TaskKind, TaskOwner, CarePlan } from '../../types';
import { kindDetails } from '../../data/taskDetails';
import { MultiSelectInput } from './MultiSelectInput';
import { SelectMessageTemplateModal } from '../modals/SelectMessageTemplateModal';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';
import { conditionToIcdMap, predefinedPrimaryDiagnoses } from '../../data/predefinedData';
import { commonLoincCodes } from '../../data/loincCodes';


const baseInputStyles = "mt-1 block w-full border border-brand-gray-300 text-brand-gray-900 shadow-sm sm:text-sm rounded-md focus:ring-1 focus:ring-brand-blue focus:border-brand-blue disabled:bg-brand-gray-100 disabled:text-brand-gray-500";
const inputStyles = `${baseInputStyles} h-10 px-3 py-2 bg-white`;
const selectStyles = `${baseInputStyles} h-10 pl-3 pr-10 py-2`;
const textareaStyles = `${baseInputStyles} px-3 py-2 bg-white`;
const checkboxStyles = "focus:ring-brand-blue h-4 w-4 bg-white text-brand-blue border-gray-300 rounded focus:ring-2";

const Info: React.FC<{children: React.ReactNode}> = ({ children }) => (
    <div className="mt-4 p-3 bg-brand-gray-100 border border-brand-gray-200 rounded-md text-xs text-brand-gray-600">{children}</div>
);

const careTeamMembers = ['Sarah Johnson — Care Manager', 'Dr. Emily Carter — PCP', 'John Doe — Nurse', 'Patient', 'Related Person (Family)', 'Bot (System)'];
const internalUsers: TaskOwner[] = ['Care Manager', 'Supervisor', 'Coordinator', 'Nurse'];

interface SpecificFieldsProps {
    formData: Omit<Task, 'id' | 'goalId' | 'fhirEvidence'>;
    setFormData: React.Dispatch<React.SetStateAction<Omit<Task, 'id' | 'goalId' | 'fhirEvidence'>>>;
    carePlan?: CarePlan;
}

const handleExtraChange = (
    field: string, 
    value: any, 
    setFormData: SpecificFieldsProps['setFormData']
) => {
    setFormData(prev => ({...prev, extra: {...prev.extra, [field]: value}}));
};

const fhirServiceRequestCategories = [
    'Laboratory', 'Imaging', 'Procedure', 'Surgery', 'Therapy', 'Observation',
    'Evaluation', 'Nursing', 'Consultation', 'Education', 'Social service', 'Supply'
];

const requestStatusOptions = ['Draft', 'Ordered', 'On hold', 'Completed', 'Cancelled'];
const requestStatusTooltip = "Select the current lifecycle state of this request. Use ‘Draft’ when planning within the Care Plan, and change to ‘Ordered’ once the request has been formally placed.";

const RequestStatusField: React.FC<{ value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }> = ({ value, onChange }) => (
    <div title={requestStatusTooltip}>
        <label className="block text-sm font-medium text-brand-gray-700">Request Status <span className="text-red-500">*</span></label>
        <select value={value} onChange={onChange} className={selectStyles}>
            {requestStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);


const ServiceRequestFields: React.FC<SpecificFieldsProps> = ({ formData, setFormData, carePlan }) => {
    const isObservationCategory = formData.extra.category === 'Observation';
    const isObservationAndMissingCode = isObservationCategory && !formData.extra.observationCode;

    const loincOptions = useMemo(() => commonLoincCodes.map(c => `${c.display} — LOINC ${c.code}`), []);

    const selectedLoinc = useMemo(() => {
        const code = formData.extra.observationCode;
        if (!code || !code.code || !code.display) return '';
        return `${code.display} — LOINC ${code.code}`;
    }, [formData.extra.observationCode]);

    const handleLoincChange = (items: string[]) => {
        if (items.length === 0) {
            handleExtraChange('observationCode', undefined, setFormData);
            return;
        }

        const selectedStr = items[0];
        const match = selectedStr.match(/(.+) — LOINC (.+)/);
        
        if (match) {
            const [, display, code] = match;
            const loincDef = commonLoincCodes.find(c => c.code === code);
            handleExtraChange('observationCode', {
                system: 'http://loinc.org',
                code: code,
                display: display,
                isPanel: loincDef?.isPanel,
            }, setFormData);
        } else {
            handleExtraChange('observationCode', {
                system: 'http://loinc.org',
                code: 'TBD',
                display: selectedStr,
            }, setFormData);
        }
    };

    return (
    <div className="space-y-4">
         <div title="Select the type of clinical service being requested. Categories follow the HL7® FHIR ServiceRequest standard.">
            <label className="block text-sm font-medium text-brand-gray-700">Category <span className="text-red-500">*</span></label>
            <select value={formData.extra.category || ''} onChange={e => handleExtraChange('category', e.target.value, setFormData)} className={selectStyles}>
                <option value="" disabled>Select category</option>
                {fhirServiceRequestCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
        </div>
        {isObservationCategory && (
             <div>
                <MultiSelectInput
                    label="Observation Type (LOINC)"
                    tooltip="Select the clinical code (LOINC) for the observation to be performed. This will link the resulting Observation to this ServiceRequest."
                    placeholder="Search observation type (e.g., Blood pressure)..."
                    data={loincOptions}
                    items={selectedLoinc ? [selectedLoinc] : []}
                    onItemsChange={handleLoincChange}
                    chipColorClass="bg-green-100 text-green-800"
                    singleSelect
                    error={isObservationAndMissingCode}
                />
                {isObservationAndMissingCode && <p className="mt-1 text-sm text-red-600">This field is required when category is Observation.</p>}
            </div>
        )}
         <div>
             <MultiSelectInput
                label="Performer"
                tooltip="Select who will perform this request. You can assign one or multiple performers."
                placeholder="Select performers..."
                data={careTeamMembers}
                items={formData.performer || []}
                onItemsChange={(items) => setFormData(p => ({...p, performer: items}))}
                chipColorClass="bg-indigo-100 text-indigo-800"
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <RequestStatusField value={formData.extra.requestStatus || 'Draft'} onChange={e => handleExtraChange('requestStatus', e.target.value, setFormData)} />
            <div>
                <label className="block text-sm font-medium text-brand-gray-700">Follow-up Date</label>
                <input type="date" value={formData.extra.followUpDate || ''} onChange={e => handleExtraChange('followUpDate', e.target.value, setFormData)} className={inputStyles} />
            </div>
        </div>
    </div>
    );
};

const MedicationRequestFields: React.FC<SpecificFieldsProps> = ({ formData, setFormData, carePlan }) => (
    <div className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-brand-gray-700">Medication Name</label>
            <input type="text" value={formData.extra.medication || ''} onChange={e => handleExtraChange('medication', e.target.value, setFormData)} placeholder="e.g., Lisinopril 10mg" className={inputStyles} />
        </div>
        <div>
            <label className="block text-sm font-medium text-brand-gray-700">Dosage Instructions</label>
            <textarea value={formData.extra.dosage || ''} onChange={e => handleExtraChange('dosage', e.target.value, setFormData)} rows={3} className={textareaStyles}></textarea>
        </div>
        <div>
            <MultiSelectInput
                label="Performer"
                tooltip="Select who will perform this request. You can assign one or multiple performers."
                placeholder="Select performer (e.g., Pharmacist)..."
                data={careTeamMembers}
                items={formData.performer || []}
                onItemsChange={(items) => setFormData(p => ({...p, performer: items}))}
                chipColorClass="bg-red-100 text-red-800"
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <RequestStatusField value={formData.extra.requestStatus || 'Draft'} onChange={e => handleExtraChange('requestStatus', e.target.value, setFormData)} />
            <div>
                <label className="block text-sm font-medium text-brand-gray-700">Refill Count</label>
                <input type="number" value={formData.extra.refills || 0} onChange={e => handleExtraChange('refills', e.target.value, setFormData)} className={inputStyles} />
            </div>
        </div>
    </div>
);

const TaskFields: React.FC<SpecificFieldsProps> = ({ formData, setFormData, carePlan }) => (
    <div className="space-y-4">
        <div title="Classify the operational nature of this task for better reporting and routing.">
            <label className="block text-sm font-medium text-brand-gray-700">Category</label>
            <select value={formData.extra.category || 'Administrative'} onChange={e => handleExtraChange('category', e.target.value, setFormData)} className={selectStyles}>
                <option>Administrative</option>
                <option>Follow-up</option>
                <option>Documentation</option>
                <option>Coordination</option>
                <option>Quality review</option>
                <option>Compliance</option>
                <option>Billing/RCM</option>
            </select>
        </div>
        <div>
             <MultiSelectInput
                label="Owner"
                tooltip="Select who in the organization is responsible for completing or monitoring this task."
                placeholder="Select owner..."
                data={internalUsers}
                items={formData.owner ? [formData.owner] : []}
                onItemsChange={(items) => setFormData(p => ({...p, owner: items[0] as TaskOwner | undefined}))}
                chipColorClass="bg-gray-100 text-gray-800"
                singleSelect
            />
        </div>
        <div className="relative flex items-start">
            <div className="flex items-center h-5"><input id="requiresReview" type="checkbox" checked={!!formData.extra.requiresReview} onChange={(e) => handleExtraChange('requiresReview', e.target.checked, setFormData)} className={checkboxStyles}/></div>
            <div className="ml-3 text-sm"><label htmlFor="requiresReview" className="font-medium text-brand-gray-700">Requires Review by Supervisor</label></div>
        </div>
    </div>
);

const CommunicationFields: React.FC<SpecificFieldsProps> = ({ formData, setFormData, carePlan }) => {
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const commsType = formData.extra.mode === 'SMS' ? 'SMS' : formData.extra.mode === 'Email' ? 'Email' : null;

    return (
        <>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Mode of Communication</label>
                    <select value={formData.extra.mode || 'Phone Call'} onChange={(e) => handleExtraChange('mode', e.target.value, setFormData)} className={selectStyles}>
                        <option>Phone Call</option>
                        <option>Video Call</option>
                        <option>SMS</option>
                        <option>Email</option>
                        <option>In-App Notification</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Owner</label>
                    <select value={formData.owner || ''} onChange={e => setFormData(p => ({...p, owner: e.target.value as TaskOwner}))} className={selectStyles}>
                        {internalUsers.map(user => <option key={user} value={user}>{user}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Recipient</label>
                    <select value={formData.extra.recipient || 'Patient'} onChange={(e) => handleExtraChange('recipient', e.target.value, setFormData)} className={selectStyles}>
                        <option>Patient</option>
                        <option>Caregiver</option>
                        <option>Related Person</option>
                    </select>
                </div>

                {commsType && (
                    <div className="space-y-4 pt-4 border-t">
                        <div>
                            <label className="block text-sm font-medium text-brand-gray-700">Message Template</label>
                             <div className="mt-1">
                                <button type="button" onClick={() => setIsTemplateModalOpen(true)} className="w-full h-10 flex items-center gap-2 px-3 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50 text-left">
                                    <ClipboardListIcon className="w-5 h-5 text-brand-blue" />
                                    Select a message template...
                                </button>
                                <p className="mt-1 text-xs text-brand-gray-500">Choose a template to auto-fill the message. Supports dynamic variables.</p>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-brand-gray-700">Message Content</label>
                            <textarea 
                                value={formData.extra.message || ''} 
                                onChange={(e) => handleExtraChange('message', e.target.value, setFormData)} 
                                rows={5} 
                                className={textareaStyles}
                                placeholder="Message content will be populated here from a template or can be written manually."
                            ></textarea>
                        </div>
                    </div>
                )}
            </div>
            {commsType && carePlan && (
                 <SelectMessageTemplateModal 
                    isOpen={isTemplateModalOpen}
                    onClose={() => setIsTemplateModalOpen(false)}
                    onApply={(content) => {
                        handleExtraChange('message', content, setFormData);
                        setIsTemplateModalOpen(false);
                    }}
                    type={commsType}
                    carePlan={carePlan}
                />
            )}
        </>
    );
};

const DeviceRequestFields: React.FC<SpecificFieldsProps> = ({ formData, setFormData, carePlan }) => {
    
    const reasonCodeOptions = useMemo(() => {
        if (!carePlan) return [];
        
        const diagnoses = carePlan.diagnoses.primary || [];
        const comorbidities = carePlan.diagnoses.comorbidities || [];
        
        const options = new Set<string>();

        diagnoses.forEach(dx => {
            const parts = dx.split(' - ');
            if (parts.length > 1) {
                const code = parts[0].trim();
                const display = parts.slice(1).join(' - ').trim();
                if (code && display) {
                    options.add(`${display} — ICD-10: ${code}`);
                }
            }
        });

        comorbidities.forEach(comorbidity => {
            const mappedDiagnoses = conditionToIcdMap[comorbidity];
            if (mappedDiagnoses) {
                mappedDiagnoses.forEach(dx => {
                    const parts = dx.split(' - ');
                    if (parts.length > 1) {
                        const code = parts[0].trim();
                        const display = parts.slice(1).join(' - ').trim();
                        if (code && display) {
                            options.add(`${display} — ICD-10: ${code}`);
                        }
                    }
                })
            }
        });

        return Array.from(options);
    }, [carePlan]);

    useEffect(() => {
        const reasonCode = formData.extra.reasonCode;
        if (reasonCodeOptions.length === 1 && (!reasonCode || (Array.isArray(reasonCode) && reasonCode.length === 0))) {
            const [display, systemAndCode] = reasonCodeOptions[0].split(' — ');
            const [, code] = systemAndCode.split(': ');
            
            const newReasonCode = [{
                coding: [{
                    system: 'http://hl7.org/fhir/sid/icd-10-cm',
                    code: code.trim(),
                    display: display.trim(),
                }]
            }];
            handleExtraChange('reasonCode', newReasonCode, setFormData);
        }
    }, [reasonCodeOptions, formData.extra.reasonCode, setFormData]);

    const allSearchableDiagnoses = useMemo(() => {
        const allOptions = new Set(reasonCodeOptions);
        predefinedPrimaryDiagnoses.forEach(dx => {
            const parts = dx.split(' - ');
            if (parts.length > 1) {
                const code = parts[0].trim();
                const display = parts.slice(1).join(' - ').trim();
                if (code && display) {
                    allOptions.add(`${display} — ICD-10: ${code}`);
                }
            }
        });

        Object.values(conditionToIcdMap).flat().forEach(dx => {
            const parts = dx.split(' - ');
             if (parts.length > 1) {
                const code = parts[0].trim();
                const display = parts.slice(1).join(' - ').trim();
                if (code && display) {
                    allOptions.add(`${display} — ICD-10: ${code}`);
                }
            }
        });
        
        return Array.from(allOptions);
    }, [reasonCodeOptions]);

    const selectedReasonCodes = useMemo(() => {
        const reasons = formData.extra.reasonCode;
        if (!Array.isArray(reasons)) return [];

        return reasons.map((reason: any) => {
            if (reason.text) {
                return reason.text;
            }
            const coding = reason.coding?.[0];
            if (!coding) return '';
            const system = coding.system.includes('icd-10') ? 'ICD-10' : coding.system.includes('snomed') ? 'SNOMED CT' : 'Unknown';
            return `${coding.display} — ${system}: ${coding.code}`;
        }).filter(Boolean);
    }, [formData.extra.reasonCode]);

    const handleReasonCodeChange = (items: string[]) => {
        const newReasonCodes = items.map(item => {
            const parts = item.split(' — ');
            if (parts.length < 2) {
                 return { text: item };
            }

            const [display, systemAndCode] = parts;
            const codeParts = systemAndCode.split(': ');
            if (codeParts.length < 2) {
                return { text: item };
            }
            const [systemStr, code] = codeParts;
            
            let system = '';
            if (systemStr.toLowerCase() === 'icd-10') {
                system = 'http://hl7.org/fhir/sid/icd-10-cm';
            } else if (systemStr.toLowerCase() === 'snomed ct') {
                system = 'http://snomed.info/sct';
            }

            if (system) {
                return {
                    coding: [{
                        system,
                        code: code.trim(),
                        display: display.trim(),
                    }]
                };
            } else {
                 return { text: item };
            }
        });
        handleExtraChange('reasonCode', newReasonCodes, setFormData);
    };

    return (
         <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-brand-gray-700">Device Type</label>
                <select value={formData.extra.deviceType || 'BP Monitor'} onChange={e => handleExtraChange('deviceType', e.target.value, setFormData)} className={selectStyles}>
                    <option>BP Monitor</option><option>Glucose Meter</option><option>Pulse Oximeter</option><option>Scale</option><option>Other</option>
                </select>
            </div>
            <div>
                <MultiSelectInput
                    label="Performer"
                    tooltip="Select who will perform this request. You can assign one or multiple performers."
                    placeholder="Select performer (e.g. Supply Department)"
                    data={careTeamMembers}
                    items={formData.performer || []}
                    onItemsChange={(items) => setFormData(p => ({...p, performer: items}))}
                    chipColorClass="bg-cyan-100 text-cyan-800"
                />
            </div>
            <div>
                 <MultiSelectInput
                    label="Reason(s)"
                    tooltip="Select the clinical reason(s) that justify this device. Pulled from Care Plan intake; you may also search codes."
                    placeholder={reasonCodeOptions.length > 0 ? "Select one or more reasons..." : "No conditions found from intake. You can search and add one."}
                    data={allSearchableDiagnoses}
                    items={selectedReasonCodes}
                    onItemsChange={handleReasonCodeChange}
                    chipColorClass="bg-red-100 text-red-800"
                />
                <p className="mt-1 text-xs text-brand-gray-500">You can select multiple reasons. At least one is recommended.</p>
            </div>
            <RequestStatusField value={formData.extra.requestStatus || 'Draft'} onChange={e => handleExtraChange('requestStatus', e.target.value, setFormData)} />
        </div>
    );
};

const NutritionOrderFields: React.FC<SpecificFieldsProps> = ({ formData, setFormData, carePlan }) => (
     <div className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-brand-gray-700">Diet Type</label>
            <select value={formData.extra.dietType || 'Low Sodium'} onChange={e => handleExtraChange('dietType', e.target.value, setFormData)} className={selectStyles}>
                <option>Low Sodium</option><option>Diabetic</option><option>Heart-Healthy</option>
            </select>
        </div>
         <div>
            <label className="block text-sm font-medium text-brand-gray-700">Supplement Type</label>
            <input type="text" value={formData.extra.supplementType || ''} onChange={e => handleExtraChange('supplementType', e.target.value, setFormData)} className={inputStyles} />
        </div>
        <div>
            <label className="block text-sm font-medium text-brand-gray-700">Feeding Instructions</label>
            <textarea value={formData.extra.instructions || ''} onChange={e => handleExtraChange('instructions', e.target.value, setFormData)} rows={2} className={textareaStyles}></textarea>
        </div>
        <div>
            <MultiSelectInput
                label="Performer"
                tooltip="Select who will perform this request. You can assign one or multiple performers."
                placeholder="Select performer (e.g., Dietitian)"
                data={careTeamMembers}
                items={formData.performer || []}
                onItemsChange={(items) => setFormData(p => ({...p, performer: items}))}
                chipColorClass="bg-orange-100 text-orange-800"
            />
        </div>
        <RequestStatusField value={formData.extra.requestStatus || 'Draft'} onChange={e => handleExtraChange('requestStatus', e.target.value, setFormData)} />
    </div>
);

const QuestionnaireFields: React.FC<SpecificFieldsProps> = ({ formData, setFormData, carePlan }) => (
    <div className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-brand-gray-700">Questionnaire Template</label>
            <select value={formData.extra.template || 'PHQ-9'} onChange={e => handleExtraChange('template', e.target.value, setFormData)} className={selectStyles}>
                <option>PHQ-9</option><option>GAD-7</option><option>MMAS-8</option>
            </select>
        </div>
        <div>
            <label className="block text-sm font-medium text-brand-gray-700">Delivery Method</label>
            <select value={formData.extra.delivery || 'App'} onChange={e => handleExtraChange('delivery', e.target.value, setFormData)} className={selectStyles}>
                <option>App</option><option>SMS</option><option>Email</option>
            </select>
        </div>
    </div>
);

const OtherFields: React.FC<SpecificFieldsProps> = ({ formData, setFormData, carePlan }) => (
    <div className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-brand-gray-700">Category</label>
            <input type="text" value={formData.extra.category || ''} onChange={e => handleExtraChange('category', e.target.value, setFormData)} placeholder="e.g., Custom, Ad-hoc" className={inputStyles} />
        </div>
        <div>
            <label className="block text-sm font-medium text-brand-gray-700">Owner</label>
             <select value={formData.owner || ''} onChange={e => setFormData(p => ({...p, owner: e.target.value as TaskOwner}))} className={selectStyles}>
                {internalUsers.map(user => <option key={user} value={user}>{user}</option>)}
            </select>
        </div>
        <div>
            <label className="block text-sm font-medium text-brand-gray-700">Description</label>
            <textarea value={formData.extra.description || ''} onChange={e => handleExtraChange('description', e.target.value, setFormData)} rows={3} className={textareaStyles}></textarea>
        </div>
    </div>
);


export const KindSpecificFields: React.FC<SpecificFieldsProps> = ({ formData, setFormData, carePlan }) => {
    const { kind } = formData;
    const details = kindDetails[kind];
    let content: React.ReactNode;

    switch (kind) {
        case 'Service Request': content = <ServiceRequestFields formData={formData} setFormData={setFormData} carePlan={carePlan} />; break;
        case 'Medication Request': content = <MedicationRequestFields formData={formData} setFormData={setFormData} carePlan={carePlan} />; break;
        case 'Task': content = <TaskFields formData={formData} setFormData={setFormData} carePlan={carePlan} />; break;
        case 'Communication': content = <CommunicationFields formData={formData} setFormData={setFormData} carePlan={carePlan} />; break;
        case 'Device Request': content = <DeviceRequestFields formData={formData} setFormData={setFormData} carePlan={carePlan} />; break;
        case 'Nutrition Order': content = <NutritionOrderFields formData={formData} setFormData={setFormData} carePlan={carePlan} />; break;
        case 'Questionnaire': content = <QuestionnaireFields formData={formData} setFormData={setFormData} carePlan={carePlan} />; break;
        case 'Other': content = <OtherFields formData={formData} setFormData={setFormData} carePlan={carePlan} />; break;
        default: content = <p className="text-sm text-center text-brand-gray-500 py-4">No specific configuration required for this task kind.</p>; break;
    }

    return (
        <div className="mt-4">
            {content}
            {details && (
                <Info>
                    <p><b>Acceptance:</b> {details.acceptance}</p>
                    <p className="mt-1"><b>Evidence:</b> {details.fhirResource}.status = '{details.fhirStatus}'</p>
                </Info>
            )}
        </div>
    );
};