import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Goal, Task, TaskKind, TaskOwner, TaskPriority, TaskStatus, TaskTriggerEvent, TaskSchedule, ReactiveFlow, CreateTaskActionDetails, SendMessageActionDetails, CarePlan } from '../../types';
import { getAiTaskProposals } from '../../services/geminiService';
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


interface AiTaskProposalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (tasks: Task[]) => void;
    goal: Goal;
    carePlan: CarePlan;
}

const kindColors: { [key: string]: { chip: string, text: string } } = {
    Communication: { chip: 'bg-blue-100', text: 'text-blue-800' },
    'Service Request': { chip: 'bg-indigo-100', text: 'text-indigo-800' },
    Task: { chip: 'bg-gray-100', text: 'text-gray-800' },
    'Device Request': { chip: 'bg-cyan-100', text: 'text-cyan-800' },
    'Nutrition Order': { chip: 'bg-orange-100', text: 'text-orange-800' },
    'Medication Request': { chip: 'bg-red-100', text: 'text-red-800' },
    Questionnaire: { chip: 'bg-purple-100', text: 'text-purple-800' },
    Other: { chip: 'bg-gray-200', text: 'text-gray-900' },
};

const baseInputStyles = "mt-1 block w-full border border-brand-gray-300 text-brand-gray-900 shadow-sm sm:text-sm rounded-md focus:ring-1 focus:ring-brand-blue focus:border-brand-blue disabled:bg-brand-gray-100 disabled:text-brand-gray-500";
const inputStyles = `${baseInputStyles} h-10 px-3 py-2 bg-white`;
const selectStyles = `${baseInputStyles} h-10 pl-3 pr-10 py-2 bg-white`;
const textareaStyles = `${baseInputStyles} px-3 py-2 bg-white`;
const checkboxStyles = "focus:ring-brand-blue h-4 w-4 bg-white text-brand-blue border-gray-300 rounded focus:ring-2";


const ProposalEditor: React.FC<{ proposal: Task, onUpdate: (updated: Task) => void, carePlan: CarePlan }> = ({ proposal, onUpdate, carePlan }) => {
    const [isReactiveOutcomesModalOpen, setIsReactiveOutcomesModalOpen] = useState(false);

    const handleRemoveOutcomeFlow = (flowId: string) => {
        onUpdate({
            ...proposal,
            reactiveFlows: proposal.reactiveFlows?.filter(f => f.id !== flowId) || []
        });
    };
    
    const setFormData = (updater: (prev: Task) => Task) => {
        onUpdate(updater(proposal));
    };

    const handleKindChange = (newKind: TaskKind) => {
        const isRequestKind = ['Service Request', 'Device Request', 'Medication Request', 'Nutrition Order'].includes(newKind);
        const newExtra: any = {};
        if (isRequestKind) {
            newExtra.requestStatus = 'Draft';
        }

        onUpdate({
            ...proposal,
            kind: newKind,
            acceptanceCriteria: kindDetails[newKind].acceptance,
            extra: newExtra, // Reset extra fields when kind changes
            owner: newKind === 'Task' || newKind === 'Communication' || newKind === 'Other' ? proposal.owner || 'Care Manager' : undefined,
            performer: newKind === 'Service Request' || newKind === 'Device Request' || newKind === 'Nutrition Order' || newKind === 'Medication Request' ? proposal.performer || [] : [],
        });
    };


    return (
        <>
            <div className="space-y-4 p-1">
                <h3 className="font-semibold text-brand-gray-900">Edit Suggestion</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-brand-gray-700">Task Kind</label>
                            <select value={proposal.kind} onChange={(e) => handleKindChange(e.target.value as TaskKind)} className={selectStyles}>
                                {Object.keys(kindDetails).map(kind => <option key={kind} value={kind}>{kind}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-brand-gray-700">Title</label>
                            <input type="text" value={proposal.title} onChange={(e) => onUpdate({ ...proposal, title: e.target.value })} className={inputStyles} required />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-brand-gray-700">Subject</label>
                             <input type="text" value="Patient" readOnly className={`${inputStyles} bg-brand-gray-100`} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-brand-gray-700">Due Date</label>
                                <input type="date" value={proposal.dueDate} onChange={(e) => onUpdate({ ...proposal, dueDate: e.target.value })} className={inputStyles} />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-brand-gray-700">Priority</label>
                                <select value={proposal.priority} onChange={(e) => onUpdate({ ...proposal, priority: e.target.value as TaskPriority })} className={selectStyles}>
                                    <option>High</option><option>Medium</option><option>Low</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-brand-gray-700">Status</label>
                            <select value={proposal.status} onChange={(e) => onUpdate({ ...proposal, status: e.target.value as TaskStatus })} className={selectStyles}>
                                <option>Pending</option><option>In progress</option><option>Completed</option><option>Skipped</option><option>Cancelled</option>
                            </select>
                        </div>
                         <div>
                            <label className="text-sm font-medium text-brand-gray-700">Acceptance Criteria</label>
                            <textarea value={proposal.acceptanceCriteria} onChange={(e) => onUpdate({ ...proposal, acceptanceCriteria: e.target.value })} rows={2} className={textareaStyles} />
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                        <div className="p-4 bg-brand-gray-50 rounded-lg border border-brand-gray-200">
                             <h3 className="font-semibold text-brand-gray-800">Specific Fields</h3>
                             <KindSpecificFields 
                                 formData={proposal}
                                 setFormData={setFormData as any}
                                 carePlan={carePlan}
                             />
                        </div>

                        <div className="p-4 border-2 border-dashed rounded-lg bg-white hover:bg-violet-50 hover:border-violet-400">
                            <h3 className="font-semibold text-brand-gray-800 flex items-center gap-2"><LightningBoltIcon className="w-5 h-5 text-violet-500" /> Outcome Triggers</h3>
                            <p className="text-xs text-brand-gray-500 mt-1">Define follow-up actions triggered after task results.</p>
                            
                            {proposal.reactiveFlows && proposal.reactiveFlows.length > 0 && (
                                <div className="mt-2 space-y-2">
                                    <div className="flex flex-wrap gap-2">
                                        {proposal.reactiveFlows.map(flow => {
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
                                    {proposal.reactiveFlows && proposal.reactiveFlows.length > 0 ? 'Edit Outcome Triggers' : 'Add Outcome Trigger'}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="mt-4 p-3 bg-brand-gray-100 rounded-md text-sm">
                    <p><strong>Evidence for Auto-Complete:</strong> {proposal.fhirEvidence.resource}.status = '{proposal.fhirEvidence.status}'</p>
                </div>
            </div>
             <ConfigureReactiveOutcomesModal
                isOpen={isReactiveOutcomesModalOpen}
                onClose={() => setIsReactiveOutcomesModalOpen(false)}
                reactiveFlows={proposal.reactiveFlows || []}
                taskKind={proposal.kind}
                onUpdate={(newFlows) => {
                    onUpdate({ ...proposal, reactiveFlows: newFlows });
                }}
                onSaveAndClose={(newFlows) => {
                    onUpdate({ ...proposal, reactiveFlows: newFlows });
                    setIsReactiveOutcomesModalOpen(false);
                }}
                zIndex={60}
            />
        </>
    );
};


export const AiTaskProposalModal: React.FC<AiTaskProposalModalProps> = ({ isOpen, onClose, onSave, goal, carePlan }) => {
    const [proposals, setProposals] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedProposalIds, setSelectedProposalIds] = useState<Set<string>>(new Set());
    const [activeProposalId, setActiveProposalId] = useState<string | null>(null);

    const fetchProposals = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedProposals = await getAiTaskProposals(goal);
            const fullTasks: Task[] = fetchedProposals.map((p, index) => {
                const kind = p.kind || 'Other';
                const isRequestKind = ['Service Request', 'Device Request', 'Medication Request', 'Nutrition Order'].includes(kind);
                const details = kindDetails[kind];
                const extra = p.extra || {};
                if (isRequestKind) {
                    extra.requestStatus = 'Draft';
                }

                return {
                    id: `ai-prop-${Date.now()}-${index}`,
                    goalId: goal.id,
                    status: 'Pending' as TaskStatus,
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default due in 7 days
                    autoComplete: true,
                    ...p,
                    startTriggers: p.startTriggers || [],
                    schedule: p.startTriggers && p.startTriggers.length > 0 ? null : { frequency: 1, period: 1, unit: 'days', startDate: new Date().toISOString() },
                    triggerConfig: null,
                    kind: kind,
                    acceptanceCriteria: p.acceptanceCriteria || details.acceptance,
                    fhirEvidence: {
                        resource: details.fhirResource,
                        status: details.fhirStatus
                    },
                    source: 'AI',
                    reactiveFlows: [],
                    extra: extra,
                    performer: [],
                } as Task;
            });

            setProposals(fullTasks);
            const allIds = new Set(fullTasks.map(p => p.id));
            setSelectedProposalIds(allIds);
            setActiveProposalId(fullTasks[0]?.id || null);
        } catch (error) {
            console.error("Failed to fetch AI task proposals:", error);
            alert("Could not fetch AI suggestions.");
        } finally {
            setIsLoading(false);
        }
    }, [goal]);

    useEffect(() => {
        if (isOpen) {
            fetchProposals();
        } else {
            setProposals([]);
            setSelectedProposalIds(new Set());
            setActiveProposalId(null);
        }
    }, [isOpen, fetchProposals]);

    const handleToggleSelection = (proposalId: string) => {
        const newSelection = new Set(selectedProposalIds);
        if (newSelection.has(proposalId)) {
            newSelection.delete(proposalId);
        } else {
            newSelection.add(proposalId);
        }
        setSelectedProposalIds(newSelection);
    };
    
    const handleUpdateProposal = (updatedProposal: Task) => {
        setProposals(prev => prev.map(p => p.id === updatedProposal.id ? updatedProposal : p));
    };

    const handleSaveSelected = () => {
        const selectedTasks = proposals.filter(p => selectedProposalIds.has(p.id));
        onSave(selectedTasks);
        onClose();
    };

    const activeProposal = proposals.find(p => p.id === activeProposalId);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <AiSparkleIcon className="w-6 h-6 text-brand-blue" />
                        <div>
                            <h2 className="text-xl font-semibold text-brand-gray-900">AI-Suggested Tasks for: <span className="text-brand-blue">{goal.title}</span></h2>
                            <p className="text-sm text-brand-gray-500">Review, edit, and select tasks to add to the care plan.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-brand-gray-400 hover:text-brand-gray-600"><XIcon className="w-6 h-6" /></button>
                </div>

                <div className="flex-grow overflow-hidden grid grid-cols-12">
                    {/* Left Pane: Suggestions List */}
                    <div className="col-span-5 bg-brand-gray-50 overflow-y-auto p-4 border-r">
                        {isLoading ? (
                             <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                                <p className="ml-3 text-sm text-brand-gray-600">Gemini is generating tasks...</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {proposals.map(p => (
                                     <div key={p.id} onClick={() => setActiveProposalId(p.id)}
                                         className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${activeProposalId === p.id ? 'bg-white border-brand-blue shadow' : 'bg-white border-transparent hover:border-brand-gray-300'}`}>
                                         <div className="flex items-start gap-3">
                                            <input type="checkbox" checked={selectedProposalIds.has(p.id)} onChange={() => handleToggleSelection(p.id)} className="mt-1 h-4 w-4 bg-white text-brand-blue border-gray-300 rounded focus:ring-brand-blue focus:ring-2"/>
                                            <div className="flex-1">
                                                <p className="font-semibold text-brand-gray-800">{p.title}</p>
                                                <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full ${kindColors[p.kind]?.chip} ${kindColors[p.kind]?.text}`}>{p.kind}</span>
                                                <p className="text-sm text-brand-gray-500 mt-1">Priority: {p.priority}</p>
                                                {p.linkedQM && p.linkedQM[0] && <span className="mt-2 inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-md">Linked to {p.linkedQM[0]}</span>}
                                            </div>
                                         </div>
                                     </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Pane: Editor */}
                    <div className="col-span-7 overflow-y-auto p-6">
                        {activeProposal ? (
                            <ProposalEditor proposal={activeProposal} onUpdate={handleUpdateProposal} carePlan={carePlan} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-brand-gray-500">
                                <p>Select a suggestion to view or edit details.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t bg-brand-gray-50 flex justify-between items-center">
                    <p className="text-sm font-semibold text-brand-gray-700">{selectedProposalIds.size} of {proposals.length} tasks selected</p>
                     <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">Cancel</button>
                        <button onClick={handleSaveSelected} disabled={selectedProposalIds.size === 0} className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600 disabled:opacity-50">
                            Add Selected Tasks
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};