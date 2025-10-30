import React, { useState, useMemo, useEffect } from 'react';
import type { CarePlan, MessageTemplate } from '../../types';
import { messageTemplates } from '../../data/messageTemplates';
import { XIcon } from '../icons/XIcon';
import { AiSparkleIcon } from '../icons/AiSparkleIcon';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';

interface SelectMessageTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (content: string) => void;
  type: 'SMS' | 'Email';
  carePlan: CarePlan;
}

const replaceVariables = (content: string, carePlan: CarePlan | undefined) => {
    if (!carePlan) return content;
    const patientName = "John Doe"; 
    const patientFirstName = "John";
    const careManagerName = "Maria";
    const careTeamName = "Cardiology Care Team";
    const observationValue = "135/85";
    const observationType = "BP";
    const date = new Date().toLocaleDateString();
    const nextAppointmentDate = "October 30, 2025";
    const practiceName = "Community Health Clinic";
    const doctorName = "Dr. Emily Carter";

    return content
        .replace(/\[Patient_Name\]/g, patientName)
        .replace(/\[Patient_FirstName\]/g, patientFirstName)
        .replace(/\[CareManager_Name\]/g, careManagerName)
        .replace(/\[CareTeam_Name\]/g, careTeamName)
        .replace(/\[Observation_Value\]/g, observationValue)
        .replace(/\[Observation_Type\]/g, observationType)
        .replace(/\[Date\]/g, date)
        .replace(/\[Next_Appointment_Date\]/g, nextAppointmentDate)
        .replace(/\[Practice_Name\]/g, practiceName)
        .replace(/\[Doctor_Name\]/g, doctorName);
};

export const SelectMessageTemplateModal: React.FC<SelectMessageTemplateModalProps> = ({ isOpen, onClose, onApply, type, carePlan }) => {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editableContent, setEditableContent] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        if(isOpen) {
            const firstTemplate = messageTemplates.find(t => t.type === type);
            setSelectedTemplate(firstTemplate || null);
            setIsEditing(false);
            setShowPreview(false);
        }
    }, [isOpen, type]);
    
    const categories = useMemo(() => {
        const cats = new Set(messageTemplates.filter(t => t.type === type).map(t => t.category));
        return ['All', ...Array.from(cats)];
    }, [type]);

    const filteredTemplates = useMemo(() => {
        return messageTemplates.filter(t => t.type === type && (selectedCategory === 'All' || t.category === selectedCategory));
    }, [type, selectedCategory]);

    const handleSelectTemplate = (template: MessageTemplate) => {
        setSelectedTemplate(template);
        setIsEditing(false);
        setShowPreview(false);
    };

    const handleApply = () => {
        const contentToApply = isEditing ? editableContent : selectedTemplate?.content;
        if (contentToApply) {
            onApply(contentToApply);
        }
    };
    
    if (!isOpen) return null;

    const currentContent = isEditing ? editableContent : selectedTemplate?.content || '';
    const previewContent = replaceVariables(currentContent, carePlan);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[80]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-brand-gray-900 flex items-center gap-2"><ClipboardListIcon className="w-6 h-6 text-brand-blue"/>Select Message Template</h2>
                    <button onClick={onClose}><XIcon className="w-6 h-6 text-brand-gray-400"/></button>
                </div>
                <div className="flex-grow grid grid-cols-12 overflow-hidden">
                    <div className="col-span-4 bg-brand-gray-50 border-r p-4 overflow-y-auto">
                        <h3 className="font-semibold text-brand-gray-800 mb-2">Categories</h3>
                        <ul className="space-y-1">
                            {categories.map(cat => (
                                <li key={cat}>
                                    <button onClick={() => setSelectedCategory(cat)} className={`w-full text-left text-sm px-3 py-2 rounded-md ${selectedCategory === cat ? 'bg-blue-100 text-brand-blue font-semibold' : 'hover:bg-brand-gray-200'}`}>{cat}</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="col-span-8 flex flex-col">
                         <div className="border-b p-4 overflow-y-auto max-h-64">
                             <h3 className="font-semibold text-brand-gray-800 mb-2">Templates</h3>
                             <div className="space-y-2">
                                {filteredTemplates.map(template => (
                                    <button key={template.id} onClick={() => handleSelectTemplate(template)} className={`w-full text-left p-2 rounded-md border ${selectedTemplate?.id === template.id ? 'bg-blue-50 border-brand-blue' : 'hover:bg-brand-gray-100'}`}>
                                        <p className="font-semibold text-sm">{template.name}</p>
                                        <p className="text-xs text-brand-gray-500">{template.content.substring(0, 100)}...</p>
                                    </button>
                                ))}
                             </div>
                         </div>
                         <div className="p-4 flex-grow overflow-y-auto">
                            <h3 className="font-semibold text-brand-gray-800 mb-2">Preview & Edit</h3>
                            {selectedTemplate ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <label htmlFor="show-preview-toggle" className="text-sm font-medium">Show preview with data</label>
                                            <input type="checkbox" id="show-preview-toggle" checked={showPreview} onChange={e => setShowPreview(e.target.checked)} />
                                        </div>
                                        <button onClick={() => { setIsEditing(true); setEditableContent(selectedTemplate.content); }} disabled={isEditing} className="text-sm font-semibold text-brand-blue hover:underline disabled:text-brand-gray-400">Edit before applying</button>
                                    </div>
                                    <textarea
                                        value={showPreview ? previewContent : currentContent}
                                        onChange={e => setEditableContent(e.target.value)}
                                        readOnly={!isEditing && !showPreview}
                                        rows={isEditing ? 8 : 6}
                                        className={`w-full p-2 border rounded-md font-mono text-sm ${isEditing ? 'bg-white' : 'bg-brand-gray-100'}`}
                                    />
                                    {showPreview && <p className="text-xs text-brand-gray-500 italic">This is a preview with sample data. Actual data will be used upon sending.</p>}
                                </div>
                            ) : (
                                <p className="text-center text-brand-gray-500">Select a template to preview.</p>
                            )}
                         </div>
                    </div>
                </div>
                <div className="p-4 bg-brand-gray-50 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">Cancel</button>
                    <button onClick={handleApply} disabled={!selectedTemplate} className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600 disabled:opacity-50">Apply Template</button>
                </div>
            </div>
        </div>
    );
};
