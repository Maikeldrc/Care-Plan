
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { CarePlan, Goal, Task } from '../../types';
import { AddTaskModal } from '../modals/AddTaskModal';
import { LightningBoltIcon } from '../icons/LightningBoltIcon';
import { MultiSelectFilter } from '../shared/MultiSelectFilter';
import { UserGroupIcon } from '../icons/UserGroupIcon';

// --- Type definitions ---
interface TimelineStepProps {
  carePlan: CarePlan;
  setCarePlan: React.Dispatch<React.SetStateAction<CarePlan>>;
}
type ViewMode = 'month' | 'quarter';

interface RenderableTask {
    task: Task;
    goal: Goal;
    left: number;
    top: number;
    width: number;
    isVisible: boolean;
    isDimmed: boolean;
}

interface OverflowMarker {
    dayIndex: number;
    left: number;
    top: number;
    tasks: Task[];
    goal: Goal;
}

interface GoalLayout {
    goal: Goal;
    tasks: RenderableTask[];
    overflows: OverflowMarker[];
    rowHeight: number;
}


// --- Date Helper Functions ---
const DAY_MS = 24 * 60 * 60 * 1000;
const startOfDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const getDaysBetween = (start: Date, end: Date) => {
    const startTime = startOfDate(start).getTime();
    const endTime = startOfDate(end).getTime();
    return Math.round((endTime - startTime) / DAY_MS);
};
const addDays = (date: Date, days: number) => {
    const newDate = new Date(date.valueOf());
    newDate.setDate(newDate.getDate() + days);
    return newDate;
};

// --- Style & Layout Constants ---
const statusColors: { [key: string]: { bg: string; border: string } } = {
  'Pending': { bg: 'bg-yellow-200', border: 'border-yellow-400' },
  'In progress': { bg: 'bg-blue-200', border: 'border-blue-400' },
  'Completed': { bg: 'bg-green-200', border: 'border-green-400' },
  'Skipped': { bg: 'bg-gray-300', border: 'border-gray-400' },
  'Cancelled': { bg: 'bg-red-200', border: 'border-red-400' },
  'At risk': { bg: 'bg-orange-200', border: 'border-orange-400' },
};
const DAY_WIDTHS: { [key in ViewMode]: number } = { month: 40, quarter: 15 };
const TASK_HEIGHT = 40;
const TASK_GAP = 6;
const TASK_VERTICAL_OFFSET = 4;
const MAX_VISIBLE_PER_DAY = 3;


// --- Tooltip Component ---
const TaskTooltip: React.FC<{ task: Task; goal: Goal; position: { top: number; left: number } }> = ({ task, goal, position }) => {
  if (!task) return null;
  return (
    <div className="fixed p-3 bg-brand-gray-800 text-white rounded-lg shadow-lg text-xs z-50 transition-opacity" style={{ top: position.top + 10, left: position.left + 10, maxWidth: '250px' }}>
      <p className="font-bold text-sm">{task.title}</p>
      <p><strong>Goal:</strong> {goal.title}</p>
      <p><strong>Category:</strong> {task.kind}</p>
      <p><strong>Assignee:</strong> {task.owner || task.performer?.[0] || 'Unassigned'}</p>
      <p><strong>Due:</strong> {new Date(task.dueDate).toLocaleDateString()}</p>
      <p><strong>Status:</strong> {task.status}</p>
      <p><strong>Priority:</strong> {task.priority}</p>
    </div>
  );
};

// --- Popover for Overflow tasks ---
const OverflowPopover: React.FC<{
    anchorEl: HTMLElement;
    tasks: Task[];
    goal: Goal;
    onClose: () => void;
    onEditTask: (task: Task, goalId: string) => void;
}> = ({ anchorEl, tasks, goal, onClose, onEditTask }) => {
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    if (!anchorEl) return null;

    const rect = anchorEl.getBoundingClientRect();

    return (
        <div ref={popoverRef} className="fixed bg-white rounded-lg shadow-xl border border-brand-gray-300 w-80 max-h-96 overflow-y-auto z-40 p-2" style={{ top: rect.bottom + 5, left: rect.left }}>
            <h4 className="font-bold p-2">Tasks for {new Date(tasks[0].dueDate).toLocaleDateString()}</h4>
            <div className="space-y-1">
                {tasks.map(task => (
                    <div key={task.id} className="p-2 rounded-md hover:bg-brand-gray-100 cursor-pointer" onClick={() => onEditTask(task, goal.id)}>
                        <p className="font-semibold text-sm">{task.title}</p>
                        <p className="text-xs text-brand-gray-500">{task.owner || task.performer?.[0] || 'Unassigned'} - {task.status}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main Timeline Step Component ---
export const TimelineStep: React.FC<TimelineStepProps> = ({ carePlan, setCarePlan }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('quarter');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [taskToEdit, setTaskToEdit] = useState<{ task: Task; goalId: string } | null>(null);
  const [hoveredTask, setHoveredTask] = useState<{ task: Task; goal: Goal; position: { top: number, left: number } } | null>(null);
  const [popoverState, setPopoverState] = useState<{ anchorEl: HTMLElement, tasks: Task[], goal: Goal } | null>(null);

  const [selectedAssignees, setSelectedAssignees] = useState<Set<string>>(new Set(['All']));
  const [showDimmed, setShowDimmed] = useState(true);

  const dayWidth = DAY_WIDTHS[viewMode];

  const { timelineStart, totalDays } = useMemo(() => {
    const numDays = viewMode === 'month' ? 30 : 90;
    const start = startOfDate(currentDate);
    return { timelineStart: start, totalDays: numDays };
  }, [currentDate, viewMode]);

  const allAssignees = useMemo(() => {
    const owners = carePlan.goals.flatMap(g => g.tasks.map(t => t.owner)).filter(Boolean) as string[];
    const performers = carePlan.goals.flatMap(g => g.tasks.flatMap(t => t.performer || [])).filter(Boolean);
    return [...new Set([...owners, ...performers])].sort();
  }, [carePlan.goals]);

  const goalLayouts = useMemo((): GoalLayout[] => {
    return carePlan.goals.map(goal => {
      const drawableTasks = goal.tasks
        .map(task => {
            const assignee = task.owner || task.performer?.[0] || 'Unassigned';
            const matchesFilter = selectedAssignees.has('All') || selectedAssignees.has(assignee);
            return {
                task,
                isVisible: matchesFilter,
                isDimmed: !matchesFilter && showDimmed,
            };
        })
        .filter(t => t.isVisible || t.isDimmed);

      const tasksWithDays = drawableTasks.map(({ task, isVisible, isDimmed }) => {
          const dueDate = new Date(task.dueDate);
          const endDay = getDaysBetween(timelineStart, dueDate);
          const startDay = endDay - 2; // Fixed 3-day duration for visual clarity
          return { task, startDay, endDay, isVisible, isDimmed };
      }).sort((a, b) => a.startDay - b.startDay || a.endDay - b.endDay);

      const lanes: number[] = []; // Stores the end day of the last task in each lane
      const taskLayouts: RenderableTask[] = [];

      tasksWithDays.forEach(({ task, startDay, endDay, isVisible, isDimmed }) => {
          if (endDay < 0 || startDay >= totalDays) return;

          let laneIndex = lanes.findIndex(laneEndDay => laneEndDay < startDay);
          if (laneIndex === -1) {
              laneIndex = lanes.length;
          }
          lanes[laneIndex] = endDay;

          taskLayouts.push({
              task,
              goal,
              top: laneIndex * (TASK_HEIGHT + TASK_GAP) + TASK_VERTICAL_OFFSET,
              left: Math.max(0, startDay) * dayWidth,
              width: (Math.min(endDay, totalDays - 1) - Math.max(0, startDay) + 1) * dayWidth - 4,
              isVisible,
              isDimmed,
          });
      });

      // Handle overflow (+N)
      const overflows: OverflowMarker[] = [];
      const finalTasks: RenderableTask[] = [];
      const tasksByDay = new Map<number, RenderableTask[]>();
      
      taskLayouts.forEach(t => {
          const day = getDaysBetween(timelineStart, new Date(t.task.dueDate));
          if (!tasksByDay.has(day)) tasksByDay.set(day, []);
          tasksByDay.get(day)!.push(t);
      });

      for(const [dayIndex, dayTasks] of tasksByDay.entries()) {
          if (dayTasks.length > MAX_VISIBLE_PER_DAY) {
              dayTasks.sort((a,b) => a.top - b.top);
              finalTasks.push(...dayTasks.slice(0, MAX_VISIBLE_PER_DAY - 1));
              const overflowTasks = dayTasks.slice(MAX_VISIBLE_PER_DAY - 1);
              overflows.push({
                  dayIndex,
                  left: overflowTasks[0].left,
                  top: overflowTasks[0].top,
                  tasks: overflowTasks.map(t => t.task),
                  goal
              });
          } else {
              finalTasks.push(...dayTasks);
          }
      }

      const rowHeight = (lanes.length > 0 ? lanes.length : 1) * (TASK_HEIGHT + TASK_GAP) + TASK_GAP;

      return { goal, tasks: finalTasks, overflows, rowHeight };
    });
  }, [carePlan.goals, timelineStart, totalDays, dayWidth, selectedAssignees, showDimmed]);


  const handleDateNav = (offset: number) => {
    setCurrentDate(prev => addDays(prev, offset));
  };

  const handleEditTask = (task: Task, goalId: string) => {
    setTaskToEdit({ task, goalId });
    setPopoverState(null);
  };
  
  const handleSaveTask = (taskToSave: Task) => {
    if (!taskToEdit) return;
    const { goalId } = taskToEdit;
    setCarePlan(prevPlan => {
        const newPlan = JSON.parse(JSON.stringify(prevPlan));
        const goal = newPlan.goals.find((g: Goal) => g.id === goalId);
        if (!goal) return newPlan;

        const taskIndex = goal.tasks.findIndex((t: Task) => t.id === taskToSave.id);
        if (taskIndex > -1) {
            goal.tasks[taskIndex] = taskToSave;
        }
        return newPlan;
    });
    setTaskToEdit(null);
  };
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task, goalId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, goalId, originalDueDate: task.dueDate }));
    e.dataTransfer.effectAllowed = "move";
  };
  
  const todayIndex = getDaysBetween(timelineStart, new Date());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-gray-900">Care Plan Timeline</h2>
        <p className="text-brand-gray-500">A visual overview of tasks scheduled over time. Drag tasks to reschedule (feature in development).</p>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => handleDateNav(-30)} className="px-3 py-1 border rounded-md text-sm hover:bg-brand-gray-100">{'<<'} Prev</button>
          <span className="font-semibold text-brand-gray-800">{timelineStart.toLocaleDateString('default', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => handleDateNav(30)} className="px-3 py-1 border rounded-md text-sm hover:bg-brand-gray-100">Next {'>>'}</button>
        </div>
        <div className="flex items-center gap-4">
          <MultiSelectFilter
            label="Assignees"
            options={['Unassigned', ...allAssignees]}
            selected={selectedAssignees}
            onChange={setSelectedAssignees}
            icon={<UserGroupIcon className="w-5 h-5"/>}
          />
          <div className="flex items-center">
            <input type="checkbox" id="show-dimmed" checked={showDimmed} onChange={e => setShowDimmed(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue" />
            <label htmlFor="show-dimmed" className="ml-2 text-sm font-medium text-brand-gray-700">Show dimmed others</label>
          </div>
          <div className="flex items-center gap-2 p-1 bg-brand-gray-100 rounded-lg">
            {(['month', 'quarter'] as ViewMode[]).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} className={`px-3 py-1 text-sm font-semibold rounded-md capitalize ${viewMode === mode ? 'bg-white shadow-sm' : 'text-brand-gray-600'}`}>
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg bg-white">
        <div className="relative" style={{ width: totalDays * dayWidth }}>
          {/* Header */}
          <div className="sticky top-0 z-10 grid bg-brand-gray-50 border-b" style={{ gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)`}}>
            {Array.from({ length: totalDays }).map((_, i) => {
              const date = addDays(timelineStart, i);
              const isFirstOfMonth = date.getDate() === 1;
              return (
                <div key={i} className={`h-12 text-center border-r ${isFirstOfMonth ? 'border-l-2 border-l-brand-blue' : ''}`}>
                  {isFirstOfMonth && <div className="text-xs font-bold text-brand-blue -ml-2 pl-1">{date.toLocaleDateString('default', { month: 'short' })}</div>}
                  <div className="text-xs">{date.getDate()}</div>
                  <div className="text-xs font-bold">{date.toLocaleDateString('default', { weekday: 'short' })[0]}</div>
                </div>
              );
            })}
          </div>

          {/* Body */}
          <div className="relative">
             {todayIndex >= 0 && todayIndex < totalDays && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20" style={{ left: todayIndex * dayWidth + (dayWidth / 2) }}>
                    <div className="absolute -top-5 -translate-x-1/2 left-1/2 text-xs font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">TODAY</div>
                </div>
             )}

            {goalLayouts.map(({ goal, tasks, overflows, rowHeight }) => (
              <div key={goal.id} className="flex border-b" style={{ height: rowHeight }}>
                <div className="sticky left-0 font-semibold text-sm p-3 bg-white border-r min-w-[200px] w-[200px] z-20">{goal.title}</div>
                <div className="relative flex-1">
                  {tasks.map(({ task, top, left, width, isVisible, isDimmed }) => {
                    const color = statusColors[task.status] || { bg: 'bg-gray-200', border: 'border-gray-400' };
                    return (
                      <div
                        key={task.id}
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, task, goal.id)}
                        className={`absolute rounded-md px-2 py-1 text-xs font-semibold overflow-hidden whitespace-nowrap cursor-pointer hover:ring-2 hover:ring-brand-blue z-10 ${color.bg} border-l-4 ${color.border} ${isDimmed ? 'opacity-30' : ''}`}
                        style={{ top, left, width, height: TASK_HEIGHT }}
                        onClick={() => handleEditTask(task, goal.id)}
                        onMouseEnter={(e) => setHoveredTask({ task, goal, position: { top: e.clientY, left: e.clientX } })}
                        onMouseLeave={() => setHoveredTask(null)}
                      >
                        <div className="flex items-center gap-1">
                           {task.priority === 'High' && <LightningBoltIcon className="w-3 h-3 text-red-600 flex-shrink-0" />}
                           <span className="truncate">{task.title}</span>
                        </div>
                      </div>
                    );
                  })}
                  {overflows.map((overflow, i) => (
                      <button 
                        key={i}
                        onClick={(e) => setPopoverState({ anchorEl: e.currentTarget, tasks: overflow.tasks, goal: overflow.goal })}
                        className="absolute w-8 h-8 flex items-center justify-center bg-brand-gray-200 text-brand-gray-700 font-bold text-xs rounded-full border-2 border-white hover:bg-brand-gray-300 z-10"
                        style={{ top: overflow.top + (TASK_HEIGHT / 4), left: overflow.left + (dayWidth / 2) - 16 }}
                      >
                        +{overflow.tasks.length}
                      </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {carePlan.goals.length === 0 && (
          <div className="text-center p-8 text-brand-gray-500 border-2 border-dashed rounded-lg mt-4">
              <p className="font-semibold">No goals to display.</p>
              <p className="text-sm">Add goals and tasks in the 'Goals & Tasks' step to see them here.</p>
          </div>
      )}

      {hoveredTask && <TaskTooltip task={hoveredTask.task} goal={hoveredTask.goal} position={hoveredTask.position} />}
      {popoverState && <OverflowPopover {...popoverState} onClose={() => setPopoverState(null)} onEditTask={handleEditTask} />}
      
      {taskToEdit && (
        <AddTaskModal
          isOpen={!!taskToEdit}
          onClose={() => setTaskToEdit(null)}
          onSave={handleSaveTask}
          goalId={taskToEdit.goalId}
          taskToEdit={taskToEdit.task}
          carePlan={carePlan}
          linkedQms={carePlan.goals.find(g => g.id === taskToEdit.goalId)?.qualityMeasures || []}
          linkedTargets={carePlan.goals.find(g => g.id === taskToEdit.goalId)?.metrics.map(m => m.name) || []}
        />
      )}
    </div>
  );
};
