import React, { useState, useEffect, useMemo, FC, useRef } from 'react';
import { XIcon } from '../icons/XIcon';
import { LightningBoltIcon } from '../icons/LightningBoltIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { triggerEvents } from '../../data/triggerEvents';
import { TaskIcon } from '../icons/TaskIcon';
import { MessageIcon } from '../icons/MessageIcon';
import { WorkflowIcon } from '../icons/WorkflowIcon';
import { DelayIcon } from '../icons/DelayIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { DiamondIcon } from '../icons/DiamondIcon';
import { SelectEventTriggerModal } from './SelectEventTriggerModal';
import { KindSpecificFields } from '../shared/TaskFormFields';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { PackageIcon } from '../icons/PackageIcon';
import { SelectTriggerTemplateModal } from './SelectTriggerTemplateModal';


import type { ReactiveFlow, ReactiveAction, TaskKind, TaskPriority, ReactiveTarget, CreateTaskActionDetails, SendMessageActionDetails, TriggerWorkflowActionDetails, DelayActionDetails, ReactiveActionType, TaskTriggerEvent, ConditionActionDetails, TaskOwner, TriggerTemplate, TriggerTemplateAction } from '../../types';

interface ConfigureReactiveOutcomesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveAndClose: (flows: ReactiveFlow[]) => void;
    onUpdate: (flows: ReactiveFlow[]) => void;
    reactiveFlows: ReactiveFlow[];
    taskKind: TaskKind;
    zIndex?: number;
}

const baseInputStyles = "block w-full border border-brand-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-brand-blue focus:border-brand-blue sm:text-sm bg-white text-brand-gray-900 disabled:bg-brand-gray-100";
const inputStyles = `${baseInputStyles} h-10 px-3 py-2`;
const selectStyles = `${baseInputStyles} h-10 pl-3 pr-10 py-2`;
const textareaStyles = `${baseInputStyles} px-3 py-2`;


// --- Main Modal Component ---
export const ConfigureReactiveOutcomesModal: FC<ConfigureReactiveOutcomesModalProps> = ({ isOpen, onClose, onSaveAndClose, onUpdate, reactiveFlows, zIndex = 60 }) => {
    const [localFlows, setLocalFlows] = useState<ReactiveFlow[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
    const [addMenuOpenFor, setAddMenuOpenFor] = useState<string | null>(null);
    const [isSelectTriggerModalOpen, setIsSelectTriggerModalOpen] = useState(false);
    const [isSelectTemplateModalOpen, setIsSelectTemplateModalOpen] = useState(false);
    const [currentFlowForTemplate, setCurrentFlowForTemplate] = useState<ReactiveFlow | null>(null);
    const [justUpdatedNodeId, setJustUpdatedNodeId] = useState<string | null>(null);
    const addMenuRef = useRef<HTMLDivElement>(null);
    const [nodeToDeleteId, setNodeToDeleteId] = useState<string | null>(null);
    const [deletingNodeId, setDeletingNodeId] = useState<string | null>(null);

    const findNode = (id: string, flows: (ReactiveFlow | ReactiveAction)[]): ReactiveFlow | ReactiveAction | null => {
        for (const item of flows) {
            if (item.id === id) return item;

            if ('actions' in item) { // ReactiveFlow
                const found = findNode(id, item.actions);
                if (found) return found;
            } else if ('actionType' in item && item.actionType === 'Condition') { // Condition
                const details = item.actionDetails as ConditionActionDetails;
                const found = findNode(id, details.onTrue || []) || findNode(id, details.onFalse || []);
                if (found) return found;
            }
        }
        return null;
    };

    const getAllDescendantIds = (startNode: ReactiveFlow | ReactiveAction): string[] => {
        const ids: string[] = [];
        const stack: (ReactiveFlow | ReactiveAction)[] = [];
    
        const getChildren = (node: ReactiveFlow | ReactiveAction): (ReactiveFlow | ReactiveAction)[] => {
            if ('actions' in node) { // ReactiveFlow
                return node.actions;
            }
            if ((node as ReactiveAction).actionType === 'Condition') {
                const details = (node as ReactiveAction).actionDetails as ConditionActionDetails;
                return [...(details.onTrue || []), ...(details.onFalse || [])];
            }
            return [];
        };
    
        // Initialize stack with direct children
        stack.push(...getChildren(startNode));
    
        while (stack.length > 0) {
            const current = stack.pop()!;
            ids.push(current.id);
            // Add grandchildren to stack
            stack.push(...getChildren(current));
        }
    
        return ids;
    };

    const selectedNode = useMemo(() => {
        if (!selectedNodeId) return null;
        return findNode(selectedNodeId, localFlows);
    }, [selectedNodeId, localFlows]);

    const nodeToDelete = useMemo(() => {
        if (!nodeToDeleteId) return null;
        return findNode(nodeToDeleteId, localFlows);
    }, [nodeToDeleteId, localFlows]);

    const isDeletingTrigger = useMemo(() => {
        if (!nodeToDelete) return false;
        return getNodeType(nodeToDelete) === 'trigger';
    }, [nodeToDelete]);


    useEffect(() => {
        if (isOpen) {
            setLocalFlows(JSON.parse(JSON.stringify(reactiveFlows || [])));
            setSelectedNodeId(null);
            setCollapsedNodes(new Set());
            setAddMenuOpenFor(null);
        }
    }, [isOpen, reactiveFlows]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
                setAddMenuOpenFor(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    if (!isOpen) return null;

    const updateFlows = (updater: (item: ReactiveFlow | ReactiveAction) => (ReactiveFlow | ReactiveAction)) => {
        const traverseAndApply = (nodes: (ReactiveFlow | ReactiveAction)[]): (ReactiveFlow | ReactiveAction)[] => {
            if (!nodes) return [];
            return nodes.map(node => {
                let updatedNode = updater(node);
                
                let resultNode = { ...updatedNode };
    
                if ('actions' in resultNode) { // ReactiveFlow
                    resultNode.actions = traverseAndApply(resultNode.actions) as ReactiveAction[];
                } else if (resultNode.actionType === 'Condition') {
                    const details = resultNode.actionDetails as ConditionActionDetails;
                    resultNode.actionDetails = {
                        ...details,
                        onTrue: traverseAndApply(details.onTrue || []) as ReactiveAction[],
                        onFalse: traverseAndApply(details.onFalse || []) as ReactiveAction[],
                    };
                }
                return resultNode;
            });
        };
        setLocalFlows(traverseAndApply(localFlows) as ReactiveFlow[]);
    };
    
    const handleOpenTemplateModal = (flowId: string) => {
        const flow = localFlows.find(f => f.id === flowId);
        if (flow) {
            setCurrentFlowForTemplate(flow);
            setIsSelectTemplateModalOpen(true);
        }
    };
    
    const handleApplyTemplate = (template: TriggerTemplate) => {
        if (!currentFlowForTemplate) return;

        const newActions: ReactiveAction[] = template.actions.map(actionTemplate => ({
            id: `action-${Date.now()}-${Math.random()}`,
            actionType: actionTemplate.type,
            actionDetails: actionTemplate.details as any,
        }));

        updateFlows(item => {
            if (item.id === currentFlowForTemplate.id) {
                return {
                    ...item,
                    actions: newActions,
                    sourceTemplateId: template.templateId,
                    sourceTemplateName: template.name,
                };
            }
            return item;
        });

        setIsSelectTemplateModalOpen(false);
        setCurrentFlowForTemplate(null);
    };

    const cloneActionsWithNewIds = (actions: TriggerTemplateAction[]): ReactiveAction[] => {
        return actions.map(actionTemplate => {
            const newAction: ReactiveAction = {
                id: `action-${Date.now()}-${Math.random()}`,
                actionType: actionTemplate.type,
                actionDetails: JSON.parse(JSON.stringify(actionTemplate.details)) as any, // deep copy details
            };
    
            if (newAction.actionType === 'Condition') {
                const details = newAction.actionDetails as ConditionActionDetails;
                details.onTrue = cloneActionsWithNewIds((details.onTrue || []) as any[]);
                details.onFalse = cloneActionsWithNewIds((details.onFalse || []) as any[]);
            }
            
            return newAction;
        });
    };

    const handleAddTrigger = (triggerId: TaskTriggerEvent | null, template?: TriggerTemplate) => {
        if (triggerId) {
            const newFlow: ReactiveFlow = {
                id: `flow-${Date.now()}`,
                trigger: { id: triggerId },
                actions: template ? cloneActionsWithNewIds(template.actions) : [],
                sourceTemplateId: template?.templateId,
                sourceTemplateName: template?.name,
            };
            setLocalFlows(prev => [...prev, newFlow]);
        }
        setIsSelectTriggerModalOpen(false);
    };

    const handleAddChild = (parentId: string, childType: 'Condition' | ReactiveActionType, branch?: 'onTrue' | 'onFalse') => {
        const newId = `action-${Date.now()}`;
        let newChild: ReactiveAction;

        if (childType === 'Condition') {
            newChild = {
                id: newId, actionType: 'Condition',
                actionDetails: { expression: 'score > 10', onTrue: [], onFalse: [] }
            };
        } else {
            let details: any = {};
            if (childType === 'CreateTask') {
                details = { title: 'New Task', kind: 'Task', subjectRole: 'Care Manager', priority: 'Medium', extra: {} };
            } else if (childType === 'SendMessage') {
                details = { channel: 'In-app', recipient: 'Patient', message: 'Hello!' };
            } else if (childType === 'TriggerWorkflow') {
                details = { workflowId: 'example-workflow' };
            } else if (childType === 'Delay') {
                details = { value: 5, unit: 'minutes' };
            }
            newChild = { id: newId, actionType: childType, actionDetails: details };
        }

        updateFlows(item => {
            if (item.id !== parentId) return item;

            const clonedItem = JSON.parse(JSON.stringify(item));

            if ('actions' in clonedItem) { // ReactiveFlow
                clonedItem.actions.push(newChild);
            } else if (clonedItem.actionType === 'Condition') {
                const details = clonedItem.actionDetails as ConditionActionDetails;
                if (branch === 'onFalse') {
                    if (!details.onFalse) details.onFalse = [];
                    details.onFalse.push(newChild);
                } else { // Default to onTrue
                    if (!details.onTrue) details.onTrue = [];
                    details.onTrue.push(newChild);
                }
            }
            return clonedItem;
        });

        setAddMenuOpenFor(null);
        setSelectedNodeId(newId);
        setJustUpdatedNodeId(newId);
        setTimeout(() => setJustUpdatedNodeId(null), 2500);

        setCollapsedNodes(prev => {
            const newSet = new Set(prev);
            newSet.delete(parentId);
            return newSet;
        });
    };
    
    const requestDeleteNode = (nodeId: string) => {
        setNodeToDeleteId(nodeId);
    };

    const handleConfirmDelete = () => {
        if (!nodeToDeleteId) return;

        const removeNodeFromTree = (nodes: (ReactiveFlow | ReactiveAction)[], idToRemove: string): (ReactiveFlow | ReactiveAction)[] => {
            if (!nodes) return [];
            // First, filter out the node at the current level
            const filteredNodes = nodes.filter(node => node.id !== idToRemove);

            // Then, recurse into the children of the remaining nodes
            return filteredNodes.map(node => {
                const newNode = { ...node }; // shallow copy
                if ('actions' in newNode && Array.isArray(newNode.actions)) {
                    newNode.actions = removeNodeFromTree(newNode.actions, idToRemove) as ReactiveAction[];
                } else if ('actionType' in newNode) {
                    const action = newNode as ReactiveAction;
                    if (action.actionType === 'Condition') {
                        const details = action.actionDetails as ConditionActionDetails;
                        // Important: create a new actionDetails object
                        newNode.actionDetails = {
                            ...details,
                            onTrue: removeNodeFromTree(details.onTrue || [], idToRemove) as ReactiveAction[],
                            onFalse: removeNodeFromTree(details.onFalse || [], idToRemove) as ReactiveAction[],
                        };
                    }
                }
                return newNode;
            });
        };

        const nodeObjToDelete = findNode(nodeToDeleteId, localFlows);
        const descendantIds = nodeObjToDelete ? getAllDescendantIds(nodeObjToDelete) : [];
        const allIdsToDelete = new Set([nodeToDeleteId, ...descendantIds]);
    
        setDeletingNodeId(nodeToDeleteId);
        const idToDelete = nodeToDeleteId;
        setNodeToDeleteId(null);
    
        setTimeout(() => {
            setLocalFlows(prevFlows => removeNodeFromTree(prevFlows, idToDelete) as ReactiveFlow[]);
            
            if (selectedNodeId && allIdsToDelete.has(selectedNodeId)) {
                setSelectedNodeId(null);
            }
    
            setDeletingNodeId(null);
            // A more integrated toast notification system would be better in a real app.
            alert('Node and its sub-items deleted successfully.');
        }, 300);
    };

    const handleUpdateNode = (nodeId: string, updates: Partial<ReactiveFlow | ReactiveAction>) => {
       updateFlows(item => item.id === nodeId ? { ...item, ...updates } : item);
       setJustUpdatedNodeId(nodeId);
       setTimeout(() => setJustUpdatedNodeId(null), 2500); // Corresponds to highlight-animation duration
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex }}>
                <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-semibold text-brand-gray-900 flex items-center gap-2"><LightningBoltIcon className="w-6 h-6 text-yellow-500"/>Configure Reactive Outcomes</h2>
                            <p className="text-sm text-brand-gray-500">Define event-based automations in a clear, hierarchical tree.</p>
                        </div>
                        <button onClick={onClose}><XIcon className="w-6 h-6 text-brand-gray-400" /></button>
                    </div>
                    <div className="flex-grow grid grid-cols-12 overflow-hidden">
                        <div className="col-span-7 border-r overflow-y-auto p-4">
                            <div className="flex justify-end mb-2">
                                 <button onClick={() => setIsSelectTriggerModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-blue hover:bg-brand-gray-50">
                                    <PlusIcon className="w-4 h-4" /> Add Trigger
                                </button>
                            </div>
                            <div className="space-y-2">
                                {localFlows.map(flow => <NodeComponent key={flow.id} node={flow} level={0} {...{ selectedNodeId, setSelectedNodeId, collapsedNodes, setCollapsedNodes, addMenuOpenFor, setAddMenuOpenFor, addMenuRef, handleAddChild, handleDeleteNode: requestDeleteNode, justUpdatedNodeId, deletingNodeId, handleOpenTemplateModal }} />)}
                            </div>
                            {localFlows.length === 0 && (
                                <div className="text-center p-8 text-brand-gray-500 border-2 border-dashed rounded-lg mt-4">
                                    <LightningBoltIcon className="w-10 h-10 mx-auto text-brand-gray-300" />
                                    <p className="mt-2 font-semibold">No triggers defined.</p>
                                    <p className="text-sm">Get started by adding your first event trigger.</p>
                                    <button onClick={() => setIsSelectTriggerModalOpen(true)} className="mt-2 text-sm font-semibold text-brand-blue hover:underline">Add First Trigger</button>
                                </div>
                            )}
                        </div>
                        <div className="col-span-5 bg-brand-gray-50 overflow-y-auto">
                            <PropertiesPanel selectedNode={selectedNode} onUpdate={handleUpdateNode} zIndex={zIndex} />
                        </div>
                    </div>
                    <div className="p-4 bg-brand-gray-50 border-t flex justify-between items-center">
                        <div>
                            <button onClick={() => onUpdate(localFlows)} className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">Save Changes</button>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={onClose} className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">Cancel</button>
                            <button onClick={() => onSaveAndClose(localFlows)} className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600">Save & Close</button>
                        </div>
                    </div>
                </div>
            </div>
            <SelectEventTriggerModal
                isOpen={isSelectTriggerModalOpen}
                onClose={() => setIsSelectTriggerModalOpen(false)}
                onConfirm={(payload) => handleAddTrigger(payload.events[0] || null, payload.template)}
                currentTriggers={[]}
                context="local"
                zIndex={zIndex + 1}
                selectionMode="single"
            />
             {currentFlowForTemplate && (
                <SelectTriggerTemplateModal
                    isOpen={isSelectTemplateModalOpen}
                    onClose={() => setIsSelectTemplateModalOpen(false)}
                    onApply={handleApplyTemplate}
                    triggerId={currentFlowForTemplate.trigger.id}
                    zIndex={zIndex + 1}
                />
            )}
             <DeleteConfirmationModal
                isOpen={!!nodeToDeleteId}
                onClose={() => setNodeToDeleteId(null)}
                onConfirm={handleConfirmDelete}
                title={isDeletingTrigger ? "Delete trigger?" : "Delete this node?"}
                message={isDeletingTrigger ? "This will remove the trigger and all of its child actions." : "This will also remove all of its sub-items. This action cannot be undone."}
                zIndex={zIndex + 5}
            />
        </>
    );
};

// --- Child Components for Modal ---

const nodeColors = {
    trigger: { border: 'border-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', icon: 'text-violet-600' },
    condition: { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-600' },
    action: { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600' },
};
const actionIconMap: { [key in ReactiveActionType]?: FC<any> } = { CreateTask: TaskIcon, SendMessage: MessageIcon, TriggerWorkflow: WorkflowIcon, Delay: DelayIcon };
const getNodeIcon = (node: ReactiveFlow | ReactiveAction): FC<any> => {
    if ('trigger' in node) return LightningBoltIcon;
    const action = node as ReactiveAction;
    if (action.actionType === 'Condition') return DiamondIcon;
    return actionIconMap[action.actionType] || TaskIcon;
};
const getNodeType = (node: ReactiveFlow | ReactiveAction): 'trigger' | 'condition' | 'action' => {
    if ('trigger' in node) return 'trigger';
    if ((node as ReactiveAction).actionType === 'Condition') return 'condition';
    return 'action';
};
const getNodeTitle = (node: ReactiveFlow | ReactiveAction): string => {
    if ('trigger' in node) return triggerEvents.find(t => t.id === node.trigger.id)?.label || 'Trigger';
    const action = node as ReactiveAction;
    switch(action.actionType) {
        case 'Condition': return (action.actionDetails as ConditionActionDetails).expression || 'New Condition';
        case 'CreateTask': return (action.actionDetails as CreateTaskActionDetails).title ? `Create Task: ${(action.actionDetails as CreateTaskActionDetails).title}` : 'Create Task';
        case 'SendMessage': return 'Send Message';
        case 'TriggerWorkflow': return 'Trigger Workflow';
        case 'Delay': return `Delay for ${(action.actionDetails as DelayActionDetails).value} ${(action.actionDetails as DelayActionDetails).unit}`;
        default: return action.actionType;
    }
};

const AddActionMenu: React.FC<{
    nodeType: 'trigger' | 'condition' | 'action';
    onSelect: (type: 'Condition' | ReactiveActionType, branch?: 'onTrue' | 'onFalse') => void;
}> = ({ nodeType, onSelect }) => {
    const actionItems: { type: 'Condition' | ReactiveActionType, label: string, icon: FC<any> }[] = [
        { type: 'Condition', label: 'Condition / Rule', icon: DiamondIcon },
        { type: 'CreateTask', label: 'Create Task', icon: TaskIcon },
        { type: 'SendMessage', label: 'Send Message', icon: MessageIcon },
        { type: 'TriggerWorkflow', label: 'Trigger Workflow', icon: WorkflowIcon },
        { type: 'Delay', label: 'Delay', icon: DelayIcon },
    ];

    const MenuItem: FC<{ item: typeof actionItems[0], branch?: 'onTrue' | 'onFalse' }> = ({ item, branch }) => (
        <li onClick={() => onSelect(item.type, branch)} className="px-3 py-2 flex items-center gap-2 hover:bg-brand-gray-100 cursor-pointer">
            <item.icon className={`w-4 h-4 ${item.type === 'Condition' ? 'text-amber-500' : 'text-blue-500'}`}/> {item.label}
        </li>
    );

    if (nodeType === 'condition') {
        return (
            <>
                <div className="p-2 font-semibold text-xs text-green-600 border-b">ADD TO 'ON TRUE'</div>
                <ul className="py-1">
                    {actionItems.map(item => <MenuItem key={`${item.type}-true`} item={item} branch="onTrue" />)}
                </ul>
                <div className="p-2 font-semibold text-xs text-red-600 border-b">ADD TO 'ON FALSE'</div>
                <ul className="py-1">
                    {actionItems.map(item => <MenuItem key={`${item.type}-false`} item={item} branch="onFalse" />)}
                </ul>
            </>
        );
    }
    
    // For trigger or CreateTask action
    return (
        <>
            <div className="p-2 font-semibold text-xs text-brand-gray-500 border-b">
                {nodeType === 'trigger' ? "ADD OUTCOME" : "ADD SUB-FLOW ACTION"}
            </div>
            <ul className="py-1">
                {actionItems.map(item => <MenuItem key={item.type} item={item} />)}
            </ul>
        </>
    );
};

const NodeComponent: FC<{ node: ReactiveFlow | ReactiveAction, level: number, [key: string]: any }> = (props) => {
    const { node, level, selectedNodeId, setSelectedNodeId, collapsedNodes, setCollapsedNodes, addMenuOpenFor, setAddMenuOpenFor, addMenuRef, handleAddChild, handleDeleteNode, justUpdatedNodeId, deletingNodeId, handleOpenTemplateModal } = props;
    const isCollapsed = collapsedNodes.has(node.id);
    const type = getNodeType(node);
    const colors = nodeColors[type];
    const Icon = getNodeIcon(node);
    const title = getNodeTitle(node);
    const isSelected = selectedNodeId === node.id;
    const isJustUpdated = justUpdatedNodeId === node.id;
    const isDeleting = deletingNodeId === node.id;
    const isTrigger = type === 'trigger';
    const isLocked = isTrigger && (node as ReactiveFlow).sourceTemplateId;

    const canHaveChildren = type === 'trigger' || type === 'condition';
    
    const childrenCount = useMemo(() => {
        if (type === 'trigger') return (node as ReactiveFlow).actions.length;
        if (type === 'condition') {
            const details = (node as ReactiveAction).actionDetails as ConditionActionDetails;
            return (details.onTrue?.length || 0) + (details.onFalse?.length || 0);
        }
        return 0;
    }, [node, type]);

    const handleToggleCollapse = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCollapsedNodes((prev: Set<string>) => {
            const newSet = new Set(prev);
            if (newSet.has(node.id)) newSet.delete(node.id); else newSet.add(node.id);
            return newSet;
        });
    };

    const Branch: FC<{ actions: ReactiveAction[] }> = ({ actions }) => (
        <div className="pl-6 relative">
            <div className="absolute left-3 -top-2 bottom-0 w-0.5 bg-brand-gray-200"></div>
            {actions?.map((action) => (
                <div key={action.id} className="relative">
                    <div className="absolute -left-3 top-4 h-0.5 w-3 bg-brand-gray-200"></div>
                    <NodeComponent {...props} node={action} level={level + 1} />
                </div>
            ))}
        </div>
    );

    return (
        <div className={`my-2 relative ${isDeleting ? 'node-deleting' : ''}`}>
            <div
                className={`p-2 rounded-lg border-2 flex items-start gap-3 cursor-pointer group ${colors.bg} ${isSelected ? colors.border : 'border-transparent'} hover:${colors.border.replace('border-', 'border-')} ${isJustUpdated ? 'highlight-animation' : ''}`}
                onClick={() => setSelectedNodeId(node.id)}
            >
                {childrenCount > 0 && <button onClick={handleToggleCollapse} className="p-1 mt-0.5 rounded-full hover:bg-black/10"><ChevronDownIcon className={`w-4 h-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} /></button>}
                <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center mt-1 ${childrenCount === 0 ? 'ml-6' : ''}`}><Icon className={`w-5 h-5 ${colors.icon}`} /></div>
                <div className="flex-1 mt-0.5">
                    <div className="flex items-center gap-2">
                         <p className={`font-semibold text-sm ${colors.text}`}>{title}</p>
                         {(node as ReactiveFlow).sourceTemplateName && (
                            <div title={`From template: ${(node as ReactiveFlow).sourceTemplateName}`} className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-md">
                                <PackageIcon className="w-3 h-3"/> Template
                            </div>
                         )}
                    </div>
                </div>
                <div className="flex items-center gap-1 relative">
                    {canHaveChildren && <button onClick={(e) => { e.stopPropagation(); setAddMenuOpenFor(node.id === addMenuOpenFor ? null : node.id); }} className="p-1 rounded-full text-brand-gray-400 hover:bg-black/10 hover:text-brand-gray-700"><PlusIcon className="w-4 h-4"/></button>}
                    {isTrigger && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                            disabled={isLocked || isDeleting}
                            title={isLocked ? "This trigger is locked" : "Delete trigger"}
                            aria-label="Delete trigger"
                            className="p-1 rounded-full text-brand-gray-400 hover:bg-black/10 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed opacity-60 group-hover:opacity-100 focus:opacity-100"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    )}
                    {level > 0 && 
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }} 
                            disabled={isDeleting} 
                            title="Delete action"
                            aria-label="Delete action"
                            className="p-1 rounded-full text-brand-gray-400 hover:bg-black/10 hover:text-red-500 disabled:opacity-50 opacity-60 group-hover:opacity-100 focus:opacity-100"
                        >
                            <TrashIcon className="w-4 h-4"/>
                        </button>
                    }
                    {addMenuOpenFor === node.id && (
                        <div ref={addMenuRef} className="absolute top-full right-0 z-10 mt-1 w-56 bg-white rounded-md shadow-lg border text-sm">
                            <AddActionMenu 
                                nodeType={type} 
                                onSelect={(type, branch) => handleAddChild(node.id, type, branch)} 
                            />
                        </div>
                    )}
                </div>
            </div>
            {!isCollapsed && (
                <>
                    {type === 'trigger' && (
                        <div>
                             <Branch actions={(node as ReactiveFlow).actions} />
                              <div className="pl-6 mt-2">
                                <button onClick={() => handleOpenTemplateModal(node.id)} className="flex items-center gap-2 text-xs font-semibold text-brand-blue hover:underline p-1">
                                    <PackageIcon className="w-3.5 h-3.5"/>
                                    Load from Template
                                </button>
                             </div>
                        </div>
                    )}
                    {type === 'condition' && (
                        <>
                            <div className="pt-2">
                                <p className="pl-[27px] text-xs font-bold text-green-600 tracking-wider">ON TRUE</p>
                                <Branch actions={((node as ReactiveAction).actionDetails as ConditionActionDetails).onTrue} />
                            </div>
                            <div className="pt-2">
                                <p className="pl-[27px] text-xs font-bold text-red-600 tracking-wider">ON FALSE</p>
                                <Branch actions={((node as ReactiveAction).actionDetails as ConditionActionDetails).onFalse} />
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    )
};

const PropertyGroup: FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <label className="block text-sm font-medium text-brand-gray-700">{title}</label>
        {children}
    </div>
);

const CreateTaskProperties: FC<{ details: CreateTaskActionDetails, onUpdate: (updates: Partial<CreateTaskActionDetails>) => void, zIndex: number }> = ({ details, onUpdate, zIndex }) => {
    const taskKindOptions: TaskKind[] = ['Communication', 'Service Request', 'Task', 'Device Request', 'Nutrition Order', 'Medication Request', 'Questionnaire', 'Other'];
    const taskPriorityOptions: TaskPriority[] = ['High', 'Medium', 'Low'];
    const targetOptions: ReactiveTarget[] = ['Patient', 'Care Manager', 'PCP', 'Specialist', 'System', 'Physician'];

    const handleKindChange = (newKind: TaskKind) => {
        onUpdate({ kind: newKind, extra: {} });
    };

    // Construct props for KindSpecificFields
    const isRequestKind = useMemo(() => ['Service Request', 'Device Request', 'Medication Request', 'Nutrition Order'].includes(details.kind), [details.kind]);
    const isInternalKind = useMemo(() => ['Task', 'Communication', 'Other'].includes(details.kind), [details.kind]);

    const formDataForFields = useMemo(() => ({
        ...details,
        owner: isInternalKind ? details.subjectRole as TaskOwner : undefined,
        performer: isRequestKind && details.subjectRole ? [details.subjectRole as string] : [],
    }), [details, isInternalKind, isRequestKind]);

    const setFormDataForFields = (updater: (prev: any) => any) => {
        const newFormData = updater(formDataForFields);

        const updates: Partial<CreateTaskActionDetails> = {};
        if (JSON.stringify(newFormData.extra) !== JSON.stringify(details.extra)) {
            updates.extra = newFormData.extra;
        }

        if (isInternalKind && newFormData.owner !== details.subjectRole) {
            updates.subjectRole = newFormData.owner;
        }
        
        if (isRequestKind) {
            const newPerformer = newFormData.performer?.[0];
            const currentPerformer = details.subjectRole;
            if (newPerformer !== currentPerformer) {
                updates.subjectRole = newPerformer;
            }
        }
        
        if (Object.keys(updates).length > 0) {
            onUpdate(updates);
        }
    };

    return (
        <div className="space-y-4">
            <PropertyGroup title="Task Title">
                <input type="text" value={details.title || ''} onChange={e => onUpdate({ title: e.target.value })} className={inputStyles} />
            </PropertyGroup>
            <div className="grid grid-cols-2 gap-4">
                <PropertyGroup title="Kind">
                    <select value={details.kind || 'Task'} onChange={e => handleKindChange(e.target.value as TaskKind)} className={selectStyles}>
                        {taskKindOptions.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                </PropertyGroup>
                <PropertyGroup title="Priority">
                    <select value={details.priority || 'Medium'} onChange={e => onUpdate({ priority: e.target.value as TaskPriority })} className={selectStyles}>
                        {taskPriorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </PropertyGroup>
            </div>
            <PropertyGroup title="Subject Role">
                <select value={details.subjectRole || 'Care Manager'} onChange={e => onUpdate({ subjectRole: e.target.value as ReactiveTarget })} className={selectStyles}>
                    {targetOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </PropertyGroup>
            <div className="pt-4 mt-4 border-t border-brand-gray-200">
                <h4 className="font-semibold text-brand-gray-700">Kind-Specific Fields</h4>
                <KindSpecificFields 
                    formData={formDataForFields as any}
                    setFormData={setFormDataForFields as any}
                    carePlan={undefined}
                />
            </div>
        </div>
    );
};

const SendMessageProperties: FC<{ details: SendMessageActionDetails, onUpdate: (updates: Partial<SendMessageActionDetails>) => void }> = ({ details, onUpdate }) => {
    const channelOptions: ('In-app' | 'SMS' | 'Email')[] = ['In-app', 'SMS', 'Email'];
    const targetOptions: ReactiveTarget[] = ['Patient', 'Care Manager', 'PCP', 'Specialist', 'Physician'];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <PropertyGroup title="Channel">
                    <select value={details.channel || 'In-app'} onChange={e => onUpdate({ channel: e.target.value as 'In-app' | 'SMS' | 'Email' })} className={selectStyles}>
                        {channelOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </PropertyGroup>
                <PropertyGroup title="Recipient">
                    <select value={details.recipient || 'Patient'} onChange={e => onUpdate({ recipient: e.target.value as ReactiveTarget })} className={selectStyles}>
                        {targetOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </PropertyGroup>
            </div>
            <PropertyGroup title="Message">
                <textarea value={details.message || ''} onChange={e => onUpdate({ message: e.target.value })} className={textareaStyles} rows={4} placeholder="Enter message content..." />
            </PropertyGroup>
        </div>
    );
};

const PropertiesPanel: FC<{ selectedNode: ReactiveFlow | ReactiveAction | null, onUpdate: (id: string, updates: any) => void, zIndex: number }> = ({ selectedNode, onUpdate, zIndex }) => {
    if (!selectedNode) return <div className="p-6 text-center text-brand-gray-500"><p className="font-semibold">No Node Selected</p><p className="text-sm mt-1">Click on a trigger, condition, or action in the tree to view and edit its properties.</p></div>;

    const type = getNodeType(selectedNode);
    const Icon = getNodeIcon(selectedNode);
    const colors = nodeColors[type];

    const handleDetailsUpdate = (updates: any) => {
        onUpdate(selectedNode.id, { actionDetails: { ...(selectedNode as ReactiveAction).actionDetails, ...updates } });
    };

    const renderActionProperties = () => {
        const action = selectedNode as ReactiveAction;
        switch(action.actionType) {
            case 'CreateTask':
                return <CreateTaskProperties details={action.actionDetails as CreateTaskActionDetails} onUpdate={handleDetailsUpdate} zIndex={zIndex} />;
            case 'SendMessage':
                return <SendMessageProperties details={action.actionDetails as SendMessageActionDetails} onUpdate={handleDetailsUpdate} />;
            default:
                return <p className="text-brand-gray-500">No editable properties for this action type.</p>;
        }
    };

    return (
        <div className="p-6 space-y-6 text-sm">
            <div className="flex items-start gap-3 pb-4 border-b border-brand-gray-200">
                <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg ${colors.bg}`}><Icon className={`w-6 h-6 ${colors.icon}`} /></div>
                <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>{type}</p>
                    <h3 className="font-bold text-lg text-brand-gray-800 -mt-1">{getNodeTitle(selectedNode)}</h3>
                </div>
            </div>
            
            {type === 'trigger' && (
                <PropertyGroup title="Trigger Event">
                    <p className="p-2 bg-white border rounded-md">{triggerEvents.find(t => t.id === (selectedNode as ReactiveFlow).trigger.id)?.label}</p>
                </PropertyGroup>
            )}
            {type === 'condition' && (
                 <PropertyGroup title="Condition Expression">
                    <input type="text" value={(selectedNode.actionDetails as ConditionActionDetails).expression} onChange={e => handleDetailsUpdate({ expression: e.target.value })} className={inputStyles} placeholder="e.g. observation.value > 140" />
                </PropertyGroup>
            )}
            {type === 'action' && renderActionProperties()}
        </div>
    );
};
