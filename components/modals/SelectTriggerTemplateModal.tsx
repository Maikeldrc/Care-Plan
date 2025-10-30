import React, { useState, useMemo, useEffect } from 'react';
import { XIcon } from '../icons/XIcon';
import { triggerTemplates } from '../../data/triggerTemplates';
import type { TriggerTemplate, TaskTriggerEvent, ReactiveActionType } from '../../types';
import { PackageIcon } from '../icons/PackageIcon';
import { TaskIcon } from '../icons/TaskIcon';
import { MessageIcon } from '../icons/MessageIcon';
import { WorkflowIcon } from '../icons/WorkflowIcon';
import { DelayIcon } from '../icons/DelayIcon';
import { DiamondIcon } from '../icons/DiamondIcon';

const actionIconMap: { [key in ReactiveActionType]?: React.FC<any> } = { CreateTask: TaskIcon, SendMessage: MessageIcon, TriggerWorkflow: WorkflowIcon, Delay: DelayIcon, Condition: DiamondIcon };

interface SelectTriggerTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (template: TriggerTemplate) => void;
    triggerId: TaskTriggerEvent;
    zIndex?: number;
}

export const SelectTriggerTemplateModal: React.FC<SelectTriggerTemplateModalProps> = ({ isOpen, onClose, onApply, triggerId, zIndex = 70 }) => {
    const [selectedTemplate, setSelectedTemplate] = useState<TriggerTemplate | null>(null);

    const availableTemplates = useMemo(() => {
        return triggerTemplates.filter(t => t.triggerId === triggerId);
    }, [triggerId]);

    useEffect(() => {
        if (isOpen && availableTemplates.length > 0) {
            setSelectedTemplate(availableTemplates[0]);
        } else {
            setSelectedTemplate(null);
        }
    }, [isOpen, availableTemplates]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex }}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-brand-gray-900 flex items-center gap-2">
                        <PackageIcon className="w-6 h-6 text-brand-blue" />
                        Load from Template
                    </h2>
                    <button onClick={onClose}><XIcon className="w-6 h-6 text-brand-gray-400" /></button>
                </div>

                <div className="flex-grow grid grid-cols-12 overflow-hidden">
                    <div className="col-span-5 bg-brand-gray-50 border-r p-4 overflow-y-auto">
                        <h3 className="font-semibold text-brand-gray-800 mb-2">Available Templates</h3>
                        {availableTemplates.length > 0 ? (
                            <ul className="space-y-2">
                                {availableTemplates.map(template => (
                                    <li key={template.templateId}>
                                        <button 
                                            onClick={() => setSelectedTemplate(template)} 
                                            className={`w-full text-left p-3 rounded-md border-2 ${selectedTemplate?.templateId === template.templateId ? 'bg-blue-50 border-brand-blue' : 'bg-white border-transparent hover:border-brand-gray-300'}`}
                                        >
                                            <p className="font-semibold text-sm">{template.name}</p>
                                            <p className="text-xs text-brand-gray-500 mt-1">{template.description}</p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-brand-gray-500 mt-8">No templates available for this trigger.</p>
                        )}
                    </div>

                    <div className="col-span-7 p-6 overflow-y-auto">
                        <h3 className="font-semibold text-brand-gray-800 mb-4">Template Preview</h3>
                        {selectedTemplate ? (
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-lg font-bold text-brand-gray-900">{selectedTemplate.name}</h4>
                                    <p className="text-sm text-brand-gray-600 mt-1">{selectedTemplate.description}</p>
                                </div>
                                <div className="space-y-3">
                                    <h5 className="font-semibold text-sm">Actions ({selectedTemplate.actions.length}):</h5>
                                    {selectedTemplate.actions.map((action, index) => {
                                        const Icon = actionIconMap[action.type] || TaskIcon;
                                        return (
                                            <div key={index} className="p-3 bg-brand-gray-50 border border-brand-gray-200 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <Icon className="w-5 h-5 text-blue-600" />
                                                    <span className="font-semibold text-blue-800">{action.type}</span>
                                                </div>
                                                <div className="mt-2 pl-7 text-xs text-brand-gray-700 space-y-1">
                                                    {Object.entries(action.details).map(([key, value]) => (
                                                        <p key={key}><strong className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</strong> {JSON.stringify(value)}</p>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <p className="text-center text-brand-gray-500 mt-8">Select a template to preview its actions.</p>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-brand-gray-50 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">Cancel</button>
                    <button 
                        onClick={() => selectedTemplate && onApply(selectedTemplate)} 
                        disabled={!selectedTemplate} 
                        className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600 disabled:opacity-50"
                    >
                        Apply Template
                    </button>
                </div>
            </div>
        </div>
    );
};