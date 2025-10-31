import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CarePlan, AiOrchestratorResponse } from '../../types';
import { PaperAirplaneIcon } from '../icons/PaperAirplaneIcon';
import { BrainIcon } from '../icons/BrainIcon';
import { SettingsIcon } from '../icons/SettingsIcon';
import { ChevronDoubleLeftIcon } from '../icons/ChevronDoubleLeftIcon';
import { ChevronDoubleRightIcon } from '../icons/ChevronDoubleRightIcon';
import { MicrophoneIcon } from '../icons/MicrophoneIcon';
import { MuteIcon } from '../icons/MuteIcon';
import { CodeBracketIcon } from '../icons/CodeBracketIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { XIcon } from '../icons/XIcon';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';
import { TargetIcon } from '../icons/TargetIcon';
import { LightningBoltIcon } from '../icons/LightningBoltIcon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';

// @ts-ignore
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
if (recognition) {
  recognition.continuous = false;
  recognition.lang = 'es-ES';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
}

interface AICarePlanAssistantPanelProps {
  carePlan: CarePlan;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSendCommand: (command: string) => void;
  isLoading: boolean;
  interactionState: AiOrchestratorResponse;
  onInteraction: (payload: { action: string; value?: any }, context: any) => void;
}

type ChatHistoryItem = 
    | { id: number; from: 'user'; content: string }
    | { id: number; from: 'ai'; content: AiOrchestratorResponse };

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    // Filter out the action line if present
    const lines = content.split('\n').filter(line => line.trim() !== '' && !line.trim().startsWith('🪄') && !line.trim().startsWith('👉'));

    return (
        <div className="space-y-1 text-sm">
            {lines.map((line, index) => {
                const trimmedLine = line.trim();
                // Headings
                if (trimmedLine.startsWith('### 🩺') || trimmedLine.startsWith('### 🧩') || trimmedLine.startsWith('### ⚙️')) {
                    return <h3 key={index} className="text-md font-bold text-brand-gray-800 pt-3 flex items-center gap-2">{trimmedLine.replace('### ','')}</h3>;
                }
                // Subheadings
                if (trimmedLine.startsWith('🔹')) {
                     return <h4 key={index} className="text-sm font-semibold text-brand-gray-700 pt-2 flex items-center gap-2">{trimmedLine}</h4>
                }
                // List items with emojis
                if (/^(\s*)(🔄|📅|✅|🔔|🩺|➕|🧑‍⚕️|📚|📄)/.test(trimmedLine)) {
                    return <p key={index} className="pl-4 flex items-start gap-2">{trimmedLine.trim()}</p>;
                }
                // Regular bullet points
                if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
                    return <p key={index} className="pl-4 flex items-start gap-2">∙ <span className="flex-1">{trimmedLine.substring(2)}</span></p>;
                }
                // Default paragraph
                return <p key={index}>{trimmedLine}</p>;
            })}
        </div>
    );
};


export const AICarePlanAssistantPanel: React.FC<AICarePlanAssistantPanelProps> = ({
  carePlan,
  isCollapsed,
  onToggleCollapse,
  onSendCommand,
  isLoading,
  interactionState,
  onInteraction,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (interactionState.type !== 'idle') {
        setHistory(prev => [...prev, { id: Date.now(), from: 'ai', content: interactionState }]);
    }
  }, [interactionState]);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading]);
  
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (inputValue.trim()) {
      onSendCommand(inputValue);
      setHistory(prev => [...prev, { id: Date.now(), from: 'user', content: inputValue }]);
      setInputValue('');
    }
  };

  const toggleVoice = () => {
    if (!recognition) {
        alert("Voice recognition is not supported in this browser.");
        return;
    }
    if (isListening) {
        recognition.stop();
        setIsListening(false);
    } else {
        recognition.start();
        setIsListening(true);
    }
  };

  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        // Automatically send after voice input
        onSendCommand(transcript);
        setHistory(prev => [...prev, { id: Date.now(), from: 'user', content: transcript }]);
        setInputValue('');
    };
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
  }, [onSendCommand]);


  if (isCollapsed) {
    return (
      <div className="fixed left-0 top-0 h-full w-20 bg-brand-gray-800 border-r border-brand-gray-700 flex flex-col items-center py-4 shadow-lg z-50">
        <button onClick={onToggleCollapse} className="p-2 text-brand-gray-400 hover:text-white hover:bg-brand-gray-700 rounded-lg" aria-label="Expand Panel">
          <ChevronDoubleRightIcon className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-0 h-full w-[400px] bg-brand-gray-50 border-r border-brand-gray-200 flex flex-col shadow-lg z-50">
      <header className="p-4 border-b bg-white shadow-sm flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <BrainIcon className="w-6 h-6 text-brand-blue" />
          <div>
            <h2 className="font-semibold text-brand-gray-800">AI Care Plan Assistant</h2>
            <p className="text-xs text-brand-gray-500">Talk or type to personalize your plan.</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button className="p-2 text-brand-gray-500 hover:text-brand-gray-700 hover:bg-brand-gray-100 rounded-lg" aria-label="Settings"><SettingsIcon className="w-5 h-5"/></button>
          <button onClick={onToggleCollapse} className="p-2 text-brand-gray-500 hover:text-brand-gray-700 hover:bg-brand-gray-100 rounded-lg" aria-label="Collapse Panel">
            <ChevronDoubleLeftIcon className="w-5 h-5"/>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.map(item => <ChatMessage key={item.id} item={item} onInteraction={onInteraction} />)}
        {isLoading && <LoadingIndicator />}
        <div ref={chatEndRef} />
      </div>

      <footer className="p-3 border-t bg-white flex-shrink-0">
        <div className="flex gap-2">
            <button onClick={toggleVoice} className={`p-2 border rounded-md ${isListening ? 'text-red-500 border-red-300 bg-red-50 animate-pulse' : 'text-brand-gray-500 border-brand-gray-300 hover:bg-brand-gray-100'}`} aria-label={isListening ? 'Stop Listening' : 'Start Listening'}>
                {isListening ? <MuteIcon className="w-5 h-5"/> : <MicrophoneIcon className="w-5 h-5"/>}
            </button>
            <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
                <input 
                    className="flex-1 border rounded-md p-2 text-sm w-full" 
                    placeholder="Add a goal for diabetes..." 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                />
                <button type="submit" className="bg-brand-blue text-white px-4 rounded-md hover:bg-blue-600 disabled:opacity-50" disabled={!inputValue.trim()}>Send</button>
            </form>
        </div>
        <ContextBar carePlan={carePlan} />
      </footer>
    </div>
  );
};

const ChatMessage: React.FC<{item: ChatHistoryItem; onInteraction: AICarePlanAssistantPanelProps['onInteraction']}> = ({ item, onInteraction }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableCode, setEditableCode] = useState('');

    useEffect(() => {
        if (item.from === 'ai' && (item.content.type === 'confirmation' || item.content.type === 'success') && item.content.codePreview) {
            setEditableCode(JSON.stringify(item.content.codePreview, null, 2));
        }
    }, [item]);

    if (item.from === 'user') {
        return <div className="text-right"><span className="inline-block bg-blue-500 text-white rounded-lg px-3 py-2 text-sm">{item.content}</span></div>;
    }
    
    const { content } = item;
    const { conversationContext } = content as any;

    const handleApply = () => {
        if (isEditing) {
            try {
                const editedJson = JSON.parse(editableCode);
                onInteraction({ action: 'confirm_edited_action', value: editedJson }, conversationContext)
            } catch (e) {
                alert("Invalid JSON format.");
            }
        } else {
             onInteraction({ action: 'confirm_action' }, conversationContext)
        }
    };
    
    const renderContent = () => {
        switch(content.type) {
            case 'success':
            case 'confirmation':
                const { summary, codePreview } = content;
                const hasPatch = codePreview && (Object.keys(codePreview.create || {}).length > 0 || Object.keys(codePreview.update || {}).length > 0);

                return (
                    <div className="space-y-3">
                        <MarkdownRenderer content={summary} />
                        {hasPatch && (
                            <div className="space-y-2">
                                <h3 className="text-md font-bold text-brand-gray-800 pt-3 flex items-center gap-2">🧠 JSON Patch</h3>
                                <div className="bg-brand-gray-800 text-white rounded-md text-xs">
                                    {isEditing ? (
                                        <textarea 
                                            value={editableCode} 
                                            onChange={e => setEditableCode(e.target.value)}
                                            className="w-full h-48 bg-transparent p-2 font-mono focus:outline-none focus:ring-2 ring-brand-blue"
                                        />
                                    ) : (
                                        <pre className="p-2 overflow-x-auto"><code>{editableCode}</code></pre>
                                    )}
                                </div>
                                {content.type === 'confirmation' && (
                                    <div className="flex justify-end items-center gap-4 text-sm pt-2">
                                        <button onClick={() => onInteraction({action: 'cancel'}, conversationContext)} className="flex items-center gap-1 font-semibold text-red-600 hover:text-red-800">
                                            <XIcon className="w-4 h-4"/> Discard
                                        </button>
                                        <button onClick={() => setIsEditing(!isEditing)} className="flex items-center gap-1 font-semibold text-brand-blue hover:text-blue-800">
                                            <PencilIcon className="w-4 h-4"/> {isEditing ? 'Cancel Edit' : 'Edit'}
                                        </button>
                                        <button onClick={handleApply} className="flex items-center gap-1 font-semibold text-green-600 hover:text-green-800">
                                            <CheckIcon className="w-4 h-4"/> Apply changes
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Acknowledge button for messages without a patch */}
                        {content.type === 'confirmation' && !hasPatch && (
                             <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => onInteraction({ action: 'cancel' }, conversationContext)}
                                    className="px-3 py-1 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600">
                                    Acknowledge
                                </button>
                            </div>
                        )}
                    </div>
                );
            case 'clarification':
                 return (
                    <div className="space-y-2">
                        <p>{content.message}</p>
                        <div className="flex flex-wrap gap-2">
                            {content.options.map(opt => (
                                <button key={opt.text} onClick={() => onInteraction(opt, content.conversationContext)} className="px-3 py-1 bg-white border border-brand-gray-300 rounded-md text-xs font-semibold hover:bg-brand-gray-100">
                                    {opt.text}
                                </button>
                            ))}
                        </div>
                    </div>
                 )
            case 'error':
            case 'cancel':
                return <p className="text-yellow-700">{content.message}</p>;
            default:
                return null;
        }
    }

    return (
        <div className="bg-white rounded-lg px-3 py-2 text-sm shadow-sm border">{renderContent()}</div>
    );
}

const LoadingIndicator: React.FC = () => (
  <div className="flex items-center gap-2">
    <div className="w-6 h-6 rounded-full border-2 border-brand-gray-200 border-t-brand-blue animate-spin"></div>
    <span className="text-sm text-brand-gray-500">AI is thinking...</span>
  </div>
);

const ContextBar: React.FC<{carePlan: CarePlan}> = ({ carePlan }) => {
    const [isContextExpanded, setIsContextExpanded] = useState(false);
    const { primary: diagnoses, allergies, riskFactors } = carePlan.diagnoses;
    const goalCount = carePlan.goals.length;
    const taskCount = carePlan.goals.reduce((acc, goal) => acc + goal.tasks.length, 0);
    
    return (
        <div className="mt-2 pt-2 border-t text-xs text-brand-gray-500">
            <button 
                onClick={() => setIsContextExpanded(!isContextExpanded)}
                className="w-full flex justify-between items-center font-bold text-brand-gray-600 py-1"
                aria-expanded={isContextExpanded}
            >
                <span>Active Context</span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isContextExpanded ? 'rotate-180' : ''}`} />
            </button>
            <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isContextExpanded ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}
            >
                <div className="space-y-2">
                    <div>
                        <p className="font-semibold text-brand-gray-700 mb-1 flex items-center gap-1.5"><ClipboardListIcon className="w-4 h-4"/> Diagnoses:</p>
                        <p className="leading-tight pl-5">{diagnoses.join(', ') || 'No diagnoses'}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-brand-gray-700 mb-1 flex items-center gap-1.5"><ShieldCheckIcon className="w-4 h-4"/> Allergies:</p>
                        <p className="leading-tight pl-5">{allergies.join(', ') || 'None specified'}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-brand-gray-700 mb-1 flex items-center gap-1.5"><ExclamationTriangleIcon className="w-4 h-4"/> Risk Factors:</p>
                        <p className="leading-tight pl-5">{riskFactors.join(', ') || 'None specified'}</p>
                    </div>
    
                    <div className="flex items-center gap-4 pt-2 border-t mt-2">
                         <div className="flex items-center gap-1.5" title="Goals">
                            <TargetIcon className="w-4 h-4"/>
                            <span>{goalCount} Goals</span>
                        </div>
                         <div className="flex items-center gap-1.5" title="Tasks">
                            <LightningBoltIcon className="w-4 h-4"/>
                            <span>{taskCount} Tasks</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}