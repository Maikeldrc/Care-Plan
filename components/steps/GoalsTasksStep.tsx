

import React, { useState, useMemo, useCallback } from 'react';
import type { CarePlan, Goal, GoalMetric, Task, TaskOwner, TaskStatus, TargetValue } from '../../types';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { MoreVerticalIcon } from '../icons/MoreVerticalIcon';
import { LinkIcon } from '../icons/LinkIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { TargetIcon } from '../icons/TargetIcon';
import { GoalProgressModal } from '../modals/GoalProgressModal';
import { AddTaskModal } from '../modals/AddTaskModal';
import { AiTaskProposalModal } from '../modals/AiTaskProposalModal';
import { AddGoalModal } from '../modals/AddGoalModal';
import { AiGoalProposalModal } from '../modals/AiGoalProposalModal';
import { AiSparkleIcon } from '../icons/AiSparkleIcon';
import { XIcon } from '../icons/XIcon';
import { LinkQmModal } from '../modals/LinkQmModal';
import { PencilIcon } from '../icons/PencilIcon';
import { getAiTargetSuggestions } from '../../services/geminiService';
import { EditGoalModal } from '../modals/EditTargetsModal';
import { LightningBoltIcon } from '../icons/LightningBoltIcon';
import { triggerEvents, TriggerEvent } from '../../data/triggerEvents';
import { RepeatIcon } from '../icons/RepeatIcon';
import { ListChecksIcon } from '../icons/ListChecksIcon';

interface GoalsTasksStepProps {
  carePlan: CarePlan;
  setCarePlan: React.Dispatch<React.SetStateAction<CarePlan>>;
  highlightedItems: Set<string>;
}

const statusColors: { [key: string]: string } = {
  'On track': 'bg-green-100 text-green-800',
  'At risk': 'bg-yellow-100 text-yellow-800',
  Active: 'bg-blue-100 text-blue-800',
  High: 'bg-red-100 text-red-800',
  Medium: 'bg-orange-100 text-orange-800',
  Low: 'bg-gray-100 text-gray-800',
  Pending: 'bg-yellow-100 text-yellow-800',
  'In progress': 'bg-blue-100 text-blue-800',
  Completed: 'bg-green-100 text-green-800',
  Skipped: 'bg-gray-200 text-gray-600',
  Cancelled: 'bg-red-50 text-red-600'
};

const baseInputStyles = "bg-white border border-brand-gray-300 text-brand-gray-900 sm:text-sm rounded-md focus:ring-1 focus:ring-brand-blue focus:border-brand-blue disabled:bg-brand-gray-100 disabled:text-brand-gray-500";
const inputStyles = `${baseInputStyles} w-full h-9 pl-3 pr-1 py-2`;
const selectStyles = `${baseInputStyles} h-9 px-2 py-1`;
const checkboxStyles = "h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue focus:ring-2 bg-white";

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


const MetricCard: React.FC<{
  metric: GoalMetric;
  onUpdate: (updatedMetric: GoalMetric) => void;
  goal: Goal;
}> = ({ metric, onUpdate, goal }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<TargetValue>(metric.target);
  const [aiSuggestion, setAiSuggestion] = useState<Partial<GoalMetric> | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const handleEditValueChange = (field: keyof TargetValue, value: any) => {
    setEditValue(prev => ({...prev, [field]: value}));
  }

  const handleSave = () => {
    onUpdate({ ...metric, target: editValue, source: 'Manual', rationale: '' });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(metric.target);
    setIsEditing(false);
  };

  const handleGetAiSuggestion = async () => {
    setIsAiLoading(true);
    setAiSuggestion(null);
    try {
      const suggestions = await getAiTargetSuggestions(goal);
      const relevantSuggestion = suggestions.find(s => s.name === metric.name);
      if (relevantSuggestion) {
        setAiSuggestion(relevantSuggestion);
      } else {
        alert('AI could not find a suggestion for this metric.');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to get AI suggestion.');
    } finally {
      setIsAiLoading(false);
    }
  };
  
  const handleAcceptSuggestion = () => {
    if (aiSuggestion?.target) {
      const updatedMetric: GoalMetric = {
        ...metric,
        target: aiSuggestion.target as TargetValue,
        rationale: aiSuggestion.rationale,
        source: 'AI',
      };
      onUpdate(updatedMetric);
      setEditValue(updatedMetric.target); 
      setAiSuggestion(null);
    }
  };

  return (
    <div className="bg-white p-3 rounded-md border border-brand-gray-200 flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-brand-gray-500">{metric.name}</p>
            {!isEditing && <p className="text-xs text-brand-gray-400">Target: {formatTargetValue(metric.target, metric.unit)}</p>}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => { setEditValue(metric.target); setIsEditing(true); }} className="p-1 text-brand-gray-400 hover:text-brand-gray-600 rounded-full hover:bg-gray-100" aria-label="Edit target manually">
                  <PencilIcon className="w-4 h-4" />
              </button>
              <button onClick={handleGetAiSuggestion} disabled={isAiLoading} className="p-1 text-brand-blue hover:text-blue-600 disabled:opacity-50 rounded-full hover:bg-blue-50" aria-label="Suggest new target with AI">
                  {isAiLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-blue"></div> : <AiSparkleIcon className="w-4 h-4" />}
              </button>
          </div>
        </div>
        {!isEditing && <p className="text-xl font-bold text-brand-gray-900 mt-1">{metric.current} {metric.unit}</p>}
      </div>

       {isEditing && (
         <div className="mt-2 space-y-2">
           <label className="text-xs font-medium text-brand-gray-600">Edit Target</label>
           <div className="flex items-center gap-1.5">
              <select 
                value={editValue.operator}
                onChange={e => handleEditValueChange('operator', e.target.value)}
                className={selectStyles}
              >
                  <option value="<">&lt;</option>
                  <option value="<=">&le;</option>
                  <option value=">">&gt;</option>
                  <option value=">=">&ge;</option>
                  <option value="=">=</option>
                  <option value="range">Range</option>
              </select>
              {editValue.operator === 'range' ? (
                <>
                  <input type="number" value={editValue.value_min ?? ''} onChange={e => handleEditValueChange('value_min', e.target.value === '' ? null : parseFloat(e.target.value))} className={inputStyles} />
                  <span className="text-brand-gray-500">-</span>
                  <input type="number" value={editValue.value_max ?? ''} onChange={e => handleEditValueChange('value_max', e.target.value === '' ? null : parseFloat(e.target.value))} className={inputStyles} />
                </>
              ) : (
                <input
                 type="number"
                 value={(editValue.operator === '>' || editValue.operator === '>=') ? editValue.value_min ?? '' : editValue.value_max ?? ''}
                 onChange={e => {
                   const val = e.target.value === '' ? null : parseFloat(e.target.value);
                   if (editValue.operator === '>' || editValue.operator === '>=') {
                     setEditValue(prev => ({ ...prev, value_min: val, value_max: null }));
                   } else {
                     setEditValue(prev => ({ ...prev, value_max: val, value_min: null }));
                   }
                 }}
                 className={inputStyles}
                 autoFocus
               />
              )}
               <span className="text-sm text-gray-500 font-semibold">{metric.unit}</span>
           </div>
           <div className="flex gap-2">
             <button onClick={handleSave} className="px-3 py-1 bg-brand-blue text-white rounded-md text-xs font-semibold hover:bg-blue-600">Save</button>
             <button onClick={handleCancel} className="px-3 py-1 bg-white border border-brand-gray-300 rounded-md text-xs font-semibold text-brand-gray-700 hover:bg-brand-gray-50">Cancel</button>
           </div>
         </div>
       )}
       
       {aiSuggestion && !isEditing && (
         <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
           <div className="flex justify-between items-start gap-2">
             <div>
               <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-blue">
                 <AiSparkleIcon className="w-3.5 h-3.5" />
                 AI Suggestion: <span className="font-bold">{formatTargetValue(aiSuggestion.target as TargetValue, metric.unit)}</span>
               </p>
               <p className="mt-1 text-xs text-brand-gray-600">
                 <strong>Rationale:</strong> {aiSuggestion.rationale}
               </p>
             </div>
             <div className="flex flex-col gap-1 items-center flex-shrink-0">
                 <button onClick={handleAcceptSuggestion} className="px-2 py-0.5 bg-white border border-brand-blue text-brand-blue rounded-md text-xs font-semibold hover:bg-blue-100">
                   Accept
                 </button>
                  <button onClick={() => setAiSuggestion(null)} className="text-brand-gray-400 hover:text-brand-gray-600 p-0.5">
                      <XIcon className="w-3.5 h-3.5" />
                  </button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
};

const TaskCard: React.FC<{
    task: Task;
    onDelete: () => void;
    onEdit: () => void;
    isSelected: boolean;
    onToggleSelect: () => void;
    isHighlighted: boolean;
    index: number;
}> = ({ task, onDelete, onEdit, isSelected, onToggleSelect, isHighlighted, index }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const kindColors: { [key: string]: string } = {
    Communication: 'bg-blue-100 text-blue-800',
    'Service Request': 'bg-indigo-100 text-indigo-800',
    Task: 'bg-gray-100 text-gray-800',
    'Device Request': 'bg-cyan-100 text-cyan-800',
    'Nutrition Order': 'bg-orange-100 text-orange-800',
    'Medication Request': 'bg-red-100 text-red-800',
    Questionnaire: 'bg-purple-100 text-purple-800',
    Other: 'bg-gray-100 text-gray-800',
  };

    const outcomeTriggers = useMemo(() => { // Outcome triggers: what this task starts
        if (!task.reactiveFlows || task.reactiveFlows.length === 0) return [];
        const triggerIds = task.reactiveFlows.map(flow => flow.trigger.id);
        return [...new Set(triggerIds)]
            .map(triggerId => triggerEvents.find(e => e.id === triggerId))
            .filter((e): e is TriggerEvent => !!e && e.id !== '');
    }, [task.reactiveFlows]);
    
    const startTriggers = useMemo(() => { // Initiating triggers: what starts this task
        if (!task.startTriggers || task.startTriggers.length === 0) return [];
        return task.startTriggers
            .map(triggerId => triggerEvents.find(e => e.id === triggerId))
            .filter((e): e is TriggerEvent => !!e && e.id !== '');
    }, [task.startTriggers]);

  const scheduleSummary = useMemo(() => {
    if (task.schedule) {
      const { frequency, period, unit } = task.schedule;
      return {
        icon: RepeatIcon,
        text: `Repeats ${frequency}x every ${period} ${unit}${period > 1 ? 's' : ''}`,
        color: 'bg-purple-100 text-purple-800',
        title: `This task is on a recurring schedule.`,
      };
    }
    return null;
  }, [task.schedule]);


  return (
    <div className={`flex items-start gap-3 bg-white p-4 rounded-lg border border-brand-gray-200 shadow-sm ${isHighlighted ? 'highlight-animation' : ''}`}>
        <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            aria-label={`Select task: ${task.title}`}
            className={`mt-1 ${checkboxStyles}`}
        />
      <div className="flex-1">
        <div className="flex justify-between items-start">
            <div>
            <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
              <span
                  className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full"
                  style={{ backgroundColor: '#EEF2FF', color: '#4338CA' }}
                  aria-label={`Task number ${index}`}
              >
                  <ListChecksIcon className="w-3.5 h-3.5" />
                  Task {index}
              </span>

              <h4 className="font-semibold text-brand-gray-800">{task.title}</h4>
              
              <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded-full ${kindColors[task.kind]}`}
                  aria-label={`Task kind: ${task.kind}`}
              >
                  {task.kind}
              </span>
              
              {scheduleSummary && (
                  <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1 ${scheduleSummary.color}`}
                      title={scheduleSummary.title}
                      aria-label={`Recurrence: ${scheduleSummary.text}`}
                  >
                      <scheduleSummary.icon className="w-3 h-3" />
                      {scheduleSummary.text}
                  </span>
              )}
              
              <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusColors[task.status]}`}
                  aria-label={`Status: ${task.status}`}
              >
                  {task.status}
              </span>
              
              <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusColors[task.priority]}`}
                  aria-label={`Priority: ${task.priority}`}
              >
                  {task.priority}
              </span>
              
              {task.source === 'AI' && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 flex items-center gap-1"><AiSparkleIcon className="w-3 h-3" /> AI</span>}
              {task.source === 'QM-pack' && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-1">From {task.linkedQM?.[0]}</span>}
            </div>
            {(startTriggers.length > 0 || outcomeTriggers.length > 0) && (
                <div className="mt-1 flex items-center flex-wrap" style={{ fontSize: '14px', rowGap: '4px' }}>
                    {startTriggers.length > 0 && (
                        <div className="flex items-center gap-1.5 group relative">
                            <LightningBoltIcon className="w-[14px] h-[14px] flex-shrink-0" style={{color: '#8B5CF6'}}/>
                            <p>
                                <span className="font-semibold text-brand-gray-500">Starts when: </span>
                                <span className="text-brand-gray-900">{startTriggers.map(t => t.label).join(', ')}</span>
                            </p>
                            <div className="absolute left-0 -bottom-1 translate-y-full w-max max-w-xs p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                                <strong>Trigger: {startTriggers[0].label}</strong><br/>
                                <span>Condition: </span><span className="font-mono bg-gray-700 px-1 rounded">{startTriggers[0].details.condition}</span>
                            </div>
                        </div>
                    )}
                    
                    {startTriggers.length > 0 && outcomeTriggers.length > 0 && (
                        <span className="font-semibold text-brand-gray-400" style={{ padding: '0 8px' }}>•</span>
                    )}

                    {outcomeTriggers.length > 0 && (
                        <div className="flex items-center gap-1.5 group relative">
                            <LightningBoltIcon className="w-[14px] h-[14px] flex-shrink-0" style={{color: '#8B5CF6'}}/>
                            <p>
                                <span className="font-semibold text-brand-gray-500">Reacts to: </span>
                                <span className="text-brand-gray-900">{outcomeTriggers.map(t => t.label).join(', ')}</span>
                            </p>
                            <div className="absolute left-0 -bottom-1 translate-y-full w-max max-w-xs p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                                <strong>Trigger: {outcomeTriggers[0].label}</strong><br/>
                                <span>Condition: </span><span className="font-mono bg-gray-700 px-1 rounded">{outcomeTriggers[0].details.condition}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
            <p className="text-sm text-brand-gray-500 mt-2">
                {task.owner} • Due {new Date(task.dueDate).toLocaleDateString()}
            </p>
            </div>
            <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="text-brand-gray-400 hover:text-brand-gray-600"><MoreVerticalIcon className="w-5 h-5"/></button>
            {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-brand-gray-200">
                    <button onClick={() => { onEdit(); setMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-brand-gray-700 hover:bg-brand-gray-50">Edit Task</button>
                    <button onClick={() => {onDelete(); setMenuOpen(false);}} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete Task</button>
                </div>
            )}
            </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
            <p className="font-medium text-brand-gray-600">Acceptance criteria</p>
            <p className="text-brand-gray-500">{task.acceptanceCriteria}</p>
            </div>
            <div>
            <p className="font-medium text-brand-gray-600">Evidence</p>
            <p className="text-brand-gray-500">{task.fhirEvidence.resource} status is '{task.fhirEvidence.status}'</p>
            </div>
        </div>
      </div>
    </div>
  );
}

const GoalCard: React.FC<{ goal: Goal; onUpdateGoal: (goal: Goal) => void; onDeleteGoal: () => void; onEditGoal: () => void; highlightedItems: Set<string>; carePlan: CarePlan }> = ({ goal, onUpdateGoal, onDeleteGoal, onEditGoal, highlightedItems, carePlan }) => {
  const [isTasksVisible, setIsTasksVisible] = useState(true);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isQmModalOpen, setIsQmModalOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isAiProposalModalOpen, setIsAiProposalModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [kindFilter, setKindFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const tasksCompleted = goal.tasks.filter(t => t.status === 'Completed').length;
  const tasksDueSoon = goal.tasks.filter(t => t.status !== 'Completed').length;

  const filteredTasks = useMemo(() => {
    return goal.tasks.filter(task => {
        const kindMatch = kindFilter === 'All' || task.kind === kindFilter;
        const statusMatch = statusFilter === 'All' || task.status === statusFilter;
        return kindMatch && statusMatch;
    });
  }, [goal.tasks, kindFilter, statusFilter]);
  
  const handleToggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(taskId)) {
            newSet.delete(taskId);
        } else {
            newSet.add(taskId);
        }
        return newSet;
    });
  };

  const handleSelectAll = (isChecked: boolean) => {
    if(isChecked) {
        setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
    } else {
        setSelectedTaskIds(new Set());
    }
  };
  
  const handleBulkUpdate = (updates: Partial<Task>) => {
    const updatedTasks = goal.tasks.map(task => 
        selectedTaskIds.has(task.id) ? { ...task, ...updates } : task
    );
    onUpdateGoal({ ...goal, tasks: updatedTasks });
    alert(`${selectedTaskIds.size} tasks updated.`);
    setSelectedTaskIds(new Set());
  };

  const handleSaveFromQmModal = (qms: string[], newTasksFromQm: Task[]) => {
    const existingTaskTitles = new Set(goal.tasks.map(t => t.title.toLowerCase()));
    const uniqueNewTasks = newTasksFromQm.filter(t => !existingTaskTitles.has(t.title.toLowerCase()));

    if (uniqueNewTasks.length < newTasksFromQm.length) {
      alert("Some tasks were already present in the goal and were not added again.");
    }
    
    if (uniqueNewTasks.length > 0) {
        alert(`Added ${uniqueNewTasks.length} new tasks to the goal.`);
    }

    onUpdateGoal({
      ...goal,
      qualityMeasures: qms,
      tasks: [...goal.tasks, ...uniqueNewTasks],
    });
  };
  
  const handleSaveTask = (taskToSave: Task) => {
    const isEditing = goal.tasks.some(t => t.id === taskToSave.id);
    const newTasks = isEditing
        ? goal.tasks.map(t => t.id === taskToSave.id ? taskToSave : t)
        : [...goal.tasks, taskToSave];
    onUpdateGoal({...goal, tasks: newTasks});
    setTaskToEdit(null);
    setIsAddTaskModalOpen(false);
  };
  
  const handleSaveNewTasks = (newTasks: Task[]) => { onUpdateGoal({ ...goal, tasks: [...goal.tasks, ...newTasks] }); };
  const handleDeleteTask = (taskId: string) => { onUpdateGoal({...goal, tasks: goal.tasks.filter(t => t.id !== taskId)}); };
  const handleEditTask = (task: Task) => { setTaskToEdit(task); setIsAddTaskModalOpen(true); };

  const handleMetricUpdate = (updatedMetric: GoalMetric) => {
    const updatedMetrics = goal.metrics.map(m =>
        m.name === updatedMetric.name ? updatedMetric : m
    );
    onUpdateGoal({ ...goal, metrics: updatedMetrics });
  };

  const isAllSelected = filteredTasks.length > 0 && selectedTaskIds.size === filteredTasks.length;
  
  const calculateProgress = () => {
    const start = new Date(goal.startDate).getTime();
    const end = new Date(goal.targetDate).getTime();
    const now = new Date().getTime();
    
    if (now >= end) return 100;
    if (now <= start) return 0;
    
    const totalDuration = end - start;
    const elapsedDuration = now - start;
    return Math.min(100, Math.round((elapsedDuration / totalDuration) * 100));
  };

  const progress = calculateProgress();
  const isOverdue = goal.isOverdue || new Date() > new Date(goal.targetDate);
  const isHighlighted = highlightedItems.has(goal.id);


  return (
    <div className={`bg-brand-gray-50 rounded-lg border border-brand-gray-200 ${isHighlighted ? 'highlight-animation' : ''}`}>
      <div className="p-4">
        {/* Top row with title, badges, menu */}
        <div className="flex justify-between items-start gap-4">
          {/* Left side: icon and title/description */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <TargetIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-brand-gray-900">{goal.title}</h3>
              <p className="text-sm text-brand-gray-500 mt-1">{goal.description}</p>
            </div>
          </div>
          {/* Right side: badges and menu */}
          <div className="flex-shrink-0 flex items-center gap-2 flex-wrap justify-end">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[goal.status] || 'bg-gray-100 text-gray-800'}`}>{goal.status}</span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[goal.priority] || 'bg-gray-100 text-gray-800'}`}>{goal.priority}</span>
              {goal.qualityMeasures.map(qm => (
                <span key={qm} className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">{qm}</span>
              ))}
              <div className="flex items-center">
                  <button onClick={onEditGoal} className="p-1 rounded-full hover:bg-brand-gray-100" aria-label="Edit goal details">
                    <PencilIcon className="w-5 h-5 text-brand-gray-400 hover:text-brand-gray-600" />
                  </button>
                  <div className="relative">
                      <button onClick={() => setIsMenuOpen(prev => !prev)} className="p-1 rounded-full hover:bg-brand-gray-100">
                          <MoreVerticalIcon className="w-5 h-5 text-brand-gray-400 hover:text-brand-gray-600" />
                      </button>
                      {isMenuOpen && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border border-brand-gray-200">
                              <button onClick={() => { onDeleteGoal(); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete Goal</button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-brand-gray-500 mb-1">
            <span>Started: {new Date(goal.startDate).toLocaleDateString()}</span>
            <span>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
          </div>
          <div className="w-full bg-brand-gray-200 rounded-full h-2">
            <div className={`h-2 rounded-full ${isOverdue ? 'bg-brand-red' : 'bg-brand-blue'}`} style={{ width: `${progress}%` }}></div>
          </div>
          {isOverdue && <p className="text-right text-sm text-brand-red mt-1 font-semibold">Overdue</p>}
        </div>

        {/* Diagnoses and Metrics */}
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {goal.diagnoses.map(dx => (
              <span key={dx} className="px-2 py-1 bg-gray-200 text-gray-800 text-xs font-medium rounded-full">{dx}</span>
            ))}
          </div>
          {goal.metrics.length > 0 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {goal.metrics.map(metric => (
                <MetricCard 
                  key={metric.name} 
                  metric={metric}
                  onUpdate={handleMetricUpdate}
                  goal={goal}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="bg-white p-4 rounded-b-lg border-t border-brand-gray-200">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <button onClick={() => setIsTasksVisible(!isTasksVisible)} className="flex items-center gap-2 font-semibold text-brand-gray-700">
            <ChevronDownIcon className={`w-5 h-5 transition-transform ${isTasksVisible ? '' : '-rotate-90'}`} />
            Tasks ({tasksCompleted} completed • {tasksDueSoon} due soon)
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsProgressModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50"><EyeIcon className="w-4 h-4" /> View Progress</button>
            <button onClick={() => setIsQmModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50"><LinkIcon className="w-4 h-4" /> Link Quality Measure</button>
          </div>
        </div>

        {isTasksVisible && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => { setTaskToEdit(null); setIsAddTaskModalOpen(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600"><PlusIcon className="w-5 h-5" /> Add Task</button>
              <button onClick={() => setIsAiProposalModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600"><AiSparkleIcon className="w-5 h-5" /> Add with AI</button>
               <select onChange={(e) => setKindFilter(e.target.value)} value={kindFilter} className="h-10 px-3 py-2 bg-white text-brand-gray-700 border border-brand-gray-300 rounded-md text-sm focus:ring-1 focus:ring-brand-blue focus:border-brand-blue"><option value="All">All Kinds</option><option value="Communication">Communication</option><option value="Device Request">Device Request</option><option value="Medication Request">Medication Request</option><option value="Nutrition Order">Nutrition Order</option><option value="Other">Other</option></select>
               <select onChange={(e) => setStatusFilter(e.target.value)} value={statusFilter} className="h-10 px-3 py-2 bg-white text-brand-gray-700 border border-brand-gray-300 rounded-md text-sm focus:ring-1 focus:ring-brand-blue focus:border-brand-blue"><option value="All">All Status</option><option value="Pending">Pending</option><option value="In progress">In progress</option><option value="Completed">Completed</option><option value="At risk">At risk</option></select>
            </div>
            
            {selectedTaskIds.size > 0 && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={isAllSelected} onChange={(e) => handleSelectAll(e.target.checked)} className={checkboxStyles} />
                        <span className="text-sm font-semibold text-brand-blue">{selectedTaskIds.size} selected</span>
                    </div>
                    <button onClick={() => handleBulkUpdate({ status: 'Completed' })} className="text-sm text-brand-gray-700 font-semibold hover:underline">Mark completed</button>
                    <button onClick={() => { const newOwner = prompt("Enter new owner (Patient, Care Manager, PCP, Specialist):", "Care Manager"); if (newOwner) handleBulkUpdate({ owner: newOwner as TaskOwner }); }} className="text-sm text-brand-gray-700 font-semibold hover:underline">Change owner</button>
                    <button onClick={() => { const newDate = prompt("Enter new due date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]); if (newDate) handleBulkUpdate({ dueDate: newDate }); }} className="text-sm text-brand-gray-700 font-semibold hover:underline">Change due date</button>
                    <button onClick={() => setSelectedTaskIds(new Set())} className="text-sm text-red-600 font-semibold hover:underline ml-auto">Clear selection</button>
                </div>
            )}

            {filteredTasks.length > 0 ? (
                filteredTasks.map((task, i) => <TaskCard key={task.id} index={i + 1} task={task} onDelete={() => handleDeleteTask(task.id)} onEdit={() => handleEditTask(task)} isSelected={selectedTaskIds.has(task.id)} onToggleSelect={() => handleToggleTaskSelection(task.id)} isHighlighted={highlightedItems.has(task.id)} />)
            ) : <p className="text-center text-brand-gray-500 py-4">No tasks match the current filters.</p>}
          </div>
        )}
      </div>
      <GoalProgressModal isOpen={isProgressModalOpen} onClose={() => setIsProgressModalOpen(false)} goal={goal} />
      <LinkQmModal 
        isOpen={isQmModalOpen} 
        onClose={() => setIsQmModalOpen(false)} 
        linkedQms={goal.qualityMeasures} 
        onSave={handleSaveFromQmModal} 
        goalMetrics={goal.metrics}
      />
      <AddTaskModal 
        isOpen={isAddTaskModalOpen}
        onClose={() => { setIsAddTaskModalOpen(false); setTaskToEdit(null); }}
        onSave={handleSaveTask}
        goalId={goal.id}
        linkedQms={goal.qualityMeasures}
        linkedTargets={goal.metrics.map(m => m.name)}
        taskToEdit={taskToEdit}
        carePlan={carePlan}
      />
      <AiTaskProposalModal isOpen={isAiProposalModalOpen} onClose={() => setIsAiProposalModalOpen(false)} onSave={handleSaveNewTasks} goal={goal} carePlan={carePlan} />
    </div>
  );
};

export const GoalsTasksStep: React.FC<GoalsTasksStepProps> = ({ carePlan, setCarePlan, highlightedItems }) => {
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [isAiGoalModalOpen, setIsAiGoalModalOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);

  const handleSaveNewGoal = (newGoal: Goal) => {
    setCarePlan(prev => ({ ...prev, goals: [...prev.goals, newGoal] }));
  };
  
  const handleSaveNewGoals = (newGoals: Goal[]) => {
    setCarePlan(prev => ({ ...prev, goals: [...prev.goals, ...newGoals] }));
  };

  const handleUpdateGoal = (updatedGoal: Goal) => {
    setCarePlan(prev => ({ ...prev, goals: prev.goals.map(g => g.id === updatedGoal.id ? updatedGoal : g) }));
  };

  const handleDeleteGoal = (goalId: string) => {
    if (window.confirm('Are you sure you want to delete this goal and all its tasks?')) {
        setCarePlan(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== goalId) }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-brand-gray-900">Goals Builder</h2>
          <p className="text-brand-gray-500">Create clinical goals with targets and timelines.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsAddGoalModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-md font-semibold hover:bg-blue-600"><PlusIcon className="w-5 h-5"/>Add Goal</button>
          <button onClick={() => setIsAiGoalModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-md font-semibold hover:bg-blue-600"><AiSparkleIcon className="w-5 h-5"/>Add with AI</button>
        </div>
      </div>

      <div className="space-y-4">
        {carePlan.goals.map(goal => ( <GoalCard key={goal.id} goal={goal} onUpdateGoal={handleUpdateGoal} onDeleteGoal={() => handleDeleteGoal(goal.id)} onEditGoal={() => setGoalToEdit(goal)} highlightedItems={highlightedItems} carePlan={carePlan} /> ))}
      </div>
      
      <AddGoalModal 
        isOpen={isAddGoalModalOpen}
        onClose={() => setIsAddGoalModalOpen(false)}
        onSave={handleSaveNewGoal}
        primaryDiagnoses={carePlan.diagnoses.primary}
      />
      <AiGoalProposalModal
        isOpen={isAiGoalModalOpen}
        onClose={() => setIsAiGoalModalOpen(false)}
        onSave={handleSaveNewGoals}
        carePlan={carePlan}
      />
      {goalToEdit && (
        <EditGoalModal
            isOpen={!!goalToEdit}
            onClose={() => setGoalToEdit(null)}
            onSave={(updatedGoal) => {
                handleUpdateGoal(updatedGoal);
                setGoalToEdit(null);
            }}
            goal={goalToEdit}
            primaryDiagnoses={carePlan.diagnoses.primary}
        />
      )}
    </div>
  );
};