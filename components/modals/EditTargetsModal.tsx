import React, { useState, useEffect } from 'react';
import type { Goal, GoalMetric, TargetValue, Task } from '../../types';
import { getAiGoalUpdateSuggestion } from '../../services/geminiService';
import { XIcon } from '../icons/XIcon';
import { AiSparkleIcon } from '../icons/AiSparkleIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { metricDefinitions } from '../../data/metricDefinitions';
import { LinkIcon } from '../icons/LinkIcon';
import { LinkQmModal } from './LinkQmModal';

// NOTE: This file is repurposed for the EditGoalModal to provide a comprehensive goal editing experience.

interface EditGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedGoal: Goal) => void;
  goal: Goal;
  primaryDiagnoses: string[];
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

const formatTargetValue = (target: TargetValue, unit: string): string => {
    if (!target) return `N/A ${unit}`;
    const { operator, value_min, value_max } = target;
    if (operator === 'range') {
        return `${value_min ?? ''} - ${value_max ?? ''} ${unit}`;
    }
    const displayOperator = operator.replace('<=', '≤').replace('>=', '≥');
    const value = operator === '>' || operator === '>=' ? value_min : value_max;
    return `${displayOperator} ${value ?? ''} ${unit}`;
};


const AiSuggestionView: React.FC<{
    originalGoal: Goal;
    suggestion: Partial<Goal>;
    rationale: string;
    onApply: (field: keyof Goal, value: any) => void;
    onApplyAll: () => void;
}> = ({ originalGoal, suggestion, rationale, onApply, onApplyAll }) => {
    const renderDiff = (original: any, suggested: any, field: keyof Goal) => {
        const originalStr = JSON.stringify(original);
        const suggestedStr = JSON.stringify(suggested);
        if (originalStr === suggestedStr) return <td className="px-4 py-3 text-brand-gray-500">{original?.toString() || 'N/A'}</td>;
        
        return (
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="line-through text-brand-gray-400">{original?.toString()}</span>
                    <span>&rarr;</span>
                    <strong className="text-brand-blue">{suggested?.toString()}</strong>
                    <button onClick={() => onApply(field, suggested)} className="ml-auto text-xs font-semibold text-brand-blue hover:underline">Apply</button>
                </div>
            </td>
        );
    };

    const metricNames = Array.from(new Set([...originalGoal.metrics.map(m => m.name), ...(suggestion.metrics || []).map(m => m.name)]));

    return (
        <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-brand-blue">AI Rationale</h4>
                <p className="mt-1 text-sm text-brand-gray-700">{rationale}</p>
            </div>
            <table className="w-full text-sm text-left">
                <thead className="bg-brand-gray-50 text-brand-gray-600">
                    <tr>
                        <th className="px-4 py-2 font-semibold">Field</th>
                        <th className="px-4 py-2 font-semibold">Current Value</th>
                        <th className="px-4 py-2 font-semibold">AI Suggestion</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-brand-gray-200">
                    <tr>
                        <td className="px-4 py-3 font-medium">Title</td>
                        {renderDiff(originalGoal.title, suggestion.title, 'title')}
                    </tr>
                     <tr>
                        <td className="px-4 py-3 font-medium">Description</td>
                        {renderDiff(originalGoal.description, suggestion.description, 'description')}
                    </tr>
                     <tr>
                        <td className="px-4 py-3 font-medium">Priority</td>
                        {renderDiff(originalGoal.priority, suggestion.priority, 'priority')}
                    </tr>
                    <tr>
                        <td className="px-4 py-3 font-medium">Target Date</td>
                        {renderDiff(originalGoal.targetDate, suggestion.targetDate, 'targetDate')}
                    </tr>
                    {metricNames.map(name => {
                        const originalMetric = originalGoal.metrics.find(m => m.name === name);
                        const suggestedMetric = suggestion.metrics?.find(m => m.name === name);
                        if (!originalMetric && !suggestedMetric) return null;
                        
                        return (
                            <tr key={name}>
                                <td className="px-4 py-3 font-medium">Metric: {name}</td>
                                {renderDiff(
                                    originalMetric ? formatTargetValue(originalMetric.target, originalMetric.unit) : 'Not set',
                                    suggestedMetric ? formatTargetValue(suggestedMetric.target, suggestedMetric.unit) : 'Remove',
                                    'metrics'
                                )}
                            </tr>
                        )
                    })}
                </tbody>
            </table>
            <div className="text-right">
                <button onClick={onApplyAll} className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600">Accept All Suggestions</button>
            </div>
        </div>
    );
};

export const EditGoalModal: React.FC<EditGoalModalProps> = ({ isOpen, onClose, onSave, goal, primaryDiagnoses }) => {
  const [formData, setFormData] = useState<Goal>(goal);
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');
  const [isLoading, setIsLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ suggestion: Partial<Goal>, rationale: string } | null>(null);
  const [isQmModalOpen, setIsQmModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(JSON.parse(JSON.stringify(goal))); // Deep copy
      setMode('manual');
      setAiSuggestion(null);
    }
  }, [isOpen, goal]);

  const handleMetricChange = (index: number, field: keyof GoalMetric, value: string | TargetValue) => {
    const newMetrics = [...formData.metrics];
    const metricToUpdate = { ...newMetrics[index], [field]: value };
    if (field === 'name' && typeof value === 'string') {
        const definition = metricDefinitions.find(def => def.name === value);
        metricToUpdate.unit = definition?.unit || '';
        metricToUpdate.referenceRange = definition?.referenceRange || '';
    }
    newMetrics[index] = metricToUpdate;
    setFormData(prev => ({ ...prev, metrics: newMetrics }));
  };

  const handleDiagnosisToggle = (dx: string) => {
    setFormData(prev => {
        const newDiagnoses = new Set(prev.diagnoses);
        if(newDiagnoses.has(dx)) newDiagnoses.delete(dx);
        else newDiagnoses.add(dx);
        return {...prev, diagnoses: Array.from(newDiagnoses)};
    });
  };

  const generateWithAi = async () => {
    setIsLoading(true);
    try {
        const result = await getAiGoalUpdateSuggestion(formData);
        setAiSuggestion(result);
        setMode('ai');
    } catch (error) {
        console.error("Failed to generate AI suggestions:", error);
        alert("Could not retrieve AI suggestions.");
    } finally {
        setIsLoading(false);
    }
  };

  const applyAiSuggestion = (field: keyof Goal, value: any) => {
    if (field === 'metrics' && aiSuggestion?.suggestion.metrics) {
        // Special handling to merge metric suggestions
        const updatedMetrics = [...formData.metrics];
        aiSuggestion.suggestion.metrics.forEach(suggestedMetric => {
            const index = updatedMetrics.findIndex(m => m.name === suggestedMetric.name);
            if (index > -1) {
                updatedMetrics[index] = { ...updatedMetrics[index], target: suggestedMetric.target };
            }
        });
        setFormData(prev => ({ ...prev, metrics: updatedMetrics }));
    } else {
        setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const applyAllAiSuggestions = () => {
    if (aiSuggestion) {
      setFormData(prev => ({ ...prev, ...aiSuggestion.suggestion }));
      setMode('manual');
    }
  };

  const handleSaveFromQmModal = (qms: string[], newTasksFromQm: Task[]) => {
    const existingTaskTitles = new Set(formData.tasks.map(t => t.title.toLowerCase()));
    const uniqueNewTasks = newTasksFromQm.filter(t => !existingTaskTitles.has(t.title.toLowerCase()));

    if (uniqueNewTasks.length < newTasksFromQm.length) {
      alert("Some tasks were already present in the goal and were not added again.");
    }
    
    if (uniqueNewTasks.length > 0) {
        alert(`Added ${uniqueNewTasks.length} new tasks to the goal.`);
    }

    setFormData(prev => ({
      ...prev,
      qualityMeasures: qms,
      tasks: [...prev.tasks, ...uniqueNewTasks],
    }));
    setIsQmModalOpen(false);
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold text-brand-gray-900">Edit Goal</h2>
            <button onClick={onClose} className="text-brand-gray-400 hover:text-brand-gray-600"><XIcon className="w-6 h-6" /></button>
        </div>

        <div className="p-4 border-b bg-brand-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <button onClick={() => setMode('manual')} className={`px-3 py-1.5 text-sm font-semibold rounded-md ${mode === 'manual' ? 'bg-white shadow-sm' : 'hover:bg-brand-gray-100'}`}>Manual Edit</button>
                <button onClick={generateWithAi} disabled={isLoading} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md ${mode === 'ai' ? 'bg-white shadow-sm' : 'hover:bg-brand-gray-100'}`}>
                    <AiSparkleIcon className={`w-4 h-4 text-brand-blue ${isLoading ? 'animate-aiPulse' : ''}`} />
                    {isLoading ? 'Generating...' : 'Generate with AI'}
                </button>
            </div>
        </div>

        <div className="p-6 flex-grow overflow-y-auto space-y-6">
            {mode === 'manual' ? (
                <>
                    <div>
                        <label className="block text-sm font-medium text-brand-gray-700">Title</label>
                        <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className={inputStyles} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-brand-gray-700">Description</label>
                        <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} className={textareaStyles}></textarea>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                        <div>
                            <label className="block text-sm font-medium text-brand-gray-700 invisible">Link Action</label>
                            <button 
                                type="button" 
                                onClick={() => setIsQmModalOpen(true)} 
                                className="flex w-full h-10 items-center justify-center gap-1.5 px-3 py-2 border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50"
                                aria-label="Link Quality Measure"
                            >
                                <LinkIcon className="w-4 h-4" /> Link Quality Measure
                            </button>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-brand-gray-700">Linked Diagnoses</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                           {primaryDiagnoses.map(dx => (
                                <button key={dx} onClick={() => handleDiagnosisToggle(dx)} className={`px-3 py-1 text-sm rounded-full border ${formData.diagnoses.includes(dx) ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                                    {dx}
                                </button>
                           ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-brand-gray-800">Metrics & Targets</h3>
                        {formData.metrics.map((metric, index) => (
                             <div key={index} className="p-3 bg-brand-gray-50 rounded-md border border-brand-gray-200">
                                <div className="grid grid-cols-12 gap-3 items-end">
                                    <div className="col-span-5">
                                        <label className="block text-xs font-medium text-brand-gray-600">Metric Name</label>
                                        <input type="text" readOnly value={metric.name} className={`${inputStyles} bg-brand-gray-100 cursor-not-allowed`} />
                                    </div>
                                    <div className="col-span-7">
                                        <label className="block text-xs font-medium text-brand-gray-600">Target Value</label>
                                        <StructuredTargetInput metric={metric} onUpdate={(newTarget) => handleMetricChange(index, 'target', newTarget)} />
                                    </div>
                                </div>
                             </div>
                        ))}
                    </div>
                </>
            ) : aiSuggestion ? (
                <AiSuggestionView 
                    originalGoal={goal} 
                    suggestion={aiSuggestion.suggestion} 
                    rationale={aiSuggestion.rationale} 
                    onApply={applyAiSuggestion}
                    onApplyAll={applyAllAiSuggestions}
                />
            ) : <p className="text-center text-brand-gray-500">No AI suggestion loaded.</p>}
        </div>

        <div className="p-4 border-t bg-brand-gray-50 flex justify-end items-center">
            <div className="flex gap-3">
                <button onClick={onClose} className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">Cancel</button>
                <button onClick={() => onSave(formData)} className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600">Save Changes</button>
            </div>
        </div>

        <LinkQmModal 
            isOpen={isQmModalOpen} 
            onClose={() => setIsQmModalOpen(false)} 
            linkedQms={formData.qualityMeasures} 
            onSave={handleSaveFromQmModal} 
            goalMetrics={formData.metrics}
        />
      </div>
    </div>
  );
};