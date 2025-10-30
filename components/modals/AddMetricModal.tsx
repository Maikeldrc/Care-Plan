
import React, { useState, useEffect } from 'react';
import { XIcon } from '../icons/XIcon';
import type { BaselineMetric } from '../../types';
import { metricDefinitions } from '../../data/metricDefinitions';

interface AddMetricModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (metric: BaselineMetric) => void;
  metricToEdit: BaselineMetric | null;
}

const baseInputStyles = "mt-1 block w-full border border-brand-gray-300 text-brand-gray-900 shadow-sm sm:text-sm rounded-md focus:ring-1 focus:ring-brand-blue focus:border-brand-blue bg-white";
const inputStyles = `${baseInputStyles} h-10 px-3 py-2`;
const selectStyles = `${baseInputStyles} h-10 pl-3 pr-10 py-2`;

const getInitialMetricState = (metricToEdit: BaselineMetric | null) => {
    if (metricToEdit) {
        return { ...metricToEdit };
    }
    const defaultMetricDef = metricDefinitions[0];
    return {
        id: '',
        name: defaultMetricDef.name,
        operator: '=' as const,
        value: '',
        unit: defaultMetricDef.unit,
    };
};

export const AddMetricModal: React.FC<AddMetricModalProps> = ({ isOpen, onClose, onSave, metricToEdit }) => {
  const [metric, setMetric] = useState<BaselineMetric>(getInitialMetricState(metricToEdit));
  const [reference, setReference] = useState('');

  useEffect(() => {
    if (isOpen) {
        const initialState = getInitialMetricState(metricToEdit);
        setMetric(initialState);
        const def = metricDefinitions.find(d => d.name === initialState.name);
        setReference(def?.referenceRange || '');
    }
  }, [isOpen, metricToEdit]);
  
  if (!isOpen) return null;

  const handleNameChange = (newName: string) => {
    const def = metricDefinitions.find(d => d.name === newName);
    setMetric(prev => ({
        ...prev,
        name: newName,
        unit: def?.unit || '',
    }));
    setReference(def?.referenceRange || '');
  };

  const handleSave = () => {
    if (metric.name.trim() && metric.value.trim()) {
      const metricToSave: BaselineMetric = {
        ...metric,
        id: metric.id || `bm-${Date.now()}`
      };
      onSave(metricToSave);
      onClose();
    } else {
      alert('Metric Name and Value are required.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-brand-gray-900">
            {metricToEdit ? 'Edit Baseline Metric' : 'Add Baseline Metric'}
          </h2>
          <button onClick={onClose} className="text-brand-gray-400 hover:text-brand-gray-600">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-gray-700">Metric Name</label>
            <select value={metric.name} onChange={(e) => handleNameChange(e.target.value)} className={selectStyles}>
                {metricDefinitions.map(def => <option key={def.name} value={def.name}>{def.name}</option>)}
            </select>
            {reference && <p className="mt-1 text-xs text-brand-gray-500 italic">Reference: {reference}</p>}
          </div>
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-3">
                <label className="block text-sm font-medium text-brand-gray-700">Operator</label>
                <select value={metric.operator} onChange={e => setMetric(p => ({...p, operator: e.target.value as any}))} className={selectStyles}>
                    <option value="=">=</option>
                    <option value="<">&lt;</option>
                    <option value=">">&gt;</option>
                </select>
            </div>
            <div className="col-span-5">
                <label className="block text-sm font-medium text-brand-gray-700">Value</label>
                <input
                    type="number"
                    value={metric.value}
                    onChange={(e) => setMetric(p => ({...p, value: e.target.value}))}
                    className={inputStyles}
                />
            </div>
            <div className="col-span-4">
                 <label className="block text-sm font-medium text-brand-gray-700">Unit</label>
                 <input
                    type="text"
                    value={metric.unit}
                    onChange={(e) => setMetric(p => ({...p, unit: e.target.value}))}
                    className={inputStyles}
                 />
            </div>
          </div>
        </div>
        <div className="p-4 bg-brand-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600"
          >
            Save Metric
          </button>
        </div>
      </div>
    </div>
  );
};