

import React, { useState, useEffect } from 'react';
import type { EducationMaterial, EducationCategory, EducationDeliveryMethod } from '../../types';
import { XIcon } from '../icons/XIcon';
import { AiSparkleIcon } from '../icons/AiSparkleIcon';
import { simplifyAiEducation, translateAiEducation, updateAiEducation } from '../../services/geminiService';

interface EducationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (material: EducationMaterial) => void;
  material: EducationMaterial;
}

const baseInputStyles = "block w-full border border-brand-gray-300 text-brand-gray-900 shadow-sm sm:text-sm rounded-md focus:ring-1 focus:ring-brand-blue focus:border-brand-blue bg-white";
const inputStyles = `${baseInputStyles} h-10 px-3 py-2`;
const selectStyles = `${baseInputStyles} h-10 pl-3 pr-10 py-2`;
const textareaStyles = `${baseInputStyles} px-3 py-2`;

export const EducationEditModal: React.FC<EducationEditModalProps> = ({ isOpen, onClose, onSave, material }) => {
  const [formData, setFormData] = useState(material);
  const [loadingAction, setLoadingAction] = useState<'simplify' | 'translate' | 'update' | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(material);
    }
  }, [isOpen, material]);

  if (!isOpen) return null;

  const handleChange = (field: keyof EducationMaterial, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAiAction = async (action: 'simplify' | 'translate' | 'update') => {
    setLoadingAction(action);
    try {
        let newContent = formData.content;
        if (action === 'simplify') newContent = await simplifyAiEducation(formData.content);
        else if (action === 'translate') newContent = await translateAiEducation(formData.content, 'Spanish');
        else if (action === 'update') newContent = await updateAiEducation(formData.content);
        handleChange('content', newContent);
    } catch (error) {
        console.error(`AI action '${action}' failed:`, error);
        alert(`Failed to perform AI action: ${action}`);
    } finally {
        setLoadingAction(null);
    }
  };

  const handleSave = () => {
    onSave({ ...formData, last_updated: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-brand-gray-900">Edit Education Material</h2>
          <button onClick={onClose}><XIcon className="w-6 h-6 text-brand-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="text-sm font-medium">Title</label>
            <input type="text" value={formData.title} onChange={e => handleChange('title', e.target.value)} className={inputStyles} />
          </div>
          <div>
            <label className="text-sm font-medium">Summary</label>
            <textarea rows={3} value={formData.summary} onChange={e => handleChange('summary', e.target.value)} className={textareaStyles} />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium">Content / URL</label>
                <div className="flex items-center gap-2">
                    <button disabled={!!loadingAction} onClick={() => handleAiAction('simplify')} className="flex items-center gap-1 text-xs font-semibold text-brand-blue hover:bg-blue-50 p-1 rounded-md disabled:opacity-50"><AiSparkleIcon className={`w-3 h-3 ${loadingAction === 'simplify' ? 'animate-aiPulse' : ''}`} /> Simplify</button>
                    <button disabled={!!loadingAction} onClick={() => handleAiAction('translate')} className="flex items-center gap-1 text-xs font-semibold text-brand-blue hover:bg-blue-50 p-1 rounded-md disabled:opacity-50"><AiSparkleIcon className={`w-3 h-3 ${loadingAction === 'translate' ? 'animate-aiPulse' : ''}`} /> Translate</button>
                    <button disabled={!!loadingAction} onClick={() => handleAiAction('update')} className="flex items-center gap-1 text-xs font-semibold text-brand-blue hover:bg-blue-50 p-1 rounded-md disabled:opacity-50"><AiSparkleIcon className={`w-3 h-3 ${loadingAction === 'update' ? 'animate-aiPulse' : ''}`} /> Update</button>
                </div>
            </div>
            <textarea rows={8} value={formData.content} onChange={e => handleChange('content', e.target.value)} className={textareaStyles} disabled={!!loadingAction} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Category</label>
              <select value={formData.category} onChange={e => handleChange('category', e.target.value as EducationCategory)} className={selectStyles}>
                <option>Cardiovascular Health</option>
                <option>Diabetes Management</option>
                <option>Diet</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Delivery Method</label>
              <select value={formData.delivery_method} onChange={e => handleChange('delivery_method', e.target.value as EducationDeliveryMethod)} className={selectStyles}>
                <option>App</option><option>Printed</option><option>Email</option><option>Verbal</option><option>URL</option>
              </select>
            </div>
          </div>
        </div>
        <div className="p-4 bg-brand-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600">Save Changes</button>
        </div>
      </div>
    </div>
  );
};