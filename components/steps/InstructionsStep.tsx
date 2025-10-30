import React, { useState, useMemo, useEffect } from 'react';
import type { CarePlan, Instruction, InstructionCategory, InstructionStatus, InstructionOwner, InstructionDeliveryMethod } from '../../types';
import { getAiInstructionProposals } from '../../services/geminiService';
import { AiSparkleIcon } from '../icons/AiSparkleIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { XIcon } from '../icons/XIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { UndoIcon } from '../icons/UndoIcon';
import { PauseIcon } from '../icons/PauseIcon';
import { PlayIcon } from '../icons/PlayIcon';
import { MoreVerticalIcon } from '../icons/MoreVerticalIcon';
import { ArchiveIcon } from '../icons/ArchiveIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { LinkIcon } from '../icons/LinkIcon';
import { DeleteConfirmationModal } from '../modals/DeleteConfirmationModal';

interface InstructionsStepProps {
  carePlan: CarePlan;
  setCarePlan: React.Dispatch<React.SetStateAction<CarePlan>>;
}

const baseInputStyles = "mt-1 block w-full border border-brand-gray-300 text-brand-gray-900 shadow-sm sm:text-sm rounded-md focus:ring-1 focus:ring-brand-blue focus:border-brand-blue disabled:bg-brand-gray-100 disabled:text-brand-gray-500";
const inlineInputBaseStyles = "border border-brand-gray-300 text-brand-gray-900 shadow-sm sm:text-sm rounded-md focus:ring-1 focus:ring-brand-blue focus:border-brand-blue disabled:bg-brand-gray-100 disabled:text-brand-gray-500";
const textareaStyles = `${baseInputStyles} px-3 py-2 bg-white`;
const checkboxStyles = "h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue focus:ring-2 bg-white";

const statusColors: { [key in InstructionStatus]: { chip: string, text: string, border: string } } = {
  Active: { chip: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500' },
  Delivered: { chip: 'bg-green-100', text: 'text-green-800', border: 'border-green-500' },
  Paused: { chip: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-500' },
  Archived: { chip: 'bg-brand-gray-100', text: 'text-brand-gray-600', border: 'border-brand-gray-300' },
};

const categoryColors: { [key in InstructionCategory]: { chip: string, text: string } } = {
  Medication: { chip: 'bg-red-100', text: 'text-red-800' },
  Monitoring: { chip: 'bg-cyan-100', text: 'text-cyan-800' },
  Symptoms: { chip: 'bg-orange-100', text: 'text-orange-800' },
  Appointment: { chip: 'bg-indigo-100', text: 'text-indigo-800' },
  Lifestyle: { chip: 'bg-green-100', text: 'text-green-800' },
  'Follow-up': { chip: 'bg-purple-100', text: 'text-purple-800' },
  Other: { chip: 'bg-gray-200', text: 'text-gray-800' },
};

const InstructionCard: React.FC<{
    instruction: Instruction,
    onEdit: () => void,
    onUpdate: (updatedInstruction: Instruction) => void,
    onArchive: () => void,
}> = ({ instruction, onEdit, onUpdate, onArchive }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleStatusToggle = (newStatus: InstructionStatus) => {
        onUpdate({ ...instruction, status: newStatus, updated_at: new Date().toISOString().split('T')[0] });
    };
    
    const cardBorder = statusColors[instruction.status].border;

    return (
        <div className={`bg-white p-4 rounded-lg border-l-4 shadow-sm transition-all ${cardBorder} ${instruction.status === 'Archived' ? 'opacity-60' : ''}`}>
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${categoryColors[instruction.category].chip} ${categoryColors[instruction.category].text}`}>{instruction.category}</span>
                         <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusColors[instruction.status].chip} ${statusColors[instruction.status].text}`}>{instruction.status}</span>
                    </div>
                    <h3 className="font-bold text-brand-gray-900 mt-2">{instruction.title}</h3>
                </div>
                <div className="flex items-center gap-1">
                     <button onClick={onEdit} className="p-1 text-brand-gray-400 hover:text-brand-gray-600 rounded-full hover:bg-brand-gray-100"><PencilIcon className="w-5 h-5"/></button>
                     <div className="relative">
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1 text-brand-gray-400 hover:text-brand-gray-600 rounded-full hover:bg-brand-gray-100"><MoreVerticalIcon className="w-5 h-5"/></button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border border-brand-gray-200" onMouseLeave={() => setIsMenuOpen(false)}>
                                {instruction.status === 'Active' && <button onClick={() => { handleStatusToggle('Delivered'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-brand-gray-50"><CheckIcon className="w-4 h-4"/> Mark as Delivered</button>}
                                {instruction.status === 'Delivered' && <button onClick={() => { handleStatusToggle('Active'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-brand-gray-50"><UndoIcon className="w-4 h-4"/> Undo Delivered</button>}
                                {instruction.status === 'Active' && <button onClick={() => { handleStatusToggle('Paused'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-brand-gray-50"><PauseIcon className="w-4 h-4"/> Pause</button>}
                                {instruction.status === 'Paused' && <button onClick={() => { handleStatusToggle('Active'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-brand-gray-50"><PlayIcon className="w-4 h-4"/> Resume</button>}
                                {instruction.status !== 'Archived' && <button onClick={() => { onArchive(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 flex items-center gap-2 hover:bg-red-50"><ArchiveIcon className="w-4 h-4"/> Archive</button>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <p className="text-sm text-brand-gray-600 mt-2 line-clamp-2">{instruction.details}</p>
            <div className="mt-4 pt-3 border-t border-brand-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-brand-gray-100 text-brand-gray-700 text-xs font-medium rounded-full">{instruction.delivery_method}</span>
                    <span className="px-2 py-1 bg-brand-gray-100 text-brand-gray-700 text-xs font-medium rounded-full">{instruction.language}</span>
                    <span className="px-2 py-1 bg-brand-gray-100 text-brand-gray-700 text-xs font-medium rounded-full">Owner: {instruction.owner}</span>
                    {instruction.linked_goal_id && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1"><LinkIcon className="w-3 h-3"/> Goal</span>}
                    {instruction.due_rule && <span className="px-2 py-1 bg-brand-gray-100 text-brand-gray-700 text-xs font-medium rounded-full flex items-center gap-1"><ClockIcon className="w-3 h-3"/> {instruction.due_rule}</span>}
                </div>
            </div>
        </div>
    );
};

const InstructionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (instruction: Instruction) => void;
    instructionToEdit: Instruction | null;
    carePlan: CarePlan;
}> = ({ isOpen, onClose, onSave, instructionToEdit, carePlan }) => {
    const [formData, setFormData] = useState<Omit<Instruction, 'id' | 'created_at' | 'updated_at' | 'created_by'>>({
        title: '', details: '', category: 'Other', linked_goal_id: null, linked_barrier_id: null,
        delivery_method: 'App', language: 'English', status: 'Active', due_rule: null, owner: 'Patient', source: 'Manual'
    });

    useEffect(() => {
        if (isOpen) {
            if (instructionToEdit) {
                setFormData(instructionToEdit);
            } else {
                setFormData({
                    title: '', details: '', category: 'Other', linked_goal_id: null, linked_barrier_id: null,
                    delivery_method: 'App', language: 'English', status: 'Active', due_rule: null, owner: 'Patient', source: 'Manual'
                });
            }
        }
    }, [isOpen, instructionToEdit]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (formData.title.trim().length === 0) {
            alert("Title is required.");
            return;
        }
        
        const now = new Date().toISOString().split('T')[0];
        const instructionToSave: Instruction = {
            id: instructionToEdit?.id || `instr-${Date.now()}`,
            created_at: instructionToEdit?.created_at || now,
            created_by: instructionToEdit?.created_by || 'Care Manager',
            ...formData,
            updated_at: now,
        };
        onSave(instructionToSave);
        onClose();
    };
    
    const inputStyles = `${baseInputStyles} h-10 px-3 py-2 bg-white`;
    const selectStyles = `${baseInputStyles} h-10 pl-3 pr-10 py-2 bg-white`;

    const handleInputChange = (field: keyof typeof formData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-semibold">{instructionToEdit ? 'Edit Instruction' : 'Add Instruction'}</h2>
                    <button onClick={onClose}><XIcon className="w-6 h-6 text-brand-gray-400" /></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="text-sm font-medium">Title (≤ 90 chars) <span className="text-red-500">*</span></label>
                        <input type="text" maxLength={90} value={formData.title} onChange={e => handleInputChange('title', e.target.value)} className={inputStyles} />
                    </div>
                     <div>
                        <label className="text-sm font-medium">Details (≤ 500 chars)</label>
                        <textarea rows={4} maxLength={500} value={formData.details} onChange={e => handleInputChange('details', e.target.value)} className={textareaStyles}></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Category</label>
                            <select value={formData.category} onChange={e => handleInputChange('category', e.target.value)} className={selectStyles}>
                                {Object.keys(categoryColors).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Status</label>
                            <select value={formData.status} onChange={e => handleInputChange('status', e.target.value)} className={selectStyles}>
                                {Object.keys(statusColors).map(stat => <option key={stat} value={stat}>{stat}</option>)}
                            </select>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Linked Goal</label>
                            <select value={formData.linked_goal_id || ''} onChange={e => handleInputChange('linked_goal_id', e.target.value || null)} className={selectStyles}>
                                <option value="">None</option>
                                {carePlan.goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Linked Barrier</label>
                            <select value={formData.linked_barrier_id || ''} onChange={e => handleInputChange('linked_barrier_id', e.target.value || null)} className={selectStyles}>
                                 <option value="">None</option>
                                {carePlan.barriers.filter(b => b.status === 'Active').map(b => <option key={b.id} value={b.id}>{b.description.substring(0, 40)}...</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Delivery Method</label>
                             <select value={formData.delivery_method} onChange={e => handleInputChange('delivery_method', e.target.value)} className={selectStyles}>
                                <option>Verbal</option><option>Printed</option><option>SMS</option><option>App</option>
                            </select>
                        </div>
                         <div>
                            <label className="text-sm font-medium">Language</label>
                             <select value={formData.language} onChange={e => handleInputChange('language', e.target.value)} className={selectStyles}>
                                <option>English</option><option>Spanish</option>
                            </select>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Due Rule / Cadence</label>
                            <input type="text" placeholder="e.g., Daily, Weekly, PRN" value={formData.due_rule || ''} onChange={e => handleInputChange('due_rule', e.target.value)} className={inputStyles} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Owner</label>
                            <select value={formData.owner} onChange={e => handleInputChange('owner', e.target.value)} className={selectStyles}>
                                <option>Patient</option><option>Care Manager</option><option>PCP</option>
                            </select>
                        </div>
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

const AiInstructionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (instructions: Instruction[]) => void;
    carePlan: CarePlan;
}> = ({ isOpen, onClose, onSave, carePlan }) => {
    const [proposals, setProposals] = useState<Partial<Instruction>[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            getAiInstructionProposals(carePlan).then(res => {
                setProposals(res);
                setSelectedIndices(new Set(res.map((_, i) => i)));
                setIsLoading(false);
            });
        } else {
            setProposals([]);
            setSelectedIndices(new Set());
        }
    }, [isOpen, carePlan]);

    if (!isOpen) return null;

    const handleToggle = (index: number) => {
        const newSet = new Set(selectedIndices);
        if (newSet.has(index)) newSet.delete(index);
        else newSet.add(index);
        setSelectedIndices(newSet);
    };

    const handleSave = () => {
        const now = new Date().toISOString().split('T')[0];
        const newInstructions = proposals
            .filter((_, i) => selectedIndices.has(i))
            .map((p): Instruction => ({
                id: `instr-${Date.now()}-${Math.random()}`,
                title: p.title || 'Untitled',
                details: p.details || '',
                category: p.category || 'Other',
                linked_goal_id: p.linked_goal_id || null,
                linked_barrier_id: p.linked_barrier_id || null,
                delivery_method: p.delivery_method || 'App',
                language: 'English',
                status: 'Active',
                due_rule: p.due_rule || null,
                owner: 'Patient',
                created_at: now,
                updated_at: now,
                created_by: 'AI Assistant',
                source: 'AI',
                rationale: p.rationale,
            }));
        onSave(newInstructions);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-semibold flex items-center gap-2"><AiSparkleIcon className="w-6 h-6 text-brand-blue" /> AI-Generated Instructions</h2>
                    <button onClick={onClose}><XIcon className="w-6 h-6 text-brand-gray-400" /></button>
                </div>
                <div className="p-6 flex-grow overflow-y-auto">
                    {isLoading ? <p>Loading suggestions...</p> : (
                        <div className="space-y-3">
                            {proposals.map((p, i) => (
                                <div key={i} className="p-3 bg-brand-gray-50 rounded-lg flex items-start gap-3">
                                    <input type="checkbox" checked={selectedIndices.has(i)} onChange={() => handleToggle(i)} className={`${checkboxStyles} mt-1`} />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                           <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${categoryColors[p.category || 'Other'].chip} ${categoryColors[p.category || 'Other'].text}`}>{p.category}</span>
                                           <h4 className="font-semibold text-brand-gray-800">{p.title}</h4>
                                        </div>
                                        <p className="text-sm text-brand-gray-600 mt-1">{p.details}</p>
                                        <p className="text-xs text-brand-blue mt-1 italic">Rationale: {p.rationale}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                 <div className="p-4 bg-brand-gray-50 border-t flex justify-between items-center">
                    <p className="text-sm font-semibold">{selectedIndices.size} of {proposals.length} selected</p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">Dismiss</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600">Approve Selected</button>
                    </div>
                </div>
            </div>
        </div>
    );
};


export const InstructionsStep: React.FC<InstructionsStepProps> = ({ carePlan, setCarePlan }) => {
  const [activeFilters, setActiveFilters] = useState({
      search: '',
      status: 'All',
      category: 'All',
      owner: 'All',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [instructionToEdit, setInstructionToEdit] = useState<Instruction | null>(null);

  const filteredInstructions = useMemo(() => {
    return (carePlan.instructions || []).filter(i => {
        if (activeFilters.status !== 'All' && i.status !== activeFilters.status) return false;
        if (activeFilters.category !== 'All' && i.category !== activeFilters.category) return false;
        if (activeFilters.owner !== 'All' && i.owner !== activeFilters.owner) return false;
        if (activeFilters.search && !i.title.toLowerCase().includes(activeFilters.search.toLowerCase()) && !i.details.toLowerCase().includes(activeFilters.search.toLowerCase())) return false;
        return true;
    });
  }, [carePlan.instructions, activeFilters]);

  const handleUpdate = (updated: Instruction) => {
    setCarePlan(prev => ({ ...prev, instructions: prev.instructions.map(i => i.id === updated.id ? updated : i)}));
  };

  const handleSaveInstruction = (instruction: Instruction) => {
    const isEditing = carePlan.instructions.some(i => i.id === instruction.id);
    setCarePlan(prev => ({
        ...prev,
        instructions: isEditing
            ? prev.instructions.map(i => (i.id === instruction.id ? instruction : i))
            : [...prev.instructions, instruction]
    }));
  };
  
  const handleSaveAiInstructions = (newInstructions: Instruction[]) => {
    setCarePlan(prev => ({ ...prev, instructions: [...prev.instructions, ...newInstructions] }));
  };
  
  const handleArchive = (instruction: Instruction) => {
      if(window.confirm(`Are you sure you want to archive this instruction: "${instruction.title}"?`)) {
        handleUpdate({...instruction, status: 'Archived'});
      }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-gray-900">Patient Instructions</h2>
        <p className="text-brand-gray-500 mt-1">Operational guidance the patient must follow. Education materials are managed elsewhere.</p>
      </div>

      <div className="flex items-center flex-wrap gap-3">
        <input type="search" placeholder="Search instructions..." onChange={e => setActiveFilters(f => ({...f, search: e.target.value}))} className={`${inlineInputBaseStyles} h-10 px-3 py-2 bg-white max-w-xs`} />
        <select onChange={e => setActiveFilters(f => ({...f, status: e.target.value}))} className={`${inlineInputBaseStyles} h-10 pl-3 pr-10 py-2 bg-white`}>
            <option value="All">All Statuses</option>
            {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select onChange={e => setActiveFilters(f => ({...f, category: e.target.value}))} className={`${inlineInputBaseStyles} h-10 pl-3 pr-10 py-2 bg-white`}>
            <option value="All">All Categories</option>
            {Object.keys(categoryColors).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => { setInstructionToEdit(null); setIsModalOpen(true); }} className="ml-auto flex items-center gap-2 px-4 py-2 bg-white border border-brand-gray-300 text-brand-blue rounded-md font-semibold hover:bg-brand-gray-50 text-sm">
          <PlusIcon className="w-5 h-5"/> Add Instruction
        </button>
        <button onClick={() => setIsAiModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-md font-semibold hover:bg-blue-600 text-sm">
          <AiSparkleIcon className="w-5 h-5"/> Generate with AI
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredInstructions.length > 0 ? (
            filteredInstructions.map(instr => (
                <InstructionCard 
                    key={instr.id}
                    instruction={instr}
                    onEdit={() => { setInstructionToEdit(instr); setIsModalOpen(true); }}
                    onUpdate={handleUpdate}
                    onArchive={() => handleArchive(instr)}
                />
            ))
        ) : (
            <div className="lg:col-span-2 text-center py-12 bg-brand-gray-50 rounded-lg">
                <p className="text-brand-gray-500">No instructions match the current filters.</p>
            </div>
        )}
      </div>

      <InstructionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveInstruction}
        instructionToEdit={instructionToEdit}
        carePlan={carePlan}
      />
      <AiInstructionModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onSave={handleSaveAiInstructions}
        carePlan={carePlan}
      />
    </div>
  );
};