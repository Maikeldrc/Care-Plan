

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { QualityMeasure, Task, TaskKind, GoalMetric, TaskOwner, TaskPriority, TaskStatus } from '../../types';
import { qualityMeasures } from '../../data/qualityMeasures';
import { XIcon } from '../icons/XIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { SettingsIcon } from '../icons/SettingsIcon';
import { inferTaskKind, kindDetails } from '../../data/taskDetails';

type TaskSelectionState = {
    [qmId: string]: {
        applyTasks: boolean;
        selectedTasks: Set<string>;
        taskConfigs: { [taskTitle: string]: Partial<Task> };
    };
};

const kindColors: { [key in TaskKind]: string } = {
    Communication: 'bg-blue-100 text-blue-800',
    'Service Request': 'bg-indigo-100 text-indigo-800',
    Task: 'bg-gray-100 text-gray-800',
    'Device Request': 'bg-cyan-100 text-cyan-800',
    'Nutrition Order': 'bg-orange-100 text-orange-800',
    'Medication Request': 'bg-red-100 text-red-800',
    Questionnaire: 'bg-purple-100 text-purple-800',
    Other: 'bg-gray-100 text-gray-800',
};

const baseInputStyles = "mt-1 w-full border border-brand-gray-300 rounded-md text-sm bg-white";
const inputStyles = `${baseInputStyles} h-9 px-2 py-1`;
const selectStyles = `${baseInputStyles} h-9 px-2 py-1`;
const checkboxStyles = "h-4 w-4 rounded border-gray-300 bg-white text-brand-blue focus:ring-brand-blue focus:ring-2";


const TaskConfigPopover: React.FC<{
    task: Partial<Task>;
    onUpdate: (updates: Partial<Task>) => void;
    onClose: () => void;
    goalMetrics: GoalMetric[];
}> = ({ task, onUpdate, onClose, goalMetrics }) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div ref={popoverRef} className="absolute right-0 top-8 z-20 w-72 bg-white rounded-lg shadow-xl border border-brand-gray-300 p-4 space-y-3">
            <h5 className="font-semibold text-sm">Task Settings</h5>
            <div>
                <label className="text-xs font-medium text-brand-gray-600">Owner</label>
                <select value={task.owner || 'Care Manager'} onChange={e => onUpdate({ owner: e.target.value as TaskOwner })} className={selectStyles}>
                    <option>Care Manager</option><option>Patient</option><option>PCP</option><option>Specialist</option>
                </select>
            </div>
            <div>
                <label className="text-xs font-medium text-brand-gray-600">Priority</label>
                <select value={task.priority || 'Medium'} onChange={e => onUpdate({ priority: e.target.value as TaskPriority })} className={selectStyles}>
                    <option>High</option><option>Medium</option><option>Low</option>
                </select>
            </div>
            <div>
                <label className="text-xs font-medium text-brand-gray-600">Due Date</label>
                <input type="date" value={task.dueDate} onChange={e => onUpdate({ dueDate: e.target.value })} className={inputStyles} />
            </div>
             <div>
                <label className="text-xs font-medium text-brand-gray-600">Link to Target (optional)</label>
                 <select value={task.linkedTarget || ''} onChange={e => onUpdate({ linkedTarget: e.target.value })} className={selectStyles}>
                    <option value="">None</option>
                    {goalMetrics.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
            </div>
            <button onClick={onClose} className="w-full mt-2 px-3 py-1.5 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600">Done</button>
        </div>
    );
};

