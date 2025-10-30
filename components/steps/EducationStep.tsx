

import React, { useState, useMemo } from 'react';
import type { CarePlan, EducationMaterial, EducationCategory, EducationFormat } from '../../types';
import { educationRepository } from '../../data/educationRepository';
import { generateAiEducation } from '../../services/geminiService';
import { AiSparkleIcon } from '../icons/AiSparkleIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { BookOpenIcon } from '../icons/BookOpenIcon';
import { SendIcon } from '../icons/SendIcon';
import { DeleteConfirmationModal } from '../modals/DeleteConfirmationModal';
import { EducationViewModal } from '../modals/EducationViewModal';
import { EducationEditModal } from '../modals/EducationEditModal';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { VideoCameraIcon } from '../icons/VideoCameraIcon';
import { PhotographIcon } from '../icons/PhotographIcon';
import { ExternalLinkIcon } from '../icons/ExternalLinkIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { EducationScheduleModal } from '../modals/EducationScheduleModal';


interface EducationStepProps {
  carePlan: CarePlan;
  setCarePlan: React.Dispatch<React.SetStateAction<CarePlan>>;
}

const baseInputStyles = "block w-full border border-brand-gray-300 text-brand-gray-900 shadow-sm sm:text-sm rounded-md focus:ring-1 focus:ring-brand-blue focus:border-brand-blue disabled:bg-brand-gray-100 disabled:text-brand-gray-500 bg-white";
const inputStyles = `${baseInputStyles} h-10 px-3 py-2`;
const selectStyles = `${baseInputStyles} h-10 pl-3 pr-10 py-2`;

const categoryColors: { [key in EducationCategory]: string } = {
  'Cardiovascular Health': 'bg-red-100 text-red-800',
  'Diabetes Management': 'bg-cyan-100 text-cyan-800',
  'Medication': 'bg-blue-100 text-blue-800',
  'Diet': 'bg-orange-100 text-orange-800',
  'Exercise': 'bg-green-100 text-green-800',
  'Mental Health': 'bg-indigo-100 text-indigo-800',
  'Monitoring': 'bg-cyan-100 text-cyan-800',
  'General': 'bg-gray-200 text-gray-800',
};

const formatIcons: { [key in EducationFormat]: React.FC<React.SVGProps<SVGSVGElement>> } = {
    'Text': DocumentTextIcon,
    'PDF': DocumentTextIcon,
    'Video': VideoCameraIcon,
    'Image': PhotographIcon,
    'URL': ExternalLinkIcon,
};

const FormatDisplay: React.FC<{ formats: EducationFormat[] }> = ({ formats }) => (
    <div className="flex items-center gap-2">
        {formats.map(format => {
            const Icon = formatIcons[format];
            return (
                <div key={format} title={format} className="flex items-center gap-1 px-2 py-0.5 bg-brand-gray-100 text-brand-gray-700 text-xs font-medium rounded-full">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{format}</span>
                </div>
            );
        })}
    </div>
);

const LanguageDisplay: React.FC<{ languages: string[] }> = ({ languages }) => (
    <div className="flex items-center gap-1">
        {languages.map(lang => (
            <span key={lang} className="px-2 py-0.5 bg-brand-gray-200 text-brand-gray-800 text-xs font-bold rounded-md">{lang.slice(0, 2).toUpperCase()}</span>
        ))}
    </div>
);

const ScheduleDisplay: React.FC<{ material: EducationMaterial }> = ({ material }) => {
    if (!material.schedule && material.status !== 'Scheduled') {
        return <span className="text-xs text-brand-gray-500 italic">Not scheduled</span>;
    }

    const { schedule, nextDeliveryAt } = material;
    let scheduleText = 'Scheduled';

    if (schedule) {
        if (schedule.type === 'now') scheduleText = 'Delivered now';
        if (schedule.type === 'fixed' && nextDeliveryAt) {
            scheduleText = `Next: ${new Date(nextDeliveryAt).toLocaleDateString()} at ${new Date(nextDeliveryAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        if (schedule.type === 'relative') {
            scheduleText = `Relative: After ${schedule.relative?.event?.replace(/_/g, ' ')}`;
        }
    }
    
    const recurringText = schedule?.recurring?.enabled ? `• ${schedule.recurring.freq.toLowerCase()} x${schedule.recurring.count}` : '';
    const channelsText = material.channels.join('+');

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-brand-blue">{scheduleText}</span>
            <span className="text-xs text-brand-gray-600">{channelsText}</span>
            {recurringText && <span className="text-xs text-brand-gray-600">{recurringText}</span>}
        </div>
    );
};

const RepositoryCard: React.FC<{
    material: Omit<EducationMaterial, 'id' | 'status' | 'created_on' | 'last_updated' | 'created_by'>;
    onAssign: () => void;
    onView: () => void;
}> = ({ material, onAssign, onView }) => {
    return (
        <div className="bg-white p-3 rounded-md border border-brand-gray-200">
            <h4 className="font-semibold text-brand-gray-800">{material.title}</h4>
            <p className="text-sm text-brand-gray-500 mt-1 line-clamp-2">{material.summary}</p>
            <div className="mt-2 flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${categoryColors[material.category]}`}>{material.category}</span>
                <LanguageDisplay languages={material.languages} />
            </div>
            <div className="mt-2 flex justify-between items-center">
                <FormatDisplay formats={material.formats} />
                <div className="flex items-center gap-1">
                    <button onClick={onView} className="px-3 py-1 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">View</button>
                    <button onClick={onAssign} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-blue hover:bg-brand-gray-50">
                        <PlusIcon className="w-4 h-4" /> Assign
                    </button>
                </div>
            </div>
        </div>
    );
};

const AssignedCard: React.FC<{
    material: EducationMaterial;
    onUpdate: (updated: EducationMaterial) => void;
    onRemove: () => void;
    onView: () => void;
    onEdit: () => void;
    onSchedule: () => void;
}> = ({ material, onUpdate, onRemove, onView, onEdit, onSchedule }) => {
    const handleStatusUpdate = (status: EducationMaterial['status']) => {
        onUpdate({ ...material, status, last_updated: new Date().toISOString().split('T')[0] });
    };

    return (
        <div className="bg-white p-4 rounded-lg border border-brand-gray-200 shadow-sm flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${categoryColors[material.category]}`}>{material.category}</span>
                    <div className="flex items-center gap-1">
                        <button onClick={onView} className="p-1 text-brand-gray-400 hover:text-brand-gray-600 rounded-full hover:bg-brand-gray-100" title="View"><EyeIcon className="w-5 h-5" /></button>
                        <button onClick={onEdit} className="p-1 text-brand-gray-400 hover:text-brand-gray-600 rounded-full hover:bg-brand-gray-100" title="Edit"><PencilIcon className="w-4 h-4" /></button>
                        <button onClick={onRemove} className="p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50" title="Remove"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                </div>
                <h4 className="font-bold text-brand-gray-800 mt-2">{material.title}</h4>
                <p className="text-sm text-brand-gray-600 mt-1 line-clamp-2">{material.summary}</p>
                 <div className="mt-2 flex items-center gap-2">
                    <FormatDisplay formats={material.formats} />
                    <LanguageDisplay languages={material.languages} />
                </div>
            </div>
            <div className="mt-4 pt-3 border-t border-brand-gray-100 space-y-3">
                 <div className="flex justify-between items-center">
                    <ScheduleDisplay material={material} />
                     <button onClick={onSchedule} title="Configure Schedule" className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-brand-gray-700 border border-brand-gray-300 rounded-md hover:bg-brand-gray-50"><ClockIcon className="w-3 h-3"/> Schedule</button>
                 </div>
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleStatusUpdate('Delivered')} disabled={material.status === 'Delivered' || material.status === 'Reviewed'} className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-brand-gray-700 border border-brand-gray-300 rounded-md hover:bg-brand-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"><SendIcon className="w-3 h-3"/>Deliver</button>
                        <button onClick={() => handleStatusUpdate('Reviewed')} disabled={material.status !== 'Delivered'} className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-brand-gray-700 border border-brand-gray-300 rounded-md hover:bg-brand-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"><CheckIcon className="w-3 h-3"/>Reviewed</button>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        material.status === 'Assigned' ? 'bg-yellow-100 text-yellow-800' :
                        material.status === 'Delivered' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                    }`}>{material.status}</span>
                </div>
            </div>
        </div>
    );
}

export const EducationStep: React.FC<EducationStepProps> = ({ carePlan, setCarePlan }) => {
    const [filters, setFilters] = useState({ search: '', category: 'All', diagnosis: 'All' });
    const [materialToRemove, setMaterialToRemove] = useState<EducationMaterial | null>(null);
    const [viewingMaterial, setViewingMaterial] = useState<EducationMaterial | null>(null);
    const [editingMaterial, setEditingMaterial] = useState<EducationMaterial | null>(null);
    const [schedulingMaterial, setSchedulingMaterial] = useState<EducationMaterial | null>(null);

    const filteredRepository = useMemo(() => {
        return educationRepository.filter(material => {
            const searchMatch = material.title.toLowerCase().includes(filters.search.toLowerCase()) || material.summary.toLowerCase().includes(filters.search.toLowerCase());
            const categoryMatch = filters.category === 'All' || material.category === filters.category;
            const diagnosisMatch = filters.diagnosis === 'All' || (material.condition_codes && material.condition_codes.includes(filters.diagnosis));
            return searchMatch && categoryMatch && diagnosisMatch;
        });
    }, [filters]);

    const handleAssign = (repoMaterial: Omit<EducationMaterial, 'id' | 'status' | 'created_on' | 'last_updated' | 'created_by'>) => {
        if (carePlan.education.some(e => e.title === repoMaterial.title)) {
            alert("This education material has already been assigned.");
            return;
        }
        const now = new Date().toISOString().split('T')[0];
        const newMaterial: EducationMaterial = {
            id: `edu-${Date.now()}`,
            status: 'Not Scheduled',
            created_on: now,
            last_updated: now,
            created_by: 'Care Manager',
            ...repoMaterial,
             // Add default new fields
            schedule: null,
            channels: ['App'],
            ackRequired: false,
            dueDate: null,
            reminders: null,
            nextDeliveryAt: null,
            lastActivity: null,
        };
        setCarePlan(prev => ({ ...prev, education: [...prev.education, newMaterial] }));
    };
    
    const handleUpdate = (updatedMaterial: EducationMaterial) => {
        setCarePlan(prev => ({
            ...prev,
            education: prev.education.map(e => e.id === updatedMaterial.id ? updatedMaterial : e)
        }));
    };

    const handleSaveFromEdit = (updatedMaterial: EducationMaterial) => {
        handleUpdate(updatedMaterial);
        setEditingMaterial(null);
    };

    const handleSaveFromSchedule = (updatedMaterial: EducationMaterial) => {
        handleUpdate(updatedMaterial);
        setSchedulingMaterial(null);
    };

    const handleConfirmRemove = () => {
        if (materialToRemove) {
            setCarePlan(prev => ({
                ...prev,
                education: prev.education.filter(e => e.id !== materialToRemove.id)
            }));
            setMaterialToRemove(null);
        }
    };
    
    const diagnosesOptions = useMemo(() => {
        const allDiagnoses = new Set<string>();
        educationRepository.forEach(item => {
            item.condition_codes?.forEach(code => allDiagnoses.add(code));
        });
        return Array.from(allDiagnoses);
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-brand-gray-900">Patient Education</h2>
                <p className="text-brand-gray-500 mt-1">Provide educational materials to help patients understand their conditions, treatments, and self-management.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Panel: Repository */}
                <div className="bg-brand-gray-50 p-4 rounded-lg border border-brand-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                        <BookOpenIcon className="w-6 h-6 text-brand-blue" />
                        <h3 className="font-semibold text-lg text-brand-gray-800">Education Repository</h3>
                    </div>
                    <div className="space-y-3">
                         <input type="search" placeholder="Search materials..." onChange={e => setFilters(f => ({...f, search: e.target.value}))} className={inputStyles} />
                         <div className="grid grid-cols-2 gap-3">
                            <select onChange={e => setFilters(f => ({...f, category: e.target.value}))} className={selectStyles}>
                                <option value="All">All Categories</option>
                                {Object.keys(categoryColors).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                            <select onChange={e => setFilters(f => ({...f, diagnosis: e.target.value}))} className={selectStyles}>
                                <option value="All">All Diagnoses</option>
                                {diagnosesOptions.map(dx => <option key={dx} value={dx}>{dx}</option>)}
                            </select>
                         </div>
                    </div>
                    <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-2">
                        {filteredRepository.map((material, index) => (
                            <RepositoryCard 
                                key={index}
                                material={material}
                                onAssign={() => handleAssign(material)}
                                onView={() => setViewingMaterial({ ...material, id: `repo-${index}` } as EducationMaterial)}
                            />
                        ))}
                    </div>
                </div>

                {/* Right Panel: Assigned Education */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-brand-gray-800">Assigned Education for Patient</h3>
                     <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {carePlan.education.length > 0 ? (
                            carePlan.education.map(material => (
                                <AssignedCard 
                                    key={material.id}
                                    material={material}
                                    onUpdate={handleUpdate}
                                    onRemove={() => setMaterialToRemove(material)}
                                    onView={() => setViewingMaterial(material)}
                                    onEdit={() => setEditingMaterial(material)}
                                    onSchedule={() => setSchedulingMaterial(material)}
                                />
                            ))
                        ) : (
                            <div className="text-center py-12 bg-brand-gray-50 rounded-lg border border-dashed">
                                <p className="text-brand-gray-500">No education materials have been assigned.</p>
                                <p className="text-sm text-brand-gray-400 mt-1">Assign from the repository to get started.</p>
                            </div>
                        )}
                     </div>
                </div>
            </div>

            {viewingMaterial && (
                <EducationViewModal 
                    isOpen={!!viewingMaterial}
                    onClose={() => setViewingMaterial(null)}
                    material={viewingMaterial}
                />
            )}
            
            {editingMaterial && (
                <EducationEditModal
                    isOpen={!!editingMaterial}
                    onClose={() => setEditingMaterial(null)}
                    material={editingMaterial}
                    onSave={handleSaveFromEdit}
                />
            )}

             {schedulingMaterial && (
                <EducationScheduleModal
                    isOpen={!!schedulingMaterial}
                    onClose={() => setSchedulingMaterial(null)}
                    material={schedulingMaterial}
                    onSave={handleSaveFromSchedule}
                    carePlan={carePlan}
                />
            )}

             <DeleteConfirmationModal
                isOpen={!!materialToRemove}
                onClose={() => setMaterialToRemove(null)}
                onConfirm={handleConfirmRemove}
                title="Remove Education Material"
                message={`Are you sure you want to remove "${materialToRemove?.title}" from the patient's care plan?`}
            />
        </div>
    );
};