
import React, { useState, useMemo, useEffect } from 'react';
import type { CarePlan, Instruction, InstructionCategory } from '../../types';
import { getAiInstructionProposals } from '../../services/geminiService';
import { AiSparkleIcon } from '../icons/AiSparkleIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { XIcon } from '../icons/XIcon';
import { DeleteConfirmationModal } from '../modals/DeleteConfirmationModal';

interface InstructionsStepProps {
  carePlan: CarePlan;
  setCarePlan: React.Dispatch<React.SetStateAction<CarePlan>>;
}

const baseInputStyles = "mt-1 block w-full border border-brand-gray-300 text-brand-gray-900 shadow-sm sm:text-sm rounded-md focus:ring-1 focus:ring-brand-blue focus:border-brand-blue disabled:bg-brand-gray-100 disabled:text-brand-gray-500";
const inlineInputBaseStyles = "border border-brand-gray-300 text-brand-gray-900 shadow-sm sm:text-sm rounded-md focus:ring-1 focus:ring-brand-blue focus:border-brand-blue disabled:bg-brand-gray-100 disabled:text-brand-gray-500";
const textareaStyles = `${baseInputStyles} px-3 py-2 bg-white`;
const checkboxStyles = "h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue focus:ring-2 bg-white";

const categoryColors: { [key in InstructionCategory]: { chip: string, text: string } } = {
  Medication: { chip: 'bg-red-100', text: 'text-red-800' },
  Monitoring: { chip: 'bg-blue-100', text: 'text-blue-800' },
  Appointment: { chip: 'bg-orange-100', text: 'text-orange-800' },
  Lifestyle: { chip: 'bg-green-100', text: 'text-green-800' },
  Education: { chip: 'bg-purple-100', text: 'text-purple-800' },
};

const InstructionCard: React.FC<{
    instruction: Instruction,
    onEdit: () => void,
    onDelete: () => void,
}> = ({ instruction, onEdit, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div
            className="bg-white p-4 rounded-lg border shadow-sm transition-all border-brand-gray-200 cursor-pointer hover:shadow-md hover:border-brand-blue"
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${categoryColors[instruction.category].chip} ${categoryColors[instruction.category].text}`}>{instruction.category}</span>
                    <h3 className="font-bold text-brand-gray-900 mt-2">{instruction.title}</h3>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                     <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 text-brand-gray-400 hover:text-brand-gray-600 rounded-full hover:bg-brand-gray-100" aria-label="Edit instruction"><PencilIcon className="w-5 h-5"/></button>
                     <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50" aria-label="Delete instruction"><TrashIcon className="w-4 h-4"/></button>
                </div>
            </div>
            <p className={`text-sm text-brand-gray-600 mt-2 ${!isExpanded ? 'line-clamp-2' : ''}`}>{instruction.details}</p>
        </div>
    );
};

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
                            {Object.keys(categoryColors).map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
                category: p.category || 'Lifestyle',
                linked_goal_id: null,
                linked_barrier_id: null,
                delivery_method: 'App',
                language: 'English',
                status: 'Active',
                due_rule: null,
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
                                           <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${categoryColors[p.category || 'Lifestyle'].chip} ${categoryColors[p.category || 'Lifestyle'].text}`}>{p.category}</span>
                                           <h4 className="font-semibold text-brand-gray-800">{p.title}</h4>
                                        </div>
                                        <p className="text-sm text-brand-gray-600 mt-1">{p.details}</p>
                                        {p.rationale && <p className="text-xs text-brand-blue mt-1 italic">Rationale: {p.rationale}</p>}
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
      category: 'All',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [instructionToEdit, setInstructionToEdit] = useState<Instruction | null>(null);
  const [instructionToDelete, setInstructionToDelete] = useState<Instruction | null>(null);

  const filteredInstructions = useMemo(() => {
    return (carePlan.instructions || []).filter(i => {
        if (activeFilters.category !== 'All' && i.category !== activeFilters.category) return false;
        if (activeFilters.search && !i.title.toLowerCase().includes(activeFilters.search.toLowerCase()) && !i.details.toLowerCase().includes(activeFilters.search.toLowerCase())) return false;
        return true;
    });
  }, [carePlan.instructions, activeFilters]);

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
  
  const handleConfirmDelete = () => {
    if (instructionToDelete) {
        setCarePlan(prev => ({
            ...prev,
            instructions: prev.instructions.filter(i => i.id !== instructionToDelete.id),
        }));
        setInstructionToDelete(null);
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
        <select onChange={e => setActiveFilters(f => ({...f, category: e.target.value}))} className={`${inlineInputBaseStyles} h-10 pl-3 pr-10 py-2 bg-white`}>
            <option value="All">All Categories</option>
            {Object.keys(categoryColors).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-3">
            <button onClick={() => { setInstructionToEdit(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-gray-300 text-brand-blue rounded-md font-semibold hover:bg-brand-gray-50 text-sm">
              <PlusIcon className="w-5 h-5"/> Add Instruction
            </button>
            <button onClick={() => setIsAiModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-md font-semibold hover:bg-blue-600 text-sm">
              <AiSparkleIcon className="w-5 h-5"/> Generate with AI
            </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredInstructions.length > 0 ? (
            filteredInstructions.map(instr => (
                <InstructionCard 
                    key={instr.id}
                    instruction={instr}
                    onEdit={() => { setInstructionToEdit(instr); setIsModalOpen(true); }}
                    onDelete={() => setInstructionToDelete(instr)}
                />
            ))
        ) : (
            <div className="lg:col-span-2 text-center py-12 bg-brand-gray-50 rounded-lg border border-dashed">
                <p className="font-semibold text-brand-gray-500">No patient instructions added yet.</p>
                <p className="text-sm text-brand-gray-400 mt-1">You can add one manually or generate with AI.</p>
            </div>
        )}
      </div>

      <InstructionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveInstruction}
        instructionToEdit={instructionToEdit}
      />
      <AiInstructionModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onSave={handleSaveAiInstructions}
        carePlan={carePlan}
      />
      <DeleteConfirmationModal
        isOpen={!!instructionToDelete}
        onClose={() => setInstructionToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Instruction"
        message={`Are you sure you want to delete this instruction: "${instructionToDelete?.title}"? This action cannot be undone.`}
        zIndex={100}
      />
    </div>
  );
};