const QmCard: React.FC<{
    qm: QualityMeasure;
    isSelected: boolean;
    onToggle: () => void;
    taskSelection: TaskSelectionState[string];
    onTaskSelectionChange: (updates: Partial<TaskSelectionState[string]>) => void;
    goalMetrics: GoalMetric[];
}> = ({ qm, isSelected, onToggle, taskSelection, onTaskSelectionChange, goalMetrics }) => {
    const [configTask, setConfigTask] = useState<string | null>(null);
    const { applyTasks, selectedTasks, taskConfigs } = taskSelection;
    const suggestedTasks = qm.suggestedTasks || [];

    const handleTaskCheck = (taskTitle: string) => {
        const newSet = new Set(selectedTasks);
        if (newSet.has(taskTitle)) newSet.delete(taskTitle);
        else newSet.add(taskTitle);
        onTaskSelectionChange({ selectedTasks: newSet });
    };
    
    const handleSelectAllTasks = (isChecked: boolean) => {
        onTaskSelectionChange({ selectedTasks: isChecked ? new Set(suggestedTasks) : new Set() });
    };

    const handleConfigUpdate = (taskTitle: string, updates: Partial<Task>) => {
        onTaskSelectionChange({
            taskConfigs: { ...taskConfigs, [taskTitle]: { ...(taskConfigs[taskTitle] || {}), ...updates } }
        });
    };

    return (
        <div className={`p-4 rounded-lg border-2 transition-all ${isSelected ? 'bg-blue-50 border-brand-blue shadow-md' : 'bg-white border-brand-gray-200 hover:border-brand-gray-300'}`}>
            <div className="flex items-start gap-4">
                <input type="checkbox" checked={isSelected} onChange={onToggle} className={`h-5 w-5 mt-1 ${checkboxStyles}`} />
                <div className="flex-1">
                    <h4 className="font-bold text-brand-gray-900">{qm.id}: {qm.title}</h4>
                    {suggestedTasks.length > 0 && (
                         <div className="relative flex items-start mt-2">
                             <div className="flex h-5 items-center">
                                 <input id={`apply-tasks-${qm.id}`} type="checkbox" checked={applyTasks} onChange={(e) => onTaskSelectionChange({ applyTasks: e.target.checked })} className={checkboxStyles}/>
                             </div>
                             <div className="ml-3 text-sm"><label htmlFor={`apply-tasks-${qm.id}`} className="font-medium text-brand-gray-700">Apply suggested tasks from this QM</label></div>
                         </div>
                    )}
                </div>
            </div>
            {isSelected && applyTasks && suggestedTasks.length > 0 && (
                <div className="mt-4 pl-9 space-y-3">
                    <div className="flex justify-between items-center">
                        <h5 className="font-semibold text-sm text-brand-gray-800">Suggested Tasks</h5>
                        <button onClick={() => handleSelectAllTasks(true)} className="text-xs font-semibold text-brand-blue hover:underline">Select All</button>
                    </div>
                    {suggestedTasks.map((taskTitle, i) => {
                        const kind = inferTaskKind(taskTitle);
                        const isChecked = selectedTasks.has(taskTitle);
                        return (
                             <div key={i} className={`p-2 rounded-md transition-colors ${isChecked ? 'bg-blue-100' : 'bg-brand-gray-50'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-start gap-3">
                                         <input type="checkbox" checked={isChecked} onChange={() => handleTaskCheck(taskTitle)} className={`h-4 w-4 mt-1 ${checkboxStyles}`} />
                                         <div>
                                            <p className="text-sm text-brand-gray-800">{taskTitle}</p>
                                            <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${kindColors[kind]}`}>{kind}</span>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <button onClick={() => setConfigTask(configTask === taskTitle ? null : taskTitle)} className="p-1 text-brand-gray-400 hover:text-brand-gray-600">
                                            <SettingsIcon className="w-5 h-5"/>
                                        </button>
                                        {configTask === taskTitle && (
                                            <TaskConfigPopover
                                                task={{ title: taskTitle, ...taskConfigs[taskTitle] }}
                                                onUpdate={(updates) => handleConfigUpdate(taskTitle, updates)}
                                                onClose={() => setConfigTask(null)}
                                                goalMetrics={goalMetrics}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
            {suggestedTasks.length === 0 && <p className="text-sm text-brand-gray-500 pl-9 mt-2">No task templates available for this QM.</p>}
        </div>
    );
};


interface LinkQmModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkedQms: string[];
  onSave: (qms: string[], newTasks: Task[]) => void;
  goalMetrics: GoalMetric[];
}

const filterInputStyles = "w-full h-10 px-3 py-2 border rounded-md bg-white border-brand-gray-300 focus:ring-1 focus:ring-brand-blue focus:border-brand-blue";

export const LinkQmModal: React.FC<LinkQmModalProps> = ({ isOpen, onClose, linkedQms, onSave, goalMetrics }) => {
    const [selectedQms, setSelectedQms] = useState<Set<string>>(new Set(linkedQms));
    const [searchQuery, setSearchQuery] = useState('');
    const [sourceFilter, setSourceFilter] = useState('All');
    const [areaFilter, setAreaFilter] = useState('All');
    const [tasksFilter, setTasksFilter] = useState('All');
    const [globalApplyTasks, setGlobalApplyTasks] = useState(false);
    const [taskSelections, setTaskSelections] = useState<TaskSelectionState>({});

    useEffect(() => {
        if (isOpen) {
            setSelectedQms(new Set(linkedQms));
            // Initialize task selections
            const initialSelections: TaskSelectionState = {};
            qualityMeasures.forEach(qm => {
                initialSelections[qm.id] = {
                    applyTasks: linkedQms.includes(qm.id),
                    selectedTasks: new Set(linkedQms.includes(qm.id) ? (qm.suggestedTasks || []) : []),
                    taskConfigs: {}
                };
            });
            setTaskSelections(initialSelections);
            const anyApplied = linkedQms.some(id => initialSelections[id]?.applyTasks);
            setGlobalApplyTasks(anyApplied);
        }
    }, [isOpen, linkedQms]);

    const filteredQms = useMemo(() => {
        return qualityMeasures.filter(qm => {
            const searchMatch = qm.id.toLowerCase().includes(searchQuery.toLowerCase()) || qm.title.toLowerCase().includes(searchQuery.toLowerCase());
            const sourceMatch = sourceFilter === 'All' || qm.source === sourceFilter;
            const areaMatch = areaFilter === 'All' || qm.clinicalArea === areaFilter;
            const tasksMatch = tasksFilter === 'All' || (tasksFilter === 'Has Tasks' && qm.suggestedTasks && qm.suggestedTasks.length > 0);
            return searchMatch && sourceMatch && areaMatch && tasksMatch;
        });
    }, [searchQuery, sourceFilter, areaFilter, tasksFilter]);

    const handleToggleQm = (qmId: string) => {
        const newSet = new Set(selectedQms);
        if (newSet.has(qmId)) newSet.delete(qmId);
        else newSet.add(qmId);
        setSelectedQms(newSet);
    };
    
    const handleTaskSelectionChange = (qmId: string, updates: Partial<TaskSelectionState[string]>) => {
        setTaskSelections(prev => ({
            ...prev,
            [qmId]: {
                ...(prev[qmId] || { applyTasks: false, selectedTasks: new Set(), taskConfigs: {} }),
                ...updates
            }
        }));
    };
    
    const handleGlobalApplyTasksChange = (isChecked: boolean) => {
        setGlobalApplyTasks(isChecked);
        setTaskSelections(prev => {
            const newSelections = { ...prev };
            selectedQms.forEach(qmId => {
                const suggestedTasks = qualityMeasures.find(q => q.id === qmId)?.suggestedTasks || [];
                newSelections[qmId] = {
                    applyTasks: isChecked,
                    selectedTasks: new Set(isChecked ? suggestedTasks : []),
                    taskConfigs: prev[qmId]?.taskConfigs || {}
                };
            });
            return newSelections;
        });
    };

    const handleSave = () => {
        const newTasks: Task[] = [];
        Object.keys(taskSelections).forEach(qmId => {
            const selection = taskSelections[qmId];
            if (selectedQms.has(qmId) && selection.applyTasks) {
                selection.selectedTasks.forEach(taskTitle => {
                    const config = selection.taskConfigs[taskTitle] || {};
                    const kind = inferTaskKind(taskTitle);
                    const details = kindDetails[kind];
                    const newTask: Task = {
                        id: `task-${Date.now()}-${Math.random()}`,
                        kind: kind,
                        title: taskTitle,
                        owner: (config.owner || 'Care Manager') as TaskOwner,
                        dueDate: config.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        priority: config.priority || 'Medium',
                        status: 'Pending',
                        linkedQM: [qmId],
                        linkedTarget: config.linkedTarget,
                        acceptanceCriteria: `Completed as per ${qmId} guidelines.`,
                        autoComplete: false,
                        extra: {},
                        fhirEvidence: { 
                            resource: details.fhirResource,
                            status: details.fhirStatus,
                        },
                        source: 'QM-pack'
                    };
                    newTasks.push(newTask);
                });
            }
        });
        onSave(Array.from(selectedQms), newTasks);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-brand-gray-900">Link Quality Measures & Tasks</h2>
                    <button onClick={onClose} className="text-brand-gray-400 hover:text-brand-gray-600"><XIcon className="w-6 h-6" /></button>
                </div>

                <div className="p-4 border-b">
                     <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={filterInputStyles} />
                        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className={filterInputStyles}>
                            <option value="All">All Sources</option>
                            <option value="CMS">CMS</option>
                            <option value="HEDIS">HEDIS</option>
                            <option value="NCQA">NCQA</option>
                            <option value="MIPS">MIPS</option>
                        </select>
                        <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className={filterInputStyles}>
                            <option value="All">All Areas</option>
                            <option value="Cardiovascular Health">Cardiovascular Health</option>
                            <option value="Diabetes Care">Diabetes Care</option>
                            <option value="Chronic Kidney Disease">Chronic Kidney Disease</option>
                            <option value="Behavioral Health">Behavioral Health</option>
                            <option value="Preventive Screenings">Preventive Screenings</option>
                            <option value="Respiratory Conditions">Respiratory Conditions</option>
                        </select>
                        <select value={tasksFilter} onChange={(e) => setTasksFilter(e.target.value)} className={filterInputStyles}><option value="All">All Tasks</option><option value="Has Tasks">Has suggested tasks</option></select>
                    </div>
                     <div className="relative flex items-start mt-4">
                        <div className="flex h-5 items-center"><input id="global-apply-tasks" type="checkbox" checked={globalApplyTasks} onChange={e => handleGlobalApplyTasksChange(e.target.checked)} className={checkboxStyles} /></div>
                        <div className="ml-3 text-sm"><label htmlFor="global-apply-tasks" className="font-medium text-brand-gray-700">Add suggested tasks from all selected QMs</label></div>
                    </div>
                </div>

                <div className="p-4 flex-grow overflow-y-auto bg-brand-gray-50 space-y-4">
                    {filteredQms.map(qm => (
                        <QmCard
                            key={qm.id}
                            qm={qm}
                            isSelected={selectedQms.has(qm.id)}
                            onToggle={() => handleToggleQm(qm.id)}
                            taskSelection={taskSelections[qm.id] || { applyTasks: false, selectedTasks: new Set(), taskConfigs: {} }}
                            onTaskSelectionChange={(updates) => handleTaskSelectionChange(qm.id, updates)}
                            goalMetrics={goalMetrics}
                        />
                    ))}
                </div>

                <div className="p-4 border-t bg-brand-gray-50 flex justify-between items-center">
                    <p className="text-sm font-semibold text-brand-gray-700">{selectedQms.size} measure(s) selected</p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 bg-white border rounded-md text-sm font-semibold">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    );
};