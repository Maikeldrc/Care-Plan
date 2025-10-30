import React, { useState, useEffect, useCallback } from 'react';
import type { CarePlan, Goal, GoalMetric, TargetValue } from '../../types';
import { getAiGoalProposals } from '../../services/geminiService';
import { XIcon } from '../icons/XIcon';
import { AiSparkleIcon } from '../icons/AiSparkleIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { metricDefinitions } from '../../data/metricDefinitions';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';

interface AiGoalProposalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (goals: Goal[]) => void;
    carePlan: CarePlan;
}

const baseInputStyles = "mt-1 block w-full border border-brand-gray-300 text-brand-gray-900 shadow-sm sm:text-sm rounded-md focus:ring-1 focus:ring-brand-blue focus:border-brand-blue disabled:bg-brand-gray-100 disabled:text-brand-gray-500";
const inputStyles = `${baseInputStyles} h-10 px-3 py-2 bg-white`;
const selectStyles = `${baseInputStyles} h-10 pl-3 pr-10 py-2 bg-white`;
const textareaStyles = `${baseInputStyles} px-3 py-2 bg-white`;

const StructuredTargetInput: React.FC<{ metric: GoalMetric, onUpdate: (updatedTarget: TargetValue) => void }> = ({ metric, onUpdate }) => {
    const target = metric.target;
    const handleUpdate = (field: keyof TargetValue, value: any) => {
        onUpdate({ ...target, [field]: value });
    };

    return (
        <div className="flex items-center gap-1.5">
            <select
                value={target.operator}
                onChange={e => handleUpdate('operator', e.target.value)}
                className="h-10 px-2 py-1 bg-white border border-brand-gray-300 text-brand-gray-900 sm:text-sm rounded-md focus:ring-1 focus:ring-brand-blue focus:border-brand-blue"
            >
                <option value="<">&lt;</option>
                <option value="<=">&le;</option>
                <option value=">">&gt;</option>
                <option value=">=">&ge;</option>
                <option value="=">=</option>
                <option value="range">Range</option>
            </select>
            {target.operator === 'range' ? (
                <>
                    <input type="number" value={target.value_min ?? ''} onChange={e => handleUpdate('value_min', e.target.value === '' ? null : parseFloat(e.target.value))} className="w-full h-10 pl-3 pr-1 py-2 bg-white border-brand-gray-300 border rounded-md" />
                    <span className="text-brand-gray-500">-</span>
                    <input type="number" value={target.value_max ?? ''} onChange={e => handleUpdate('value_max', e.target.value === '' ? null : parseFloat(e.target.value))} className="w-full h-10 pl-3 pr-1 py-2 bg-white border-brand-gray-300 border rounded-md" />
                </>
            ) : (
                <input
                    type="number"
                    value={(target.operator === '>' || target.operator === '>=') ? target.value_min ?? '' : target.value_max ?? ''}
                    onChange={e => {
                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                        if (target.operator === '>' || target.operator === '>=') {
                            onUpdate({ ...target, value_min: val, value_max: null });
                        } else {
                            onUpdate({ ...target, value_max: val, value_min: null });
                        }
                    }}
                    className="w-full h-10 pl-3 pr-1 py-2 bg-white border-brand-gray-300 border rounded-md"
                />
            )}
            {metric.unit && <span className="text-sm text-gray-500 font-semibold">{metric.unit}</span>}
        </div>
    );
};

const ProposalEditor: React.FC<{ proposal: Goal, onUpdate: (updated: Goal) => void, carePlan: CarePlan }> = ({ proposal, onUpdate, carePlan }) => {
    
    const handleMetricChange = (index: number, field: keyof GoalMetric, value: any) => {
        const newMetrics = [...proposal.metrics];
        const metricToUpdate = { ...newMetrics[index], [field]: value };
        
        if (field === 'name') {
            const definition = metricDefinitions.find(def => def.name === value);
            metricToUpdate.unit = definition?.unit || '';
            metricToUpdate.referenceRange = definition?.referenceRange || '';
        }
        newMetrics[index] = metricToUpdate;
        onUpdate({ ...proposal, metrics: newMetrics });
    };

    const addMetric = () => {
        const newMetric: GoalMetric = {
            name: 'Systolic BP',
            target: { operator: '<', value_min: null, value_max: 130 },
            unit: 'mmHg',
            referenceRange: 'Normal: < 130 mmHg',
            source: 'Manual',
        };
        onUpdate({ ...proposal, metrics: [...proposal.metrics, newMetric] });
    };
    
    const removeMetric = (index: number) => {
        onUpdate({ ...proposal, metrics: proposal.metrics.filter((_, i) => i !== index) });
    };

    const handleDiagnosisToggle = (dx: string) => {
        const newDiagnoses = new Set(proposal.diagnoses);
        if(newDiagnoses.has(dx)) newDiagnoses.delete(dx);
        else newDiagnoses.add(dx);
        onUpdate({ ...proposal, diagnoses: Array.from(newDiagnoses) });
    };

    return (
        <div className="space-y-6 p-1">
            <h3 className="font-semibold text-lg text-brand-gray-900">Edit Suggestion</h3>
            <div>
                <label className="text-sm font-medium text-brand-gray-700">Title</label>
                <input type="text" value={proposal.title} onChange={(e) => onUpdate({ ...proposal, title: e.target.value })} className={inputStyles}/>
            </div>
            <div>
                <label className="text-sm font-medium text-brand-gray-700">Description</label>
                <textarea value={proposal.description} onChange={(e) => onUpdate({ ...proposal, description: e.target.value })} rows={3} className={textareaStyles}></textarea>
            </div>
            <div className="grid grid-cols-3 gap-4">
                 <div>
                    <label className="text-sm font-medium text-brand-gray-700">Start Date</label>
                    <input type="date" value={proposal.startDate} onChange={(e) => onUpdate({ ...proposal, startDate: e.target.value })} className={inputStyles} />
                </div>
                 <div>
                    <label className="text-sm font-medium text-brand-gray-700">Target Date</label>
                    <input type="date" value={proposal.targetDate} onChange={(e) => onUpdate({ ...proposal, targetDate: e.target.value })} className={inputStyles} />
                </div>
                 <div>
                    <label className="text-sm font-medium text-brand-gray-700">Priority</label>
                    <select value={proposal.priority} onChange={(e) => onUpdate({...proposal, priority: e.target.value as any})} className={selectStyles}>
                        <option>High</option><option>Medium</option><option>Low</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-brand-gray-700">Link to Primary Diagnoses</label>
                <div className="mt-2 flex flex-wrap gap-2">
                   {carePlan.diagnoses.primary.map(dx => (
                        <button key={dx} onClick={() => handleDiagnosisToggle(dx)} className={`px-3 py-1 text-sm rounded-full border ${proposal.diagnoses.includes(dx) ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                            {dx}
                        </button>
                   ))}
                </div>
            </div>
            
            <div className="space-y-4 p-4 border border-brand-gray-200 rounded-lg bg-brand-gray-50">
                <h3 className="font-semibold text-brand-gray-800">Metrics & Targets</h3>
                {proposal.metrics.map((metric, index) => (
                     <div key={index} className="p-3 bg-white rounded-md border border-brand-gray-200">
                        <div className="grid grid-cols-12 gap-3 items-end">
                            <div className="col-span-5">
                                <label className="block text-xs font-medium text-brand-gray-600">Metric Name</label>
                                <select value={metric.name} onChange={(e) => handleMetricChange(index, 'name', e.target.value)} className={selectStyles}>
                                    <option value="">Select Metric</option>
                                    {metricDefinitions.map(def => <option key={def.name} value={def.name}>{def.name}</option>)}
                                </select>
                            </div>
                            <div className="col-span-6">
                                <label className="block text-xs font-medium text-brand-gray-600">Target Value</label>
                                <StructuredTargetInput metric={metric} onUpdate={(newTarget) => handleMetricChange(index, 'target', newTarget)} />
                            </div>
                            <div className="col-span-1">
                                <button onClick={() => removeMetric(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        {metric.referenceRange && <p className="text-xs text-brand-gray-500 mt-1 pl-1">Reference: {metric.referenceRange}</p>}
                     </div>
                ))}
                <button onClick={addMetric} className="flex items-center gap-2 px-3 py-1.5 border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-100">
                    <PlusIcon className="w-4 h-4" /> Add Metric
                </button>
            </div>
             <div>
                <label className="block text-sm font-medium text-brand-gray-700">Quality Measures</label>
                <div className="mt-2 flex flex-wrap gap-2">
                    {proposal.qualityMeasures.map(qm => (
                        <span key={qm} className="px-3 py-1.5 text-sm font-medium rounded-full bg-green-100 text-green-800">{qm}</span>
                    ))}
                </div>
            </div>
        </div>
    );
};


export const AiGoalProposalModal: React.FC<AiGoalProposalModalProps> = ({ isOpen, onClose, onSave, carePlan }) => {
    const [proposalGroups, setProposalGroups] = useState<{ condition: string; goals: Goal[] }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedProposalIds, setSelectedProposalIds] = useState<Set<string>>(new Set());
    const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
    const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

    const fetchProposals = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedGroups = await getAiGoalProposals(carePlan.diagnoses.primary);
            const fullGroups = fetchedGroups.map(group => ({
                ...group,
                goals: group.goals.map((p, index) => ({
                    id: `ai-prop-${group.condition.replace(/\s/g, '')}-${Date.now()}-${index}`,
                    status: 'Active',
                    startDate: new Date().toISOString().split('T')[0],
                    targetDate: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
                    tasks: [],
                    measurementTargets: [],
                    eventsAndTasks: [],
                    dataTable: [],
                    ...p,
                } as Goal))
            }));
            
            setProposalGroups(fullGroups);
            const allIds = new Set(fullGroups.flatMap(g => g.goals.map(goal => goal.id)));
            setSelectedProposalIds(allIds);
            setOpenCategories(new Set(fullGroups.map(g => g.condition)));
            setActiveProposalId(fullGroups[0]?.goals[0]?.id || null);

        } catch (error) {
            console.error("Failed to fetch AI goal proposals:", error);
        } finally {
            setIsLoading(false);
        }
    }, [carePlan.diagnoses.primary]);

    useEffect(() => {
        if (isOpen) {
            fetchProposals();
        } else {
            setProposalGroups([]);
            setSelectedProposalIds(new Set());
            setActiveProposalId(null);
            setOpenCategories(new Set());
        }
    }, [isOpen, fetchProposals]);

    const handleToggleSelection = (proposalId: string) => {
        const newSelection = new Set(selectedProposalIds);
        if (newSelection.has(proposalId)) newSelection.delete(proposalId);
        else newSelection.add(proposalId);
        setSelectedProposalIds(newSelection);
    };
    
    const handleUpdateProposal = (updatedProposal: Goal) => {
        setProposalGroups(prevGroups => prevGroups.map(group => ({
            ...group,
            goals: group.goals.map(p => p.id === updatedProposal.id ? updatedProposal : p)
        })));
    };

    const handleSaveSelected = () => {
        const selectedGoals = proposalGroups.flatMap(g => g.goals).filter(p => selectedProposalIds.has(p.id));
        onSave(selectedGoals);
        onClose();
    };

    const activeProposal = proposalGroups.flatMap(g => g.goals).find(p => p.id === activeProposalId);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <AiSparkleIcon className="w-6 h-6 text-brand-blue" />
                        <div>
                            <h2 className="text-xl font-semibold text-brand-gray-900">AI-Suggested Goals</h2>
                            <p className="text-sm text-brand-gray-500">Based on patient diagnoses. Review, edit, and select goals to add.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-brand-gray-400 hover:text-brand-gray-600"><XIcon className="w-6 h-6" /></button>
                </div>

                <div className="flex-grow overflow-hidden grid grid-cols-12">
                    <div className="col-span-5 bg-brand-gray-50 overflow-y-auto p-4 border-r">
                        {isLoading ? (
                             <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                                <p className="ml-3 text-sm text-brand-gray-600">Gemini is generating goals...</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {proposalGroups.map(group => (
                                    <div key={group.condition} className="bg-white rounded-lg border">
                                        <button 
                                            onClick={() => {
                                                setOpenCategories(prev => {
                                                    const newSet = new Set(prev);
                                                    if (newSet.has(group.condition)) newSet.delete(group.condition);
                                                    else newSet.add(group.condition);
                                                    return newSet;
                                                });
                                            }}
                                            className="w-full flex justify-between items-center p-3"
                                        >
                                            <h4 className="font-bold text-brand-gray-800">{group.condition}</h4>
                                            <ChevronDownIcon className={`w-5 h-5 transition-transform ${openCategories.has(group.condition) ? 'rotate-180' : ''}`} />
                                        </button>
                                        {openCategories.has(group.condition) && (
                                            <div className="p-3 border-t space-y-2">
                                                {group.goals.map(p => (
                                                    <div key={p.id} onClick={() => setActiveProposalId(p.id)}
                                                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${activeProposalId === p.id ? 'bg-blue-50 border-brand-blue shadow' : 'bg-brand-gray-100 border-transparent hover:border-brand-gray-300'}`}>
                                                        <div className="flex items-start gap-3">
                                                            <input type="checkbox" checked={selectedProposalIds.has(p.id)} onChange={(e) => { e.stopPropagation(); handleToggleSelection(p.id); }} className="mt-1 h-4 w-4 bg-white text-brand-blue border-gray-300 rounded focus:ring-brand-blue focus:ring-2"/>
                                                            <div className="flex-1">
                                                                <p className="font-semibold text-brand-gray-800">{p.title}</p>
                                                                <p className="text-sm text-brand-gray-500 mt-1 line-clamp-2">{p.description}</p>
                                                                {p.qualityMeasures.map(qm => <span key={qm} className="mt-2 inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-md">{qm}</span>)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

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
                    <p className="text-sm font-semibold text-brand-gray-700">{selectedProposalIds.size} of {proposalGroups.flatMap(g => g.goals).length} goals selected</p>
                     <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">Cancel</button>
                        <button onClick={handleSaveSelected} disabled={selectedProposalIds.size === 0} className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600 disabled:opacity-50">
                            Add Selected Goals
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
