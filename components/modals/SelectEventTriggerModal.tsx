
import React, { useState, useMemo, useEffect } from 'react';
import { XIcon } from '../icons/XIcon';
import { triggerEventCategories, TriggerEvent } from '../../data/triggerEvents';
import type { TaskTriggerEvent, TriggerTemplate, ReactiveActionType, TriggerTemplateAction } from '../../types';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { LightningBoltIcon } from '../icons/LightningBoltIcon';
import { getTemplateForTrigger } from '../../services/geminiService';
import { PackageIcon } from '../icons/PackageIcon';
import { TaskIcon } from '../icons/TaskIcon';
import { MessageIcon } from '../icons/MessageIcon';
import { WorkflowIcon } from '../icons/WorkflowIcon';
import { DelayIcon } from '../icons/DelayIcon';
import { DiamondIcon } from '../icons/DiamondIcon';

const allEvents = triggerEventCategories.flatMap(c => c.events);
const actionIconMap: { [key in ReactiveActionType]?: React.FC<any> } = { CreateTask: TaskIcon, SendMessage: MessageIcon, TriggerWorkflow: WorkflowIcon, Delay: DelayIcon, Condition: DiamondIcon };

const VariableTextRenderer: React.FC<{ text: string }> = ({ text }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const lines = text.split('\n');
    const isLong = lines.length > 3 || text.length > 150;
    const displayText = isLong && !isExpanded ? lines.slice(0, 3).join('\n') + (lines.length > 3 ? '...' : '') : text;

    const parts = displayText.split(/(\[[A-Za-z_]+\])/g);

    return (
        <div>
            <p className="whitespace-pre-wrap">
                {parts.map((part, i) =>
                    part.startsWith('[') && part.endsWith(']') ? (
                        <span key={i} className="font-semibold text-blue-600 bg-blue-100 px-1 rounded-sm cursor-pointer" title={`Data source: ${part.slice(1,-1)}`}>
                            {part}
                        </span>
                    ) : (
                        <span key={i}>{part}</span>
                    )
                )}
            </p>
            {isLong && !isExpanded && (
                <button onClick={() => setIsExpanded(true)} className="text-xs font-semibold text-brand-blue hover:underline mt-1">
                    Show more
                </button>
            )}
            {isLong && isExpanded && (
                 <button onClick={() => setIsExpanded(false)} className="text-xs font-semibold text-brand-blue hover:underline mt-1">
                    Show less
                </button>
            )}
        </div>
    );
};

const ActionDetailRow: React.FC<{ label: string, value: any }> = ({ label, value }) => {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0) || (typeof value === 'object' && Object.keys(value).length === 0)) {
        return null;
    }

    const renderValue = () => {
        if (typeof value === 'boolean') {
            return value ? '"True"' : '"False"';
        }
        if (label === 'Message') {
            return <VariableTextRenderer text={String(value)} />;
        }
        if (typeof value === 'object') {
            return <pre className="text-xs bg-gray-200 p-1 rounded font-mono">{JSON.stringify(value, null, 2)}</pre>;
        }
        return `"${String(value)}"`;
    };

    return (
        <div className="flex">
            <p className="w-36 flex-shrink-0 font-semibold text-brand-gray-600 capitalize">{label.replace(/([A-Z])/g, ' $1')}:</p>
            <div className="text-brand-gray-800">{renderValue()}</div>
        </div>
    );
};

const ActionPreviewCard: React.FC<{ action: TriggerTemplateAction }> = ({ action }) => {
    const Icon = actionIconMap[action.type] || TaskIcon;
    const details = action.details as any;

    const typeColors: { [key: string]: string } = {
        CreateTask: 'text-green-500',
        SendMessage: 'text-blue-500',
        Condition: 'text-amber-500',
        TriggerWorkflow: 'text-purple-500',
        Delay: 'text-gray-500'
    };
    const colorClass = typeColors[action.type] || 'text-blue-500';

    const toTitleCase = (str: string) => str.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());

    return (
        <div className="p-4 bg-white border border-brand-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
                <Icon className={`w-6 h-6 ${colorClass}`}/>
                <h5 className={`font-bold text-lg ${colorClass.replace('text-', 'text-').replace('-500', '-600')}`}>{toTitleCase(action.type)}</h5>
            </div>
            <div className="mt-3 pl-8 space-y-2 text-sm">
                {Object.entries(details).map(([key, value]) => (
                     <ActionDetailRow key={key} label={key} value={value} />
                ))}
            </div>
        </div>
    );
};


const TemplatePreview: React.FC<{ template: TriggerTemplate | null, isLoading: boolean }> = ({ template, isLoading }) => {
    if (isLoading) {
        return (
            <div className="mt-4 pt-4 border-t">
                 <div className="space-y-2 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="pt-4 mt-4 border-t space-y-2">
                        <div className="h-20 bg-gray-200 rounded"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }
    
    if (!template) {
        return (
            <div className="mt-4 pt-4 border-t text-center text-sm text-brand-gray-500">
                <PackageIcon className="w-8 h-8 mx-auto text-brand-gray-300"/>
                <p className="mt-2 font-semibold">No template associated with this trigger yet.</p>
                 <div className="mt-2 space-x-4">
                    <button className="text-brand-blue font-semibold text-xs hover:underline" onClick={() => alert('Feature to create a new template is not yet implemented.')}>[Create Template]</button>
                    <button className="text-brand-blue font-semibold text-xs hover:underline" onClick={() => alert('Feature to browse templates is not yet implemented.')}>[Browse Templates]</button>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-4 pt-4 border-t">
            <div className="p-3 bg-brand-gray-100 rounded-lg">
                <h4 className="font-bold text-lg text-brand-gray-900">{template.name}</h4>
                <p className="text-sm text-brand-gray-600 mt-1">{template.description}</p>
            </div>
            <h4 className="mt-4 text-sm font-bold text-brand-gray-500 uppercase tracking-wider">
                Actions ({template.actions.length}):
            </h4>
            <div className="mt-2 space-y-3">
                {template.actions.map((action, index) => (
                    <ActionPreviewCard key={index} action={action} />
                ))}
            </div>
        </div>
    );
};

interface SelectEventTriggerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (payload: { events: TaskTriggerEvent[], template?: TriggerTemplate }) => void;
    currentTriggers: TaskTriggerEvent[];
    context: 'global' | 'local';
    zIndex?: number;
    selectionMode?: 'single' | 'multiple';
}

export const SelectEventTriggerModal: React.FC<SelectEventTriggerModalProps> = ({ isOpen, onClose, onConfirm, currentTriggers, context, zIndex = 60, selectionMode = 'multiple' }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [selectedEventForDetails, setSelectedEventForDetails] = useState<TriggerEvent | null>(null);
    const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
    const [localSelectedIds, setLocalSelectedIds] = useState<Set<TaskTriggerEvent>>(new Set());
    
    const [activeTemplate, setActiveTemplate] = useState<TriggerTemplate | null>(null);
    const [isTemplateLoading, setIsTemplateLoading] = useState(false);
    const [triggersWithTemplates, setTriggersWithTemplates] = useState<Set<TaskTriggerEvent>>(new Set());

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 200);
        return () => clearTimeout(handler);
    }, [searchQuery]);
    
    useEffect(() => {
        if (isOpen) {
            const initialEvent = allEvents.find(e => e.id === currentTriggers[0]) ?? allEvents.find(e => e.id === '')!;
            setSelectedEventForDetails(initialEvent);
            setOpenCategories(new Set(triggerEventCategories.map(c => c.name)));
            setSearchQuery('');
            setLocalSelectedIds(new Set(currentTriggers.filter(t => t) as TaskTriggerEvent[]));

             const checkTemplates = async () => {
                const promises = allEvents
                    .filter(e => e.id)
                    .map(e => getTemplateForTrigger(e.id as TaskTriggerEvent).then(t => ({ id: e.id, hasTemplate: !!t })));
                const results = await Promise.all(promises);
                const withTemplates = new Set(results.filter(r => r.hasTemplate).map(r => r.id as TaskTriggerEvent));
                setTriggersWithTemplates(withTemplates);
            }
            checkTemplates();

        }
    }, [isOpen, currentTriggers]);
    
    useEffect(() => {
        if (selectedEventForDetails?.id) {
            setIsTemplateLoading(true);
            setActiveTemplate(null);
            getTemplateForTrigger(selectedEventForDetails.id as TaskTriggerEvent).then(template => {
                setActiveTemplate(template || null);
                setIsTemplateLoading(false);
            });
        } else {
            setActiveTemplate(null);
        }
    }, [selectedEventForDetails]);


    const filteredCategories = useMemo(() => {
        const query = debouncedSearchQuery.toLowerCase();
        
        return triggerEventCategories
            .map(category => {
                const filteredEvents = category.events.filter(event => {
                    const contextMatch = context === 'global'
                        ? event.context === 'global' || event.context === 'both'
                        : event.context === 'local' || event.context === 'both';
                    if (!contextMatch) return false;
                    if (event.id === '' && selectionMode === 'multiple') return false; // Exclude 'None' for multi-select

                    if (query) {
                        return event.label.toLowerCase().includes(query) || 
                               event.description.toLowerCase().includes(query) ||
                               category.name.toLowerCase().includes(query);
                    }
                    return true;
                });
                return { ...category, events: filteredEvents };
            })
            .filter(category => category.events.length > 0);
    }, [debouncedSearchQuery, context, selectionMode]);
    
    useEffect(() => {
        if (debouncedSearchQuery) {
            setOpenCategories(new Set(filteredCategories.map(c => c.name)));
        }
    }, [debouncedSearchQuery, filteredCategories]);

    const toggleCategory = (categoryName: string) => {
        setOpenCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryName)) newSet.delete(categoryName);
            else newSet.add(categoryName);
            return newSet;
        });
    };

    const handleToggleSelection = (eventId: TaskTriggerEvent) => {
        if (selectionMode === 'single') {
            setLocalSelectedIds(new Set(eventId ? [eventId] : []));
            const event = allEvents.find(e => e.id === eventId);
            if (event) {
                setSelectedEventForDetails(event);
            }
        } else {
            setLocalSelectedIds(prev => {
                const newSet = new Set(prev);
                if (newSet.has(eventId)) {
                    newSet.delete(eventId);
                } else {
                    newSet.add(eventId);
                }
                return newSet;
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex }}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-semibold text-brand-gray-900 flex items-center gap-2">
                       <LightningBoltIcon className="w-6 h-6 text-brand-yellow" />
                       Select Event Trigger{selectionMode === 'multiple' ? '(s)' : ''}
                    </h2>
                    <div className="relative flex-grow max-w-xs mx-4">
                        <MagnifyingGlassIcon className="w-5 h-5 text-brand-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                        <input
                            type="text"
                            placeholder="Search triggers..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-10 pl-10 pr-4 py-2 border rounded-md bg-white border-brand-gray-300 focus:ring-1 focus:ring-brand-blue focus:border-brand-blue"
                            aria-label="Search triggers"
                        />
                    </div>
                     <button onClick={onClose} aria-label="Close modal" className="text-brand-gray-400 hover:text-brand-gray-600"><XIcon className="w-6 h-6" /></button>
                </div>

                <div className="flex-grow overflow-hidden grid grid-cols-12">
                    <div className="col-span-5 bg-brand-gray-50 border-r overflow-y-auto p-2 space-y-1">
                        {filteredCategories.length > 0 ? filteredCategories.map(category => (
                            <div key={category.name}>
                                <button onClick={() => toggleCategory(category.name)} className="w-full flex justify-between items-center p-2 rounded-md hover:bg-brand-gray-200 cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <span className="text-blue-500 text-lg">🔹</span>
                                        <span className="font-bold text-sm text-brand-gray-800">{category.name}</span>
                                        <span className="text-xs text-brand-gray-500">({category.events.length})</span>
                                    </div>
                                    <ChevronDownIcon className={`w-5 h-5 text-brand-gray-500 transition-transform ${openCategories.has(category.name) ? 'rotate-180' : ''}`} />
                                </button>
                                {openCategories.has(category.name) && (
                                    <div className="pl-5 py-1 space-y-1">
                                        {category.events.map(event => {
                                            const isSelected = localSelectedIds.has(event.id as TaskTriggerEvent);
                                            const isActive = selectedEventForDetails?.id === event.id;
                                            return (
                                                <div
                                                    key={event.id}
                                                    onClick={() => setSelectedEventForDetails(event)}
                                                    className={`w-full text-left p-2 flex items-start gap-3 rounded-md transition-colors border-l-4 cursor-pointer ${isActive ? 'bg-purple-100 border-violet-600' : 'border-transparent hover:bg-purple-50'}`}
                                                >
                                                    {selectionMode === 'multiple' ? (
                                                        <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelection(event.id as TaskTriggerEvent)} className="h-4 w-4 mt-1 rounded border-gray-300 text-brand-blue focus:ring-brand-blue focus:ring-2 bg-white" />
                                                    ) : (
                                                        <input type="radio" name="event-trigger-selection" checked={isSelected} onChange={() => handleToggleSelection(event.id as TaskTriggerEvent)} className="h-4 w-4 mt-1 border-gray-300 text-brand-blue focus:ring-brand-blue focus:ring-2 bg-white" />
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                             {triggersWithTemplates.has(event.id as TaskTriggerEvent) && <PackageIcon className="w-4 h-4 text-brand-gray-500" title="Has template"/>}
                                                            <p className={`font-semibold text-sm ${isActive ? 'text-violet-800' : 'text-brand-gray-800'}`}>{event.label}</p>
                                                        </div>
                                                        <p className="text-xs text-brand-gray-500">{event.description}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )) : (
                            <div className="text-center p-8 text-brand-gray-500">
                                <LightningBoltIcon className="w-12 h-12 mx-auto text-brand-gray-300" />
                                <p className="mt-2 font-semibold">No triggers found</p>
                                <p className="text-sm mt-1">Try a different search term.</p>
                            </div>
                        )}
                    </div>

                    <div className="col-span-7 p-6 overflow-y-auto">
                        {selectedEventForDetails ? (
                            <div className="space-y-4 animate-scale-in">
                                <div className="flex items-center gap-3">
                                    <LightningBoltIcon className="w-10 h-10 text-brand-yellow" />
                                    <div>
                                        <h3 className="text-2xl font-bold text-brand-gray-900">{selectedEventForDetails.label}</h3>
                                        <p className="text-sm text-brand-gray-600">{selectedEventForDetails.description}</p>
                                    </div>
                                </div>
                                <TemplatePreview template={activeTemplate} isLoading={isTemplateLoading} />
                            </div>
                        ) : (
                             <div className="h-full flex flex-col items-center justify-center text-center text-brand-gray-500">
                                <LightningBoltIcon className="w-12 h-12 text-brand-gray-300" />
                                <p className="mt-2 font-semibold">Select a trigger</p>
                                <p className="text-sm mt-1">Click on a trigger from the list to see its details here.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t bg-brand-gray-50 flex justify-end gap-3 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">Cancel</button>
                    <button onClick={() => {
                        onConfirm({ events: Array.from(localSelectedIds), template: activeTemplate || undefined });
                        onClose();
                    }} className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600 disabled:opacity-50">
                        Confirm Selection {selectionMode === 'multiple' && `(${localSelectedIds.size})`}
                    </button>
                </div>
            </div>
        </div>
    );
};
