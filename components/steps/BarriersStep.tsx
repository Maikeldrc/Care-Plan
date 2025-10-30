

import React, { useState, useEffect, useMemo } from 'react';
import type { CarePlan, Barrier, Mitigation } from '../../types';
import { getAiBarrierUpdateSuggestions, getAiBarrierAutofill } from '../../services/geminiService';
import { barrierRepository } from '../../data/barrierRepository';
import { AiSparkleIcon } from '../icons/AiSparkleIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { XIcon } from '../icons/XIcon';
import { DeleteConfirmationModal } from '../modals/DeleteConfirmationModal';
import { CheckIcon } from '../icons/CheckIcon';
import { UndoIcon } from '../icons/UndoIcon';

interface BarriersStepProps {
  carePlan: CarePlan;
  setCarePlan: React.Dispatch<React.SetStateAction<CarePlan>>;
}

const baseInputStyles = "mt-1 block w-full border border-brand-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-brand-blue focus:border-brand-blue sm:text-sm bg-white text-brand-gray-900";
const inputStyles = `${baseInputStyles} h-10 px-3 py-2`;
const selectStyles = `${baseInputStyles} h-10 px-3 py-2`;
const textareaStyles = `${baseInputStyles} px-3 py-2`;
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
                        <select value={category} onChange={e => handleCategoryChange(e.target.value)} className={selectStyles}>
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
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={textareaStyles}></textarea>
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
                                    }} className={inputStyles} />
                                    <button onClick={() => handleRemoveMitigation(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-md"><TrashIcon className="w-5 h-5" /></button>
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                             <input type="text" value={newMitigation} onChange={e => setNewMitigation(e.target.value)} placeholder="Add a new mitigation..." className={inputStyles} onKeyDown={(e) => e.key === 'Enter' && handleAddMitigation()}/>
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

const BarrierCard: React.FC<{
    barrier: Barrier;
    onUpdate: (updatedBarrier: Barrier) => void;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ barrier, onUpdate, onEdit, onDelete }) => {
    const allMitigationsCompleted = useMemo(() => barrier.mitigations.every(m => m.completed), [barrier.mitigations]);

    const handleToggleMitigation = (index: number) => {
        const newMitigations = [...barrier.mitigations];
        newMitigations[index] = { ...newMitigations[index], completed: !newMitigations[index].completed };
        onUpdate({ ...barrier, mitigations: newMitigations, last_updated: new Date().toISOString().split('T')[0] });
    };

    const handleResolve = () => {
        onUpdate({
            ...barrier,
            status: 'Resolved',
            resolved_on: new Date().toISOString().split('T')[0],
            resolved_by: 'Care Manager',
            last_updated: new Date().toISOString().split('T')[0],
        });
    };

    const handleReopen = () => {
        onUpdate({
            ...barrier,
            status: 'Active',
            resolved_on: null,
            resolved_by: null,
            last_updated: new Date().toISOString().split('T')[0],
        });
    };

    return (
        <div className={`p-6 border rounded-lg shadow-sm flex flex-col transition-colors ${barrier.status === 'Resolved' ? 'bg-brand-gray-50 border-brand-gray-200' : 'bg-white border-brand-gray-200'}`}>
            <div className="flex-grow">
                <div className="flex justify-between items-start">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 ${barrier.status === 'Resolved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {barrier.source === 'AI' && <AiSparkleIcon className="w-3.5 h-3.5" />}
                        {barrier.category}
                    </span>
                    <div className="flex items-center gap-2">
                        <button onClick={onEdit} title="Edit Barrier" className="p-1.5 text-brand-gray-400 hover:text-brand-gray-600 rounded-full hover:bg-gray-100"><PencilIcon className="w-4 h-4" /></button>
                        <button onClick={onDelete} title="Delete Barrier" className="p-1.5 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                </div>
                <p className={`mt-3 text-brand-gray-700 ${barrier.status === 'Resolved' && 'text-brand-gray-500'}`}>{barrier.description}</p>
                {barrier.rationale && <p className="mt-2 text-xs text-brand-gray-500 italic"><strong>AI Rationale:</strong> {barrier.rationale}</p>}
            </div>
            <div className="mt-4 pt-4 border-t border-brand-gray-100">
                <h4 className="font-semibold text-brand-gray-800">Mitigation Strategies:</h4>
                <div className="mt-2 space-y-2">
                    {barrier.mitigations.map((mitigation, i) => (
                        <label key={i} className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={mitigation.completed} onChange={() => handleToggleMitigation(i)} disabled={barrier.status === 'Resolved'} className={checkboxStyles} />
                            <span className={`text-brand-gray-600 ${mitigation.completed && 'line-through text-brand-gray-400'}`}>{mitigation.text}</span>
                        </label>
                    ))}
                </div>
            </div>
            {allMitigationsCompleted && barrier.status === 'Active' && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center justify-between">
                    <p className="text-sm font-semibold text-green-800">All mitigations completed!</p>
                    <button onClick={handleResolve} className="text-sm font-semibold text-green-700 hover:underline">Mark as Resolved</button>
                </div>
            )}
            <div className="mt-4 pt-4 border-t border-brand-gray-100 flex items-center justify-between">
                {barrier.status === 'Active' ? (
                    <button onClick={handleResolve} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50"><CheckIcon className="w-4 h-4 text-green-600" /> Mark as Resolved</button>
                ) : (
                    <button onClick={handleReopen} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50"><UndoIcon className="w-4 h-4 text-brand-gray-600" /> Reopen Barrier</button>
                )}
                 <p className="text-xs text-brand-gray-400">
                    {barrier.status === 'Resolved' && barrier.resolved_on ? `Resolved by ${barrier.resolved_by} on ${new Date(barrier.resolved_on).toLocaleDateString()}` : `Last updated: ${new Date(barrier.last_updated).toLocaleDateString()}`}
                </p>
            </div>
        </div>
    );
};

const AiBarrierSuggestionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (barriers: Barrier[]) => void;
    suggestions: Barrier[];
}> = ({ isOpen, onClose, onSave, suggestions }) => {
    const [editableSuggestions, setEditableSuggestions] = useState<Barrier[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            setEditableSuggestions(JSON.parse(JSON.stringify(suggestions)));
            setSelectedIds(new Set(suggestions.map(s => s.id)));
        }
    }, [isOpen, suggestions]);

    if (!isOpen) return null;
    
    const handleToggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleUpdateSuggestion = (id: string, updates: Partial<Barrier>) => {
        setEditableSuggestions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const handleUpdateMitigationText = (barrierId: string, mitigationIndex: number, newText: string) => {
        setEditableSuggestions(prev => prev.map(barrier => {
            if (barrier.id === barrierId) {
                const newMitigations = [...barrier.mitigations];
                newMitigations[mitigationIndex] = { ...newMitigations[mitigationIndex], text: newText };
                return { ...barrier, mitigations: newMitigations };
            }
            return barrier;
        }));
    };
    
    const handleSave = () => {
        const selected = editableSuggestions.filter(s => selectedIds.has(s.id));
        onSave(selected);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2"><AiSparkleIcon className="w-6 h-6 text-brand-blue" /> AI-Suggested Barriers</h2>
            <button onClick={onClose}><XIcon className="w-6 h-6 text-brand-gray-400" /></button>
          </div>

          <div className="p-6 flex-grow overflow-y-auto space-y-4">
            {editableSuggestions.length > 0 ? (
              editableSuggestions.map(suggestion => (
                <div key={suggestion.id} className="p-4 bg-brand-gray-50 rounded-lg border border-brand-gray-200 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(suggestion.id)}
                    onChange={() => handleToggleSelection(suggestion.id)}
                    className={`${checkboxStyles} mt-1.5`}
                  />
                  <div className="flex-1 space-y-2">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">{suggestion.category}</span>
                    <textarea
                      value={suggestion.description}
                      onChange={(e) => handleUpdateSuggestion(suggestion.id, { description: e.target.value })}
                      className={`${textareaStyles} text-sm`}
                      rows={2}
                    />
                    <p className="text-xs text-brand-blue italic">Rationale: {suggestion.rationale}</p>
                    <div className="space-y-2 pt-2">
                      <h4 className="text-sm font-semibold text-brand-gray-700">Mitigation Strategies</h4>
                      {suggestion.mitigations.map((mitigation, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input 
                                type="text" 
                                value={mitigation.text} 
                                onChange={(e) => handleUpdateMitigationText(suggestion.id, index, e.target.value)}
                                className={`${inputStyles} h-9 text-sm`}
                            />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-brand-gray-500">No new barriers identified based on the patient’s current information.</p>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-brand-gray-50 border-t flex justify-between items-center">
            <p className="text-sm font-semibold">{selectedIds.size} of {editableSuggestions.length} selected</p>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={selectedIds.size === 0} className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600 disabled:opacity-50">Add Selected Barriers</button>
            </div>
          </div>
        </div>
      </div>
    );
};

export const BarriersStep: React.FC<BarriersStepProps> = ({ carePlan, setCarePlan }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [barrierToEdit, setBarrierToEdit] = useState<Barrier | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [barrierToDelete, setBarrierToDelete] = useState<Barrier | null>(null);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<Barrier[]>([]);

    const handleUpdateBarrier = (updatedBarrier: Barrier) => {
        setCarePlan(prev => ({
            ...prev,
            barriers: prev.barriers.map(b => b.id === updatedBarrier.id ? updatedBarrier : b)
        }));
    };

    const handleSuggestBarriers = async () => {
        setIsAiLoading(true);
        try {
            const result = await getAiBarrierUpdateSuggestions(carePlan);
            const existingCategories = new Set(carePlan.barriers.map(b => b.category));
            const newSuggestions = result.newBarriers.filter(s => !existingCategories.has(s.category));
            
            if (newSuggestions.length > 0) {
                setAiSuggestions(newSuggestions);
                setIsAiModalOpen(true);
            } else {
                alert("AI did not find any new barriers to suggest based on the current care plan.");
            }
        } catch (error) {
            console.error("Failed to get AI barrier suggestions:", error);
            alert("An error occurred while getting AI suggestions.");
        } finally {
            setIsAiLoading(false);
        }
    };
    
    const handleSaveBarrier = (barrier: Barrier) => {
        const isEditing = carePlan.barriers.some(b => b.id === barrier.id);
        const updatedBarriers = isEditing
            ? carePlan.barriers.map(b => b.id === barrier.id ? barrier : b)
            : [...carePlan.barriers, barrier];
        
        setCarePlan(prev => ({ ...prev, barriers: updatedBarriers }));
        setIsModalOpen(false);
        setBarrierToEdit(null);
    };

    const handleEditBarrier = (barrier: Barrier) => {
        setBarrierToEdit(barrier);
        setIsModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!barrierToDelete) return;
        setCarePlan(prev => ({ ...prev, barriers: prev.barriers.filter(b => b.id !== barrierToDelete.id) }));
        setBarrierToDelete(null);
    };

    const handleSaveFromAiModal = (newBarriers: Barrier[]) => {
        setCarePlan(prev => ({ ...prev, barriers: [...prev.barriers, ...newBarriers] }));
        setIsAiModalOpen(false);
    };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
            <h2 className="text-xl font-semibold text-brand-gray-900">Barriers</h2>
            <p className="text-brand-gray-500">Identify patient-specific or system barriers and explore suggested mitigations.</p>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={() => { setBarrierToEdit(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-gray-300 text-brand-blue rounded-md font-semibold hover:bg-brand-gray-50 text-sm">
              <PlusIcon className="w-5 h-5"/>
              Add Barrier
            </button>
            <button onClick={handleSuggestBarriers} disabled={isAiLoading} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-md font-semibold hover:bg-blue-600 text-sm disabled:opacity-50">
              <AiSparkleIcon className={`w-5 h-5 ${isAiLoading ? 'animate-aiPulse' : ''}`}/>
              {isAiLoading ? 'Analyzing...' : 'Suggest with AI'}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {carePlan.barriers.map((barrier) => (
            <BarrierCard 
                key={barrier.id}
                barrier={barrier}
                onUpdate={handleUpdateBarrier}
                onEdit={() => handleEditBarrier(barrier)}
                onDelete={() => setBarrierToDelete(barrier)}
            />
        ))}
        {carePlan.barriers.length === 0 && (
            <div className="md:col-span-2 text-center py-12 bg-brand-gray-50 rounded-lg">
                <p className="text-brand-gray-500">No barriers have been identified for this patient.</p>
                <p className="text-sm text-brand-gray-400 mt-1">Click "Add Barrier" or "Suggest with AI" to get started.</p>
            </div>
        )}
      </div>
      
      <BarrierModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setBarrierToEdit(null); }}
        onSave={handleSaveBarrier}
        barrierToEdit={barrierToEdit}
      />

      <DeleteConfirmationModal
        isOpen={!!barrierToDelete}
        onClose={() => setBarrierToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Barrier"
        message={`Are you sure you want to delete the barrier: "${barrierToDelete?.description}"? This action cannot be undone.`}
        zIndex={100}
      />

      <AiBarrierSuggestionModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onSave={handleSaveFromAiModal}
        suggestions={aiSuggestions}
      />
    </div>
  );
};