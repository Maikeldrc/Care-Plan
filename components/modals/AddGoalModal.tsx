import React, { useState, useEffect } from 'react';
import type { Goal, GoalMetric, TargetValue } from '../../types';
import { XIcon } from '../icons/XIcon';
import { AiSparkleIcon } from '../icons/AiSparkleIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { metricDefinitions } from '../../data/metricDefinitions';
import { getAiMetricSuggestions } from '../../services/geminiService';


interface AddGoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (goal: Goal) => void;
    primaryDiagnoses: string[];
}

const initialFormState = {
    title: '',
    description: '',
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    startDate: new Date().toISOString().split('T')[0],
    targetDate: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
    diagnoses: [] as string[],
    metrics: [] as GoalMetric[],
};

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

export const AddGoalModal: React.FC<AddGoalModalProps> = ({ isOpen, onClose, onSave, primaryDiagnoses }) => {
    const [formData, setFormData] = useState(initialFormState);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isMetricAiLoading, setIsMetricAiLoading] = useState(false);

    useEffect(() => {
        // Reset form when modal is opened/closed
        if (isOpen) {
            setFormData(initialFormState);
        }
    }, [isOpen]);

    const handleMetricChange = (index: number, field: keyof GoalMetric, value: any) => {
        const newMetrics = [...formData.metrics];
        const metricToUpdate = { ...newMetrics[index], [field]: value };

        if (field === 'name') {
            const definition = metricDefinitions.find(def => def.name === value);
            metricToUpdate.unit = definition?.unit || '';
            metricToUpdate.referenceRange = definition?.referenceRange || '';
        }
        newMetrics[index] = metricToUpdate;
        setFormData(prev => ({ ...prev, metrics: newMetrics }));
    };

    const addMetric = () => {
        const newMetric: GoalMetric = {
            name: 'Systolic BP',
            target: { operator: '<', value_min: null, value_max: 130 },
            unit: 'mmHg',
            referenceRange: 'Normal: < 130 mmHg',
            source: 'Manual',
        };
        setFormData(prev => ({ ...prev, metrics: [...prev.metrics, newMetric] }));
    };

    const removeMetric = (index: number) => {
        setFormData(prev => ({ ...prev, metrics: prev.metrics.filter((_, i) => i !== index) }));
    };

    const handleSuggestMetrics = async () => {
        setIsMetricAiLoading(true);
        try {
            const suggestions = await getAiMetricSuggestions(formData.diagnoses.length > 0 ? formData.diagnoses : primaryDiagnoses);
            const existingMetricNames = new Set(formData.metrics.map(m => m.name));
            const newSuggestions = suggestions.filter(s => s.name && !existingMetricNames.has(s.name));
            setFormData(prev => ({ ...prev, metrics: [...prev.metrics, ...newSuggestions as GoalMetric[]] }));
        } catch (error) {
            console.error("Error fetching AI metric suggestions:", error);
        } finally {
            setIsMetricAiLoading(false);
        }
    };
    
    const handleAutoFillEntireGoal = async () => {
        setIsAiLoading(true);
        try {
            // Mock AI behavior
            const title = "Improve Blood Pressure & Glycemic Control";
            const description = "Holistic management of hypertension and diabetes based on primary diagnoses.";
            const suggestions = await getAiMetricSuggestions(primaryDiagnoses);
            
            setFormData(prev => ({
                ...prev,
                title,
                description,
                diagnoses: primaryDiagnoses,
                metrics: suggestions as GoalMetric[],
            }));

        } catch(error) {
            console.error("Error auto-filling goal:", error);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSave = () => {
        if (!formData.title) {
            alert("Title is a required field.");
            return;
        }
        if (formData.metrics.length === 0) {
            alert("At least one metric is required.");
            return;
        }
        const newGoal: Goal = {
            id: `goal-${Date.now()}`,
            title: formData.title,
            description: formData.description,
            status: 'Active',
            priority: formData.priority,
            qualityMeasures: [], // Can be linked later
            startDate: formData.startDate,
            targetDate: formData.targetDate,
            diagnoses: formData.diagnoses,
            metrics: formData.metrics,
            tasks: [],
            measurementTargets: [],
            eventsAndTasks: [],
            dataTable: [],
        };
        onSave(newGoal);
        onClose();
    };
    
    const handleDiagnosisToggle = (dx: string) => {
        setFormData(prev => {
            const newDiagnoses = new Set(prev.diagnoses);
            if(newDiagnoses.has(dx)) newDiagnoses.delete(dx);
            else newDiagnoses.add(dx);
            return {...prev, diagnoses: Array.from(newDiagnoses)};
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-brand-gray-900">Create New Goal</h2>
                    <button onClick={onClose} className="text-brand-gray-400 hover:text-brand-gray-600"><XIcon className="w-6 h-6" /></button>
                </div>

                <div className="p-6 flex-grow overflow-y-auto space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-brand-gray-700">Title <span className="text-brand-red">*</span></label>
                        <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className={inputStyles} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-brand-gray-700">Description</label>
                        <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} className={textareaStyles}></textarea>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-brand-gray-700">Start Date</label>
                            <input type="date" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} className={inputStyles} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-gray-700">Target Date</label>
                            <input type="date" value={formData.targetDate} onChange={(e) => setFormData({...formData, targetDate: e.target.value})} className={inputStyles} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-gray-700">Priority</label>
                            <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value as any})} className={selectStyles}>
                                <option>High</option><option>Medium</option><option>Low</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-brand-gray-700">Link to Primary Diagnoses</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                           {primaryDiagnoses.map(dx => (
                                <button key={dx} onClick={() => handleDiagnosisToggle(dx)} className={`px-3 py-1 text-sm rounded-full border ${formData.diagnoses.includes(dx) ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                                    {dx}
                                </button>
                           ))}
                        </div>
                    </div>
                    
                    {/* Metrics Section */}
                    <div className="space-y-4 p-4 border border-brand-gray-200 rounded-lg bg-brand-gray-50">
                        <h3 className="font-semibold text-brand-gray-800">Metrics & Targets</h3>
                        {formData.metrics.map((metric, index) => (
                             <div key={index} className="p-3 bg-white rounded-md border border-brand-gray-200">
                                <div className="grid grid-cols-12 gap-3 items-end">
                                    <div className="col-span-5">
                                        <label className="block text-xs font-medium text-brand-gray-600">Metric Name</label>
                                        <select value={metric.name} onChange={(e) => handleMetricChange(index, 'name', e.target.value)} className={selectStyles}>
                                            <option value="">Select Metric</option>
                                            {metricDefinitions.map(def => <option key={def.name} value={def.name}>{def.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-5">
                                        <label className="block text-xs font-medium text-brand-gray-600">Target Value</label>
                                        <StructuredTargetInput metric={metric} onUpdate={(newTarget) => handleMetricChange(index, 'target', newTarget)} />
                                    </div>
                                    <div className="col-span-1">
                                        {metric.source === 'AI' && <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">AI</span>}
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
                         <div className="flex items-center gap-3">
                            <button onClick={addMetric} className="flex items-center gap-2 px-3 py-1.5 border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-100">
                                <PlusIcon className="w-4 h-4" /> Add Metric
                            </button>
                             <button onClick={handleSuggestMetrics} disabled={isMetricAiLoading} className="flex items-center gap-2 px-3 py-1.5 border border-transparent rounded-md text-sm font-semibold text-brand-blue hover:bg-blue-50">
                                <AiSparkleIcon className={`w-4 h-4 ${isMetricAiLoading ? 'animate-aiPulse' : ''}`} /> {isMetricAiLoading ? 'Suggesting...' : 'Suggest Metrics with AI'}
                            </button>
                         </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-brand-gray-50 flex justify-between items-center">
                    <button onClick={handleAutoFillEntireGoal} disabled={isAiLoading} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600">
                        <AiSparkleIcon className={`w-5 h-5 ${isAiLoading ? 'animate-aiPulse' : ''}`} /> {isAiLoading ? 'Generating...' : 'Auto-fill Entire Goal with AI'}
                    </button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600">Save Goal</button>
                    </div>
                </div>
            </div>
        </div>
    );
};