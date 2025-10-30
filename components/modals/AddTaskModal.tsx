import React, { useState, useMemo, useEffect } from 'react';
import type { Task, TaskKind, TaskOwner, TaskPriority, TaskStatus, TaskTriggerEvent, TaskSchedule, TaskTriggerConfig, ReactiveFlow, CreateTaskActionDetails, SendMessageActionDetails, CarePlan } from '../../types';
import { XIcon } from '../icons/XIcon';
import { AiSparkleIcon } from '../icons/AiSparkleIcon';
import { kindDetails } from '../../data/taskDetails';
import { triggerEvents } from '../../data/triggerEvents';
import { SelectEventTriggerModal } from './SelectEventTriggerModal';
import { LinkIcon } from '../icons/LinkIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { LightningBoltIcon } from '../icons/LightningBoltIcon';
import { ConfigureReactiveOutcomesModal } from './ConfigureReactiveOutcomesModal';
import { KindSpecificFields } from '../shared/TaskFormFields';


interface AddTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Task) => void;
    goalId: string;
    linkedQms: string[];
    linkedTargets: string[];
    taskToEdit?: Task | null;
    carePlan: CarePlan;
}

const kindOptions: { value: TaskKind, label: string, color: string }[] = [
    { value: 'Communication', label: 'Communication', color: 'bg-blue-100 text-blue-800' },
    { value: 'Service Request', label: 'Service Request', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'Task', label: 'Task', color: 'bg-gray-100 text-gray-800' },
    { value: 'Device Request', label: 'Device Request', color: 'bg-cyan-100 text-cyan-800' },
    { value: 'Nutrition Order', label: 'Nutrition Order', color: 'bg-orange-100 text-orange-800' },
    { value: 'Medication Request', label: 'Medication Request', color: 'bg-red-100 text-red-800' },
    { value: 'Questionnaire', label: 'Questionnaire', color: 'bg-purple-100 text-purple-800' },
    { value: 'Other', label: 'Other', color: 'bg-gray-100 text-gray-800' },
];

const getInitialFormState = (taskToEdit: Task | null | undefined): Omit<Task, 'id' | 'goalId' | 'fhirEvidence'> => {
    const initialKind = taskToEdit?.kind || 'Communication';
    const requestKinds = ['Service Request', 'Device Request', 'Medication Request', 'Nutrition Order'];
    const isRequestKind = requestKinds.includes(initialKind);

    let initialExtra = taskToEdit?.extra ? JSON.parse(JSON.stringify(taskToEdit.extra)) : {};

    if (isRequestKind) {
        // Migrate old rxStatus from MedicationRequest
        if (initialExtra.rxStatus) {
            switch (initialExtra.rxStatus) {
                case 'Pending':
                case 'Active':
                    initialExtra.requestStatus = 'Ordered';
                    break;
                case 'Completed':
                    initialExtra.requestStatus = 'Completed';
                    break;
                default:
                    initialExtra.requestStatus = 'Draft';
            }
            delete initialExtra.rxStatus;
        }

        const validStatuses = ['Draft', 'Ordered', 'On hold', 'Completed', 'Cancelled'];
        // If status is invalid (from an older version) or missing, set a default.
        if (!initialExtra.requestStatus || !validStatuses.includes(initialExtra.requestStatus)) {
            // Default to 'Ordered' for existing tasks with invalid/missing status, 'Draft' for new tasks.
            initialExtra.requestStatus = taskToEdit ? 'Ordered' : 'Draft';
        }
    }
    
    const baseState = {
        title: taskToEdit?.title || '',
        owner: taskToEdit?.owner || 'Care Manager',
        performer: taskToEdit?.performer || [],
        dueDate: taskToEdit?.dueDate || new Date().toISOString().split('T')[0],
        priority: taskToEdit?.priority || 'Medium',
        status: taskToEdit?.status || 'Pending',
        kind: taskToEdit?.kind || 'Communication',
        linkedQM: taskToEdit?.linkedQM || [],
        linkedTarget: taskToEdit?.linkedTarget || '',
        acceptanceCriteria: taskToEdit?.acceptanceCriteria || kindDetails['Communication'].acceptance,
        autoComplete: taskToEdit?.autoComplete ?? true,
        extra: initialExtra,
        source: taskToEdit?.source || 'Manual',
        startTriggers: taskToEdit?.startTriggers || [],
        schedule: taskToEdit?.schedule || null,
        triggerConfig: taskToEdit?.triggerConfig || null,
        reactiveFlows: taskToEdit?.reactiveFlows || [],
    };

    if ((!baseState.startTriggers || baseState.startTriggers.length === 0) && !baseState.schedule) {
        baseState.schedule = { frequency: 1, period: 1, unit: 'days', startDate: new Date().toISOString() };
    }
    
    return baseState;
};

const baseInputStyles = "mt-1 block w-full border border-brand-gray-300 text-brand-gray-900 shadow-sm sm:text-sm rounded-md focus:ring-1 focus:ring-brand-blue focus:border-brand-blue disabled:bg-brand-gray-100 disabled:text-brand-gray-500";
const inputStyles = `${baseInputStyles} h-10 px-3 py-2 bg-white`;
const selectStyles = `${baseInputStyles} h-10 pl-3 pr-10 py-2 bg-white`;
const textareaStyles = `${baseInputStyles} px-3 py-2 bg-white`;
const checkboxStyles = "focus:ring-brand-blue h-4 w-4 bg-white text-brand-blue border-gray-300 rounded focus:ring-2";


export const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onSave, goalId, linkedQms, linkedTargets, taskToEdit, carePlan }) => {
    const [formData, setFormData] = useState(getInitialFormState(taskToEdit));
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isReactiveOutcomesModalOpen, setIsReactiveOutcomesModalOpen] = useState(false);
    const isEditMode = !!taskToEdit;
    const [triggerType, setTriggerType] = useState<'event' | 'schedule'>('schedule');

    useEffect(() => {
        if(isOpen) {
            const initialState = getInitialFormState(taskToEdit);
            setFormData(initialState);
            setTriggerType((initialState.startTriggers && initialState.startTriggers.length > 0) ? 'event' : 'schedule');
        }
    }, [isOpen, taskToEdit]);

    const handleTriggersConfirm = (triggers: TaskTriggerEvent[]) => {
        setFormData(prev => ({
            ...prev,
            startTriggers: triggers,
            schedule: triggers.length > 0 ? null : prev.schedule || { frequency: 1, period: 1, unit: 'days', startDate: new Date().toISOString() }
        }));
    };
    
    const handleRemoveTrigger = (triggerId: TaskTriggerEvent) => {
        const newTriggers = formData.startTriggers?.filter(t => t !== triggerId) || [];
        setFormData(prev => ({
            ...prev,
            startTriggers: newTriggers,
        }));
         if (newTriggers.length === 0) {
            setTriggerType('schedule');
        }
    };

    const handleRemoveOutcomeFlow = (flowId: string) => {
        setFormData(prev => ({
            ...prev,
            reactiveFlows: prev.reactiveFlows?.filter(f => f.id !== flowId) || []
        }));
    };

    const handleKindChange = (newKind: TaskKind) => {
        setFormData(prev => {
            const isRequestKind = ['Service Request', 'Device Request', 'Medication Request', 'Nutrition Order'].includes(newKind);
            const newExtra: any = {};
            if (isRequestKind) {
                newExtra.requestStatus = 'Draft';
            }
            return {
                ...prev,
                kind: newKind,
                acceptanceCriteria: kindDetails[newKind].acceptance,
                extra: newExtra, // Reset extra fields when kind changes
                owner: newKind === 'Task' || newKind === 'Communication' || newKind === 'Other' ? prev.owner || 'Care Manager' : undefined,
                performer: newKind === 'Service Request' || newKind === 'Device Request' || newKind === 'Nutrition Order' || newKind === 'Medication Request' ? prev.performer || [] : [],
            };
        });
    };
    
    const handleAutoFill = () => {
        const mockData: { [key in TaskKind]?: Partial<typeof formData> } = {
            Communication: { title: "Follow-up call with patient", extra: { mode: "Phone", recipient: "Patient" } },
            'Device Request': { title: "Ship replacement BP cuff", extra: { deviceType: 'BP Monitor', deliveryStatus: 'Ordered' } }
        };
        const mock = mockData[formData.kind];
        if (mock) {
            setFormData(prev => ({ ...prev, ...mock }));
        } else {
            alert(`No AI suggestion available for "${formData.kind}".`);
        }
    };

    const handleSave = () => {
        if (!formData.title) {
            alert("Title is a required field.");
            return;
        }
        
        if (formData.kind === 'Service Request' && !formData.extra.category) {
            alert("Category is a required field for Service Requests.");
            return;
        }

        if (formData.kind === 'Service Request' && formData.extra.category === 'Observation' && !formData.extra.observationCode) {
            alert("Observation Type (LOINC) is required when category is Observation.");
            return;
        }

        const details = kindDetails[formData.kind];
        const taskToSave: Task = {
            id: isEditMode ? taskToEdit.id : `task-${Date.now()}`,
            goalId,
            ...formData,
            fhirEvidence: {
                resource: details.fhirResource,
                status: details.fhirStatus,
            },
        };
        onSave(taskToSave);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl w-[90%] max-h-[90vh] flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-brand-gray-900">{isEditMode ? 'Edit Task' : 'Create New Task'}</h2>
                        <button onClick={onClose} className="text-brand-gray-400 hover:text-brand-gray-600"><XIcon className="w-6 h-6" /></button>
                    </div>

                    <div className="p-6 flex-grow overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Column: Common Fields */}
                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-brand-gray-700">Task Kind</label>
                                <select onChange={(e) => handleKindChange(e.target.value as TaskKind)} value={formData.kind} className={selectStyles}>
                                    {kindOptions.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-gray-700">Title <span className="text-brand-red">*</span></label>
                                <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className={inputStyles} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-700">Subject</label>
                                    <input type="text" value="Patient" readOnly className={`${inputStyles} bg-brand-gray-100`} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-700">Status</label>
                                    <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as TaskStatus})} className={selectStyles}>
                                        <option>Pending</option><option>In progress</option><option>Completed</option><option>Skipped</option><option>Cancelled</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-700">Due Date</label>
                                    <input type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className={inputStyles} />
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-brand-gray-700">Priority</label>
                                    <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value as TaskPriority})} className={selectStyles}>
                                        <option>High</option><option>Medium</option><option>Low</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-gray-700">Acceptance Criteria</label>
                                <textarea value={formData.acceptanceCriteria} onChange={(e) => setFormData({...formData, acceptanceCriteria: e.target.value})} rows={2} className={textareaStyles}></textarea>
                            </div>
                            <div className="relative flex items-start">
                                <div className="flex items-center h-5"><input id="autoComplete" type="checkbox" checked={formData.autoComplete} onChange={(e) => setFormData({...formData, autoComplete: e.target.checked})} className={checkboxStyles}/></div>
                                <div className="ml-3 text-sm"><label htmlFor="autoComplete" className="font-medium text-brand-gray-700">Auto-complete task when evidence matches</label></div>
                            </div>
                            
                           <div className="p-4 border-2 border-dashed rounded-lg bg-white hover:bg-violet-50 hover:border-violet-400">
                                <h3 className="font-semibold text-brand-gray-800 flex items-center gap-2"><LightningBoltIcon className="w-5 h-5 text-violet-500" /> Start Triggers & Schedule</h3>
                                <div className="mt-2 space-y-2">
                                    <p className="text-xs text-brand-gray-500">Define what starts this task. A task can be triggered by events OR follow a schedule, but not both.</p>

                                    {/* Event Triggers */}
                                    <div>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="trigger-type"
                                                checked={triggerType === 'event'}
                                                onChange={() => {
                                                    setTriggerType('event');
                                                    setFormData(prev => ({ ...prev, schedule: null }));
                                                }}
                                            />
                                            <span className="text-sm font-medium text-brand-gray-700">Triggered by an event</span>
                                        </label>
                                        {triggerType === 'event' && (
                                            <div className="pl-6 mt-2 space-y-2">
                                                {formData.startTriggers && formData.startTriggers.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {formData.startTriggers.map(triggerId => {
                                                            const trigger = triggerEvents.find(t => t.id === triggerId);
                                                            return (
                                                                <span key={triggerId} className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full bg-violet-100 text-violet-800">
                                                                    <LightningBoltIcon className="w-3 h-3"/>
                                                                    {trigger?.label || triggerId}
                                                                    <button onClick={() => handleRemoveTrigger(triggerId)} className="text-violet-500 hover:text-violet-700"><XIcon className="w-3 h-3"/></button>
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                <div className="mt-2">
                                                    <button type="button" onClick={() => setIsEventModalOpen(true)} className="w-full h-9 flex items-center justify-center gap-2 border border-dashed border-brand-gray-400 rounded-md text-sm font-semibold text-brand-gray-600 hover:bg-brand-gray-50">
                                                        <PlusIcon className="w-4 h-4"/>
                                                        Add Start Triggers
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Schedule */}
                                    <div>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="trigger-type"
                                                checked={triggerType === 'schedule'}
                                                onChange={() => {
                                                    setTriggerType('schedule');
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        startTriggers: [],
                                                        schedule: prev.schedule || { frequency: 1, period: 1, unit: 'days', startDate: new Date().toISOString() },
                                                    }));
                                                }}
                                            />
                                            <span className="text-sm font-medium text-brand-gray-700">On a recurring schedule</span>
                                        </label>
                                        {triggerType === 'schedule' && formData.schedule && (
                                            <div className="pl-6 mt-2 grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex-shrink-0">Repeat</span>
                                                    <input type="number" min="1" value={formData.schedule.frequency} onChange={e => setFormData(p => ({ ...p, schedule: { ...p.schedule!, frequency: parseInt(e.target.value) || 1 } }))} className={`${inputStyles} h-9 w-full`} />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="whitespace-nowrap flex-shrink-0">time(s) every</span>
                                                    <input type="number" min="1" value={formData.schedule.period} onChange={e => setFormData(p => ({ ...p, schedule: { ...p.schedule!, period: parseInt(e.target.value) || 1 } }))} className={`${inputStyles} h-9 w-full`} />
                                                </div>
                                                <div>
                                                    <select value={formData.schedule.unit} onChange={e => setFormData(p => ({ ...p, schedule: { ...p.schedule!, unit: e.target.value as 'days' | 'weeks' | 'months' } }))} className={`${selectStyles} h-9 w-full`}>
                                                        <option value="days">Days</option>
                                                        <option value="weeks">Weeks</option>
                                                        <option value="months">Months</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-brand-gray-500">starting on</label>
                                                    <input type="date" value={formData.schedule.startDate.split('T')[0]} onChange={e => setFormData(p => ({ ...p, schedule: { ...p.schedule!, startDate: e.target.value } }))} className={`${inputStyles} h-9 w-full`} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Kind-Specific Fields & Triggers */}
                        <div className="space-y-4">
                           <div className="p-4 bg-brand-gray-50 rounded-lg border border-brand-gray-200">
                                <h3 className="font-semibold text-brand-gray-800">Specific Fields</h3>
                                <KindSpecificFields 
                                    formData={formData}
                                    setFormData={setFormData}
                                    carePlan={carePlan}
                                />
                            </div>
                            <div className="p-4 border-2 border-dashed rounded-lg bg-white hover:bg-violet-50 hover:border-violet-400">
                                <h3 className="font-semibold text-brand-gray-800 flex items-center gap-2"><LightningBoltIcon className="w-5 h-5 text-violet-500" /> Outcome Triggers</h3>
                                <p className="text-xs text-brand-gray-500 mt-1">Define follow-up actions triggered after task results.</p>
                                
                                {formData.reactiveFlows && formData.reactiveFlows.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                        <div className="flex flex-wrap gap-2">
                                            {formData.reactiveFlows.map(flow => {
                                                const trigger = triggerEvents.find(t => t.id === flow.trigger.id);
                                                const label = trigger ? `On ${trigger.label}` : `On ${flow.trigger.id}`;
                                                const actionCount = flow.actions.length;
                                                return (
                                                    <span key={flow.id} className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full bg-violet-100 text-violet-800">
                                                        <LightningBoltIcon className="w-3 h-3"/>
                                                        {label} ({actionCount} action{actionCount !== 1 ? 's' : ''})
                                                        <button onClick={() => handleRemoveOutcomeFlow(flow.id)} className="text-violet-500 hover:text-violet-700"><XIcon className="w-3 h-3"/></button>
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                                <div className="mt-2">
                                    <button onClick={() => setIsReactiveOutcomesModalOpen(true)} className="w-full h-9 flex items-center justify-center gap-2 border border-dashed border-brand-gray-400 rounded-md text-sm font-semibold text-brand-gray-600 hover:bg-brand-gray-50">
                                        <PlusIcon className="w-4 h-4"/>
                                        {formData.reactiveFlows && formData.reactiveFlows.length > 0 ? 'Edit Outcome Triggers' : 'Add Outcome Trigger'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t bg-brand-gray-50 flex justify-between items-center">
                        <button onClick={handleAutoFill} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600">
                            <AiSparkleIcon className="w-5 h-5" /> Auto-fill with AI
                        </button>
                        <div className="flex gap-3">
                            <button onClick={onClose} className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600">{isEditMode ? 'Save Changes' : 'Save Task'}</button>
                        </div>
                    </div>
                </div>
            </div>
            <SelectEventTriggerModal
                isOpen={isEventModalOpen}
                onClose={() => setIsEventModalOpen(false)}
                onConfirm={(payload) => handleTriggersConfirm(payload.events)}
                currentTriggers={formData.startTriggers || []}
                context="global"
                zIndex={60}
            />
            <ConfigureReactiveOutcomesModal
                isOpen={isReactiveOutcomesModalOpen}
                onClose={() => setIsReactiveOutcomesModalOpen(false)}
                reactiveFlows={formData.reactiveFlows || []}
                taskKind={formData.kind}
                onUpdate={(newFlows) => {
                    setFormData(prev => ({ ...prev, reactiveFlows: newFlows }));
                }}
                onSaveAndClose={(newFlows) => {
                    setFormData(prev => ({ ...prev, reactiveFlows: newFlows }));
                    setIsReactiveOutcomesModalOpen(false);
                }}
                zIndex={60}
            />
        </>
    );
};
