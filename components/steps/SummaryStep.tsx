

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { CarePlan, Goal, Task, TaskStatus, EducationMaterial, EducationStatus, EducationCategory, EducationFormat, Instruction, InstructionCategory, Barrier, Mitigation } from '../../types';
import { AiSparkleIcon } from '../icons/AiSparkleIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { ShareIcon } from '../icons/ShareIcon';
import { AiOptimizationModal } from '../modals/AiOptimizationModal';
import { AddTaskModal } from '../modals/AddTaskModal';
import { FloppyDiskIcon } from '../icons/FloppyDiskIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { BookOpenIcon } from '../icons/BookOpenIcon';
import { TargetIcon } from '../icons/TargetIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { ListChecksIcon } from '../icons/ListChecksIcon';
import { EducationViewModal } from '../modals/EducationViewModal';
import { EducationEditModal } from '../modals/EducationEditModal';
import { EducationScheduleModal } from '../modals/EducationScheduleModal';
import { DeleteConfirmationModal } from '../modals/DeleteConfirmationModal';
import { PlusIcon } from '../icons/PlusIcon';
import { HeartIcon } from '../icons/HeartIcon';
import { BeakerIcon } from '../icons/BeakerIcon';
import { PillIcon } from '../icons/PillIcon';
import { BrainIcon } from '../icons/BrainIcon';
import { XIcon } from '../icons/XIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { barrierRepository } from '../../data/barrierRepository';
import { getAiBarrierAutofill } from '../../services/geminiService';
import { BuildingOfficeIcon } from '../icons/BuildingOfficeIcon';


interface SummaryStepProps {
    carePlan: CarePlan;
    setCarePlan: React.Dispatch<React.SetStateAction<CarePlan>>;
}

const statusColors: { [key: string]: string } = {
  'On track': 'bg-green-100 text-green-800',
  'At risk': 'bg-yellow-100 text-yellow-800',
  'Active': 'bg-blue-100 text-blue-800',
  'Resolved': 'bg-green-100 text-green-800'
};

const taskStatusColors: { [key in TaskStatus]: string } = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'In progress': 'bg-blue-100 text-blue-800 border-blue-200',
  Completed: 'bg-green-100 text-green-800 border-green-200',
  Skipped: 'bg-gray-200 text-gray-700 border-gray-300',
  Cancelled: 'bg-red-100 text-red-700 border-red-200',
  'At risk': 'bg-orange-100 text-orange-700 border-orange-200',
};

const getDaysBetween = (start: Date, end: Date) => {
    const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return Math.round((endTime - startTime) / (1000 * 60 * 60 * 24));
};


const CareProgramOverviewCard: React.FC<{ carePlan: CarePlan }> = ({ carePlan }) => {
    const priorityColors: { [key: string]: string } = {
        Low: 'bg-emerald-100 text-emerald-800',
        Medium: 'bg-amber-100 text-amber-800',
        High: 'bg-red-200 text-red-800',
    };

    return (
        <div className="bg-white p-6 border border-brand-gray-200 rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <ClipboardListIcon className="w-5 h-5 text-brand-blue" />
                </div>
                <h3 className="text-base font-semibold text-gray-800">Care Program & Patient Overview</h3>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-y-6 gap-x-6">
                <div>
                    <p className="text-sm text-gray-500">Program</p>
                    <p className="text-sm font-medium text-gray-800 mt-1 truncate">{carePlan.careProgram}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500">Timeframe</p>
                    <p className="text-sm font-medium text-gray-800 mt-1">{carePlan.timeframe.targetHorizon}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="text-sm font-medium text-gray-800 mt-1">
                        {new Date(carePlan.timeframe.startDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        })}
                    </p>
                </div>
                <div>
                    <p className="text-sm text-gray-500">Priority</p>
                    <div className="mt-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${priorityColors[carePlan.timeframe.priority] || 'bg-gray-100 text-gray-800'}`}>
                            {carePlan.timeframe.priority}
                        </span>
                    </div>
                </div>
            </div>
            <div className="mt-6 pt-4 border-t border-brand-gray-200">
                <p className="text-sm text-gray-500">Diagnoses</p>
                <div className="mt-2 flex flex-wrap gap-2">
                    {carePlan.diagnoses.primary.map(dx => (
                        <span 
                            key={dx}
                            title={dx}
                            className="px-2 py-1 text-xs font-medium bg-red-100 text-red-900 rounded-lg"
                        >
                            {dx}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};


const AccordionItem: React.FC<{ title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border border-brand-gray-200 rounded-lg bg-white">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left">
                <div className="flex-1">{title}</div>
                <ChevronDownIcon className={`w-5 h-5 transition-transform text-brand-gray-500 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="p-4 border-t border-brand-gray-200 bg-brand-gray-50/50">{children}</div>}
        </div>
    );
};

const SummaryCard: React.FC<{
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    count?: number | null;
    addButtonLabel?: string;
    onAddClick?: () => void;
    addTooltip?: string;
}> = ({ title, icon, children, count, addButtonLabel, onAddClick, addTooltip }) => (
     <div className="bg-white p-6 border border-brand-gray-200 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-brand-blue flex-shrink-0">{icon}</div>
                <h3 className="text-lg font-bold text-brand-gray-900 flex items-center gap-2">
                    {title}
                    {count !== null && count !== undefined && <span className="px-2 py-0.5 text-sm font-semibold rounded-full bg-brand-gray-200 text-brand-gray-700">{count}</span>}
                </h3>
            </div>
             {addButtonLabel && onAddClick && (
                <button
                    onClick={onAddClick}
                    title={addTooltip}
                    className="self-end sm:self-auto flex items-center gap-1 px-3 py-2 border border-brand-gray-300 rounded-lg text-sm font-medium text-brand-gray-700 hover:bg-brand-gray-100 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-colors"
                >
                    <PlusIcon className="w-4 h-4" />
                    {addButtonLabel}
                </button>
            )}
        </div>
        {children}
    </div>
);

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-white p-4 border border-brand-gray-200 rounded-lg shadow-sm flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-brand-blue flex-shrink-0">{icon}</div>
        <div>
            <p className="text-sm text-brand-gray-500">{title}</p>
            <p className="text-xl font-bold text-brand-gray-900">{value}</p>
        </div>
    </div>
);

const TaskRow: React.FC<{ task: Task; onStatusChange: (status: TaskStatus) => void; onEdit: () => void }> = ({ task, onStatusChange, onEdit }) => (
    <div className="grid grid-cols-12 items-center gap-4 text-sm p-2 rounded-md hover:bg-brand-gray-100">
        <div className="col-span-5 font-medium text-brand-gray-800">{task.title}</div>
        <div className="col-span-2 text-brand-gray-600">{new Date(task.dueDate).toLocaleDateString()}</div>
        <div className="col-span-2 text-brand-gray-600">{task.owner}</div>
        <div className="col-span-2">
            <select
                value={task.status}
                onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
                className={`w-full text-xs font-semibold rounded border-2 p-1 focus:ring-1 focus:ring-brand-blue ${taskStatusColors[task.status]}`}
            >
                {Object.keys(taskStatusColors).map(status => (
                    <option key={status} value={status}>{status}</option>
                ))}
            </select>
        </div>
        <div className="col-span-1 text-right">
            <button onClick={onEdit} className="p-1.5 text-brand-gray-400 hover:text-brand-gray-600 rounded-full hover:bg-brand-gray-200">
                <PencilIcon className="w-4 h-4" />
            </button>
        </div>
    </div>
);


const StatusPill: React.FC<{ status: EducationStatus }> = ({ status }) => {
    type DisplayStatus = { label: 'Assigned' | 'In Progress' | 'Completed'; color: string; textColor: string };

    const getDisplayStatus = (): DisplayStatus => {
        switch (status) {
            case 'Not Scheduled':
            case 'Scheduled':
            case 'Assigned':
                return { label: 'Assigned', color: 'bg-yellow-100', textColor: 'text-yellow-800' };
            case 'Delivered':
            case 'Viewed':
            case 'Overdue':
                return { label: 'In Progress', color: 'bg-blue-100', textColor: 'text-blue-800' };
            case 'Completed':
            case 'Reviewed':
                return { label: 'Completed', color: 'bg-green-100', textColor: 'text-green-800' };
            default:
                return { label: 'Assigned', color: 'bg-yellow-100', textColor: 'text-yellow-800' };
        }
    };
    
    const displayStatus = getDisplayStatus();
    const isOverdue = status === 'Overdue';

    return (
        <div className="flex items-center gap-1.5" title={isOverdue ? 'This item is overdue' : `Status: ${status}`}>
            {isOverdue && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${displayStatus.color} ${displayStatus.textColor}`}>
                {displayStatus.label}
            </span>
        </div>
    );
};

const EducationRow: React.FC<{
    material: EducationMaterial;
    onView: () => void;
    onEdit: () => void;
}> = ({ material, onView, onEdit }) => {
    const categoryIconMap: { [key in EducationCategory]?: React.ReactNode } = {
        'Cardiovascular Health': <HeartIcon className="w-4 h-4 text-red-500" />,
        'Diabetes Management': <BeakerIcon className="w-4 h-4 text-cyan-500" />,
        'Medication': <PillIcon className="w-4 h-4 text-blue-500" />,
        'Mental Health': <BrainIcon className="w-4 h-4 text-indigo-500" />,
    };

    const Icon = categoryIconMap[material.category] || <BookOpenIcon className="w-4 h-4 text-gray-500" />;

    return (
        <div className="grid grid-cols-12 gap-4 px-4 h-16 items-center rounded-lg hover:bg-blue-50 transition-colors group">
            <div className="col-span-5 flex items-center gap-3">
                {Icon}
                <button onClick={onView} className="font-semibold text-sm text-brand-gray-800 text-left hover:underline truncate" title={material.title}>
                    {material.title}
                </button>
            </div>
            <div className="col-span-2 text-xs text-gray-500 truncate" title={material.category}>
                {material.category}
            </div>
            <div className="col-span-2">
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{material.languages[0]}</span>
            </div>
            <div className="col-span-2">
                <StatusPill status={material.status} />
            </div>
            <div className="col-span-1 text-right">
                <button onClick={onEdit} className="p-1.5 text-brand-gray-400 group-hover:text-brand-blue rounded-full" title="Edit education">
                    <PencilIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

const instructionCategoryColors: { [key in InstructionCategory]: { chip: string, text: string } } = {
  Medication: { chip: 'bg-red-200', text: 'text-red-800' },
  Monitoring: { chip: 'bg-blue-200', text: 'text-blue-800' },
  Appointment: { chip: 'bg-yellow-200', text: 'text-yellow-800' },
  Lifestyle: { chip: 'bg-green-200', text: 'text-green-800' },
  Education: { chip: 'bg-purple-200', text: 'text-purple-800' },
};

const InstructionCard: React.FC<{
    instruction: Instruction,
    onEdit: () => void,
    onDelete: () => void,
}> = ({ instruction, onEdit, onDelete }) => {
    return (
        <div className="bg-white p-4 rounded-xl border border-brand-gray-200 shadow-sm transition-shadow hover:shadow-md h-full flex flex-col">
            <div className="flex justify-between items-start">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${instructionCategoryColors[instruction.category].chip} ${instructionCategoryColors[instruction.category].text}`}>{instruction.category}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                     <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 text-brand-gray-500 hover:text-blue-600 rounded-full hover:bg-brand-gray-100" aria-label="Edit instruction"><PencilIcon className="w-5 h-5"/></button>
                     <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-brand-gray-500 hover:text-red-600 rounded-full hover:bg-brand-gray-100" aria-label="Delete instruction"><TrashIcon className="w-4 h-4"/></button>
                </div>
            </div>
            <div className="flex-grow mt-2">
                <h3 className="font-bold text-base text-brand-gray-900">{instruction.title}</h3>
                <p className="text-sm text-brand-gray-600 mt-2 line-clamp-3">{instruction.details}</p>
            </div>
        </div>
    );
};

const baseInputStyles = "mt-1 block w-full border border-brand-gray-300 text-brand-gray-900 shadow-sm sm:text-sm rounded-md focus:ring-1 focus:ring-brand-blue focus:border-brand-blue disabled:bg-brand-gray-100 disabled:text-brand-gray-500";
const textareaStyles = `${baseInputStyles} px-3 py-2 bg-white`;

const InstructionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (instruction: Instruction) => void;
    instructionToEdit: Instruction | null;
}> = ({ isOpen, onClose, onSave, instructionToEdit }) => {
    const [title, setTitle] = useState('');
    const [details, setDetails] = useState('');
    const [category, setCategory] = useState<InstructionCategory>('Lifestyle');

    useEffect(() => {
        if (isOpen) {
            if (instructionToEdit) {
                setTitle(instructionToEdit.title);
                setDetails(instructionToEdit.details);
                setCategory(instructionToEdit.category);
            } else {
                setTitle('');
                setDetails('');
                setCategory('Lifestyle');
            }
        }
    }, [isOpen, instructionToEdit]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (title.trim().length === 0) {
            alert("Title is required.");
            return;
        }
        
        const now = new Date().toISOString().split('T')[0];
        const instructionToSave: Instruction = {
            ...(instructionToEdit || {
                id: `instr-${Date.now()}`,
                linked_goal_id: null,
                linked_barrier_id: null,
                delivery_method: 'App',
                language: 'English',
                status: 'Active',
                due_rule: null,
                owner: 'Patient',
                created_at: now,
                created_by: 'Care Manager',
                source: 'Manual',
            }),
            title,
            details,
            category,
            updated_at: now,
        };
        onSave(instructionToSave);
        onClose();
    };
    
    const inputStyles = `${baseInputStyles} h-10 px-3 py-2 bg-white`;
    const selectStyles = `${baseInputStyles} h-10 pl-3 pr-10 py-2 bg-white`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-semibold">{instructionToEdit ? 'Edit Instruction' : 'Add Instruction'}</h2>
                    <button onClick={onClose}><XIcon className="w-6 h-6 text-brand-gray-400" /></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="text-sm font-medium">Title (max 80 chars) <span className="text-red-500">*</span></label>
                        <input type="text" maxLength={80} value={title} onChange={e => setTitle(e.target.value)} className={inputStyles} />
                    </div>
                     <div>
                        <label className="text-sm font-medium">Body (max 500 chars)</label>
                        <textarea rows={6} maxLength={500} value={details} onChange={e => setDetails(e.target.value)} className={textareaStyles}></textarea>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value as InstructionCategory)} className={selectStyles}>
                            {Object.keys(instructionCategoryColors).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>
                <div className="p-4 bg-brand-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600">Save</button>
                </div>
            </div>
        </div>
    );
};

const barrierCategoryColors: { [key: string]: { chip: string, text: string } } = {
    'Cognitive Impairment': { chip: 'bg-blue-100', text: 'text-blue-800' }, // Clinical
    'Health Literacy': { chip: 'bg-yellow-100', text: 'text-yellow-800' }, // Behavioral
    'Access to Care': { chip: 'bg-purple-100', text: 'text-purple-800' }, // Social
    'Social & Lifestyle': { chip: 'bg-purple-100', text: 'text-purple-800' }, // Social
    'Technology Access': { chip: 'bg-green-100', text: 'text-green-800' }, // Environmental
    'Financial Barriers': { chip: 'bg-red-100', text: 'text-red-800' }, // Financial
    'Medication Adherence': { chip: 'bg-indigo-100', text: 'text-indigo-800' }, // Adherence
};
  
const BarrierCard: React.FC<{ barrier: Barrier; onEdit: () => void; onDelete: () => void; }> = ({ barrier, onEdit, onDelete }) => {
    const colors = barrierCategoryColors[barrier.category] || { chip: 'bg-gray-200', text: 'text-gray-800' };
    return (
        <div className="bg-white p-4 rounded-xl border border-brand-gray-200 shadow-sm transition-shadow hover:shadow-md h-full flex flex-col">
            <div className="flex justify-between items-start">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors.chip} ${colors.text}`}>{barrier.category}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 text-brand-gray-500 hover:text-blue-600 rounded-full hover:bg-brand-gray-100" aria-label="Edit barrier">
                        <PencilIcon className="w-5 h-5"/>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-brand-gray-500 hover:text-red-600 rounded-full hover:bg-brand-gray-100" aria-label="Delete barrier">
                        <TrashIcon className="w-4 h-4"/>
                    </button>
                </div>
            </div>
            <div className="flex-grow mt-2">
                <h3 className="font-bold text-base text-brand-gray-900">{barrier.description}</h3>
            </div>
        </div>
    );
};

const checkboxStyles = "h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue focus:ring-2 bg-white disabled:opacity-50";

const BarrierModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (barrier: Barrier) => void;
    barrierToEdit: Barrier | null;
}> = ({ isOpen, onClose, onSave, barrierToEdit }) => {
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [mitigations, setMitigations] = useState<string[]>([]);
    const [newMitigation, setNewMitigation] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (barrierToEdit) {
                setCategory(barrierToEdit.category);
                setDescription(barrierToEdit.description);
                setMitigations(barrierToEdit.mitigations.map(m => m.text));
            } else {
                const defaultBarrier = barrierRepository[0];
                setCategory(defaultBarrier.category);
                setDescription(defaultBarrier.description);
                setMitigations(defaultBarrier.suggested_mitigations);
            }
            setNewMitigation('');
        }
    }, [isOpen, barrierToEdit]);

    if (!isOpen) return null;

    const handleCategoryChange = (newCategory: string) => {
        setCategory(newCategory);
        const template = barrierRepository.find(b => b.category === newCategory);
        if (template) {
            setDescription(template.description);
            setMitigations(template.suggested_mitigations);
        }
    };

    const handleAddMitigation = () => {
        if (newMitigation.trim()) {
            setMitigations([...mitigations, newMitigation.trim()]);
            setNewMitigation('');
        }
    };
    
    const handleRemoveMitigation = (index: number) => {
        setMitigations(mitigations.filter((_, i) => i !== index));
    };

    const handleAiAutofill = async () => {
        setIsAiLoading(true);
        try {
            const result = await getAiBarrierAutofill(category, description);
            setDescription(result.description);
            setMitigations(result.mitigations);
        } catch (error) {
            console.error("AI auto-fill failed:", error);
            alert("Failed to get AI auto-fill suggestion.");
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSave = () => {
        const cleanedMitigations = mitigations.map(m => m.trim()).filter(Boolean);
        if (!description.trim()) return alert("Description is required.");
        if (cleanedMitigations.length === 0) return alert("At least one mitigation is required.");

        const finalMitigations: Mitigation[] = [];
        const originalMitigations = barrierToEdit?.mitigations || [];
        const newMitigationTexts = new Set(cleanedMitigations);

        for (const orig of originalMitigations) {
            if (newMitigationTexts.has(orig.text)) {
                finalMitigations.push(orig);
                newMitigationTexts.delete(orig.text);
            }
        }
        
        newMitigationTexts.forEach((newText: string) => {
            finalMitigations.push({ text: newText, completed: false });
        });

        const barrier: Barrier = {
            id: barrierToEdit?.id || `barrier-${Date.now()}`,
            category,
            description: description.trim(),
            mitigations: finalMitigations,
            status: barrierToEdit?.status || 'Active',
            resolved_on: barrierToEdit?.resolved_on || null,
            resolved_by: barrierToEdit?.resolved_by || null,
            last_updated: new Date().toISOString().split('T')[0],
            source: barrierToEdit?.source || 'Manual',
            rationale: barrierToEdit?.rationale,
        };
        onSave(barrier);
    };

    const modalInputStyles = `${baseInputStyles} h-10 px-3 py-2 bg-white`;
    const modalSelectStyles = `${baseInputStyles} h-10 px-3 py-2 bg-white`;
    const modalTextareaStyles = `${baseInputStyles} px-3 py-2 bg-white`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-brand-gray-900">{barrierToEdit ? 'Edit Barrier' : 'Add New Barrier'}</h2>
                    <button onClick={onClose}><XIcon className="w-6 h-6 text-brand-gray-400 hover:text-brand-gray-600" /></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-brand-gray-700">Category</label>
                        <select value={category} onChange={e => handleCategoryChange(e.target.value)} className={modalSelectStyles}>
                            {barrierRepository.map(b => <option key={b.category} value={b.category}>{b.category}</option>)}
                        </select>
                    </div>
                    <div>
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium text-brand-gray-700">Description</label>
                            <button onClick={handleAiAutofill} disabled={isAiLoading} className="flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:bg-blue-50 p-1 rounded-md">
                                <AiSparkleIcon className={`w-4 h-4 ${isAiLoading ? 'animate-aiPulse' : ''}`} />
                                {isAiLoading ? 'Filling...' : 'Auto-fill with AI'}
                            </button>
                        </div>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={modalTextareaStyles}></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-brand-gray-700">Mitigation Strategies</label>
                        <div className="mt-2 space-y-2">
                            {mitigations.map((m, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <input type="text" value={m} onChange={e => {
                                        const newM = [...mitigations];
                                        newM[i] = e.target.value;
                                        setMitigations(newM);
                                    }} className={modalInputStyles} />
                                    <button onClick={() => handleRemoveMitigation(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-md"><TrashIcon className="w-5 h-5" /></button>
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                             <input type="text" value={newMitigation} onChange={e => setNewMitigation(e.target.value)} placeholder="Add a new mitigation..." className={modalInputStyles} onKeyDown={(e) => e.key === 'Enter' && handleAddMitigation()}/>
                             <button onClick={handleAddMitigation} className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600">Add</button>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-brand-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600">Save Barrier</button>
                </div>
            </div>
        </div>
    );
};

export const SummaryStep: React.FC<SummaryStepProps> = ({ carePlan, setCarePlan }) => {
    const [isOptimizeModalOpen, setIsOptimizeModalOpen] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<{ task: Task; goalId: string } | null>(null);

    const [viewingMaterial, setViewingMaterial] = useState<EducationMaterial | null>(null);
    const [editingMaterial, setEditingMaterial] = useState<EducationMaterial | null>(null);
    const [schedulingMaterial, setSchedulingMaterial] = useState<EducationMaterial | null>(null);
    const [materialToRemove, setMaterialToRemove] = useState<EducationMaterial | null>(null);
    
    const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
    const [instructionToEdit, setInstructionToEdit] = useState<Instruction | null>(null);
    const [instructionToDelete, setInstructionToDelete] = useState<Instruction | null>(null);

    const [isBarrierModalOpen, setIsBarrierModalOpen] = useState(false);
    const [barrierToEdit, setBarrierToEdit] = useState<Barrier | null>(null);
    const [barrierToDelete, setBarrierToDelete] = useState<Barrier | null>(null);


    const planHealthStats = useMemo(() => {
        const totalGoals = carePlan.goals.length;
        const onTrackGoals = carePlan.goals.filter(g => g.status === 'On track').length;
        
        const allTasks = carePlan.goals.flatMap(g => g.tasks);
        const totalTasks = allTasks.length;
        const completedTasks = allTasks.filter(t => t.status === 'Completed').length;

        const totalEducation = carePlan.education.length;
        const deliveredEducation = carePlan.education.filter(e => ['Delivered', 'Viewed', 'Completed', 'Reviewed'].includes(e.status)).length;

        const activeBarriers = carePlan.barriers.filter(b => b.status === 'Active').length;

        return {
            goalsOnTrack: totalGoals > 0 ? `${Math.round((onTrackGoals / totalGoals) * 100)}%` : 'N/A',
            tasksCompleted: totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : 'N/A',
            educationDelivered: totalEducation > 0 ? `${Math.round((deliveredEducation / totalEducation) * 100)}%` : 'N/A',
            activeBarriers: activeBarriers.toString(),
        };
    }, [carePlan]);

    const handleApplyChanges = () => {
        setIsApplying(true);
        // In a real app, this would be an API call. Here we simulate it.
        setTimeout(() => {
            setIsApplying(false);
        }, 1500);
    };
    
    const handleUpdateTask = useCallback((goalId: string, updatedTask: Task) => {
        setCarePlan(prev => {
            const goalIndex = prev.goals.findIndex(g => g.id === goalId);
            if (goalIndex === -1) return prev;
            
            const newGoals = [...prev.goals];
            const taskIndex = newGoals[goalIndex].tasks.findIndex(t => t.id === updatedTask.id);
            if (taskIndex === -1) return prev;
            
            newGoals[goalIndex].tasks[taskIndex] = updatedTask;
            return { ...prev, goals: newGoals };
        });
    }, [setCarePlan]);

    const handleSaveTaskFromModal = (taskToSave: Task) => {
        if (!taskToEdit) return;
        handleUpdateTask(taskToEdit.goalId, taskToSave);
        setTaskToEdit(null);
    };

    const handleUpdateEducation = useCallback((updatedMaterial: EducationMaterial) => {
        setCarePlan(prev => ({
            ...prev,
            education: prev.education.map(e => e.id === updatedMaterial.id ? updatedMaterial : e)
        }));
    }, [setCarePlan]);

    const handleConfirmRemoveEducation = useCallback(() => {
        if (materialToRemove) {
            setCarePlan(prev => ({
                ...prev,
                education: prev.education.filter(e => e.id !== materialToRemove.id)
            }));
            setMaterialToRemove(null);
        }
    }, [materialToRemove, setCarePlan]);
    
    const handleSaveInstruction = (instruction: Instruction) => {
        const isEditing = carePlan.instructions.some(i => i.id === instruction.id);
        setCarePlan(prev => ({
            ...prev,
            instructions: isEditing
                ? prev.instructions.map(i => (i.id === instruction.id ? instruction : i))
                : [...prev.instructions, instruction]
        }));
        setIsInstructionModalOpen(false);
        setInstructionToEdit(null);
    };
    
    const handleConfirmDeleteInstruction = () => {
        if (instructionToDelete) {
            setCarePlan(prev => ({
                ...prev,
                instructions: prev.instructions.filter(i => i.id !== instructionToDelete.id),
            }));
            setInstructionToDelete(null);
        }
    };

    const handleSaveBarrier = (barrier: Barrier) => {
        const isEditing = carePlan.barriers.some(b => b.id === barrier.id);
        setCarePlan(prev => ({
            ...prev,
            barriers: isEditing
                ? prev.barriers.map(b => (b.id === barrier.id ? barrier : b))
                : [...prev.barriers, barrier]
        }));
        setIsBarrierModalOpen(false);
        setBarrierToEdit(null);
    };

    const handleConfirmDeleteBarrier = () => {
        if (barrierToDelete) {
            setCarePlan(prev => ({ ...prev, barriers: prev.barriers.filter(b => b.id !== barrierToDelete.id) }));
            setBarrierToDelete(null);
        }
    };


    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-brand-gray-900">Care Plan Summary</h2>
                <p className="text-brand-gray-500 mt-1">Review the complete care plan before finalizing or sharing.</p>
            </div>
            
            <CareProgramOverviewCard carePlan={carePlan} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Goals on Track" value={planHealthStats.goalsOnTrack} icon={<TargetIcon className="w-5 h-5"/>} />
                <StatCard title="Tasks Completed" value={planHealthStats.tasksCompleted} icon={<ListChecksIcon className="w-5 h-5"/>} />
                <StatCard title="Active Barriers" value={planHealthStats.activeBarriers} icon={<ShieldCheckIcon className="w-5 h-5"/>} />
                <StatCard title="Education Delivered" value={planHealthStats.educationDelivered} icon={<BookOpenIcon className="w-5 h-5"/>} />
            </div>
            
            <div className="space-y-6">
                <SummaryCard
                    title="Goals & Tasks"
                    icon={<TargetIcon className="w-5 h-5" />}
                    count={carePlan.goals.length}
                    addButtonLabel="Add Goal or Task"
                    onAddClick={() => alert("Functionality to add a new goal or task from the summary view is in development.")}
                    addTooltip="Add a new goal or task for this patient."
                >
                     <div className="space-y-3">
                        {carePlan.goals.map((goal, index) => {
                            const completedTasks = goal.tasks.filter(t => t.status === 'Completed').length;
                            const progress = goal.tasks.length > 0 ? Math.round((completedTasks / goal.tasks.length) * 100) : 0;
                            const upcomingTasks = goal.tasks.filter(t => t.status !== 'Completed').sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
                            const nextTask = upcomingTasks[0];
                            let timelineCue = 'All tasks complete';
                            if (nextTask) {
                                const daysUntil = getDaysBetween(new Date(), new Date(nextTask.dueDate));
                                if (daysUntil < 0) timelineCue = `Overdue by ${Math.abs(daysUntil)} days`;
                                else if (daysUntil === 0) timelineCue = 'Due today';
                                else timelineCue = `Next due in ${daysUntil} day(s)`;
                            }

                            return (
                                <AccordionItem 
                                    key={goal.id} 
                                    defaultOpen={index === 0}
                                    title={
                                        <div className="flex items-center gap-4 w-full">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[goal.status]}`}>{goal.status}</span>
                                            <h4 className="font-semibold text-brand-gray-800 flex-1">{goal.title}</h4>
                                            <div className="w-32 flex-shrink-0">
                                                <div className="w-full bg-brand-gray-200 rounded-full h-1.5"><div className="bg-brand-blue h-1.5 rounded-full" style={{width: `${progress}%`}}></div></div>
                                                <p className="text-xs text-brand-gray-500 text-right">{progress}% complete</p>
                                            </div>
                                            <p className="text-xs font-medium text-brand-gray-600 w-32 text-right">{timelineCue}</p>
                                        </div>
                                    }
                                >
                                    <div className="space-y-1">
                                         <div className="grid grid-cols-12 items-center gap-4 text-xs font-bold text-brand-gray-500 px-2">
                                            <div className="col-span-5">TASK</div>
                                            <div className="col-span-2">DUE</div>
                                            <div className="col-span-2">OWNER</div>
                                            <div className="col-span-2">STATUS</div>
                                            <div className="col-span-1"></div>
                                        </div>
                                        {goal.tasks.length > 0 ? goal.tasks.map(task => 
                                            <TaskRow key={task.id} task={task} onStatusChange={(newStatus) => handleUpdateTask(goal.id, {...task, status: newStatus})} onEdit={() => setTaskToEdit({task, goalId: goal.id})} />
                                        ) : <p className="text-sm text-brand-gray-500 text-center py-4">No tasks defined for this goal.</p>}
                                    </div>
                                </AccordionItem>
                            );
                        })}
                     </div>
                </SummaryCard>

                 <SummaryCard
                    title="Barriers"
                    icon={<ShieldCheckIcon className="w-5 h-5" />}
                    count={carePlan.barriers.length}
                    addButtonLabel="Add Barrier"
                    onAddClick={() => { setBarrierToEdit(null); setIsBarrierModalOpen(true); }}
                    addTooltip="Add a new barrier to this care plan."
                >
                    {carePlan.barriers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {carePlan.barriers.map(barrier => (
                                <BarrierCard
                                    key={barrier.id}
                                    barrier={barrier}
                                    onEdit={() => { setBarrierToEdit(barrier); setIsBarrierModalOpen(true); }}
                                    onDelete={() => setBarrierToDelete(barrier)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-brand-gray-500">No barriers identified for this care plan.</p>
                        </div>
                    )}
                </SummaryCard>

                <SummaryCard
                    title="Patient Instructions"
                    icon={<ClipboardListIcon className="w-5 h-5" />}
                    count={carePlan.instructions.length}
                    addButtonLabel="Add Instruction"
                    onAddClick={() => { setInstructionToEdit(null); setIsInstructionModalOpen(true); }}
                    addTooltip="Add a new patient instruction."
                >
                    {carePlan.instructions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {carePlan.instructions.map(instr => (
                                <InstructionCard 
                                    key={instr.id}
                                    instruction={instr}
                                    onEdit={() => { setInstructionToEdit(instr); setIsInstructionModalOpen(true); }}
                                    onDelete={() => setInstructionToDelete(instr)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-brand-gray-500">No patient instructions available.</p>
                        </div>
                    )}
                </SummaryCard>

                <SummaryCard
                    title="Patient Education"
                    icon={<BookOpenIcon className="w-5 h-5" />}
                    count={carePlan.education.length}
                    addButtonLabel="Add Education Material"
                    onAddClick={() => alert('This would open a modal to add new education material.')}
                    addTooltip="Add a new education material."
                >
                    {carePlan.education.length > 0 ? (
                        <div className="flow-root">
                            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                    <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-brand-gray-500 uppercase border-b">
                                        <div className="col-span-5">Education Title</div>
                                        <div className="col-span-2">Category</div>
                                        <div className="col-span-2">Language</div>
                                        <div className="col-span-2">Status</div>
                                        <div className="col-span-1 text-right"></div>
                                    </div>
                                    <div className="divide-y divide-gray-200">
                                        {carePlan.education.map(edu => 
                                            <EducationRow 
                                                key={edu.id} 
                                                material={edu}
                                                onView={() => setViewingMaterial(edu)}
                                                onEdit={() => setEditingMaterial(edu)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-brand-gray-500">No patient education materials assigned.</p>
                        </div>
                    )}
                </SummaryCard>

                <SummaryCard
                    title="Provider Information"
                    icon={<BuildingOfficeIcon className="w-5 h-5" />}
                >
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                        <p className="font-semibold text-brand-gray-800">{carePlan.provider.name}</p>
                        {carePlan.provider.clinicName && <p className="text-brand-gray-500">{carePlan.provider.clinicName}</p>}
                        <span className="text-brand-gray-300 hidden sm:inline-block">•</span>
                        <a href={`tel:${carePlan.provider.phone.replace(/[^0-9]/g, '')}`} className="text-brand-blue hover:underline">
                            {carePlan.provider.phone}
                        </a>
                        <span className="text-brand-gray-300 hidden sm:inline-block">•</span>
                        <p className="text-brand-gray-600">{carePlan.provider.address}</p>
                    </div>
                </SummaryCard>
            </div>
            
            <AiOptimizationModal
                isOpen={isOptimizeModalOpen}
                onClose={() => setIsOptimizeModalOpen(false)}
                carePlan={carePlan}
                onApply={(optimizedPlan) => {
                    setCarePlan(optimizedPlan);
                    setIsOptimizeModalOpen(false);
                }}
            />
            {taskToEdit && (
                <AddTaskModal 
                    isOpen={!!taskToEdit}
                    onClose={() => setTaskToEdit(null)}
                    onSave={handleSaveTaskFromModal}
                    goalId={taskToEdit.goalId}
                    taskToEdit={taskToEdit.task}
                    linkedQms={carePlan.goals.find(g => g.id === taskToEdit.goalId)?.qualityMeasures || []}
                    linkedTargets={carePlan.goals.find(g => g.id === taskToEdit.goalId)?.metrics.map(m => m.name) || []}
                    carePlan={carePlan}
                />
            )}
            
            {viewingMaterial && <EducationViewModal isOpen={!!viewingMaterial} onClose={() => setViewingMaterial(null)} material={viewingMaterial} />}
            {editingMaterial && <EducationEditModal isOpen={!!editingMaterial} onClose={() => setEditingMaterial(null)} material={editingMaterial} onSave={handleUpdateEducation} />}
            {schedulingMaterial && <EducationScheduleModal isOpen={!!schedulingMaterial} onClose={() => setSchedulingMaterial(null)} material={schedulingMaterial} onSave={handleUpdateEducation} carePlan={carePlan} />}
            {materialToRemove && <DeleteConfirmationModal isOpen={!!materialToRemove} onClose={() => setMaterialToRemove(null)} onConfirm={handleConfirmRemoveEducation} title="Remove Education Material" message={`Are you sure you want to remove "${materialToRemove?.title}"?`} />}
            
            <InstructionModal
                isOpen={isInstructionModalOpen}
                onClose={() => { setIsInstructionModalOpen(false); setInstructionToEdit(null); }}
                onSave={handleSaveInstruction}
                instructionToEdit={instructionToEdit}
            />
            <DeleteConfirmationModal
                isOpen={!!instructionToDelete}
                onClose={() => setInstructionToDelete(null)}
                onConfirm={handleConfirmDeleteInstruction}
                title="Delete Instruction"
                message={`Are you sure you want to delete this instruction: "${instructionToDelete?.title}"? This action cannot be undone.`}
            />
            <BarrierModal
                isOpen={isBarrierModalOpen}
                onClose={() => { setIsBarrierModalOpen(false); setBarrierToEdit(null); }}
                onSave={handleSaveBarrier}
                barrierToEdit={barrierToEdit}
            />
            <DeleteConfirmationModal
                isOpen={!!barrierToDelete}
                onClose={() => setBarrierToDelete(null)}
                onConfirm={handleConfirmDeleteBarrier}
                title="Delete Barrier"
                message={`Are you sure you want to delete this barrier: "${barrierToDelete?.description}"? This action cannot be undone.`}
                zIndex={100}
            />
            <div className="pt-8 mt-8 border-t border-brand-gray-200 flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={() => setIsOptimizeModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-md font-semibold hover:bg-blue-600 text-sm shadow-sm">
                        <AiSparkleIcon className="w-5 h-5"/> Optimize with AI
                    </button>
                    <button onClick={handleApplyChanges} disabled={isApplying} className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-gray-300 rounded-md font-semibold text-brand-gray-700 hover:bg-brand-gray-50 text-sm shadow-sm disabled:opacity-70">
                        {isApplying ? (
                            <>
                                <span className="w-5 h-5 border-2 border-brand-gray-300 border-t-brand-blue rounded-full animate-spin"></span>
                                Applying...
                            </>
                        ) : (
                            <>
                                <CheckIcon className="w-5 h-5"/> Apply Changes
                            </>
                        )}
                    </button>
                        <button onClick={() => alert("Saving care plan...")} className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-gray-300 rounded-md font-semibold text-brand-gray-700 hover:bg-brand-gray-50 text-sm shadow-sm">
                        <FloppyDiskIcon className="w-5 h-5"/> Save Care Plan
                    </button>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-gray-300 rounded-md font-semibold text-brand-gray-700 hover:bg-brand-gray-50 text-sm">
                        <DownloadIcon className="w-5 h-5"/> Export PDF
                    </button>
                    <button onClick={() => alert("Sharing...")} className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-gray-300 rounded-md font-semibold text-brand-gray-700 hover:bg-brand-gray-50 text-sm">
                        <ShareIcon className="w-5 h-5"/> Share
                    </button>
                </div>
            </div>
        </div>
    );
};