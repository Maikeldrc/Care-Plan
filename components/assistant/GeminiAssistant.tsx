import React, { useState, useEffect } from 'react';
import { PaperAirplaneIcon } from '../icons/PaperAirplaneIcon';
import { AiSparkleIcon } from '../icons/AiSparkleIcon';
import { XIcon } from '../icons/XIcon';
import type { AiOrchestratorResponse, AiClarificationOption } from '../../types';

interface GeminiAssistantProps {
  onSendCommand: (command: string) => void;
  isLoading: boolean;
  interactionState: AiOrchestratorResponse;
  onInteraction: (payload: { action: string; value?: any }, context: any) => void;
}

const inputStyles = "w-full h-10 px-3 py-2 bg-white border border-brand-gray-300 rounded-md focus:ring-1 focus:ring-brand-blue focus:border-brand-blue text-sm disabled:bg-brand-gray-100";

export const GeminiAssistant: React.FC<GeminiAssistantProps> = ({ onSendCommand, isLoading, interactionState, onInteraction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [displayMessage, setDisplayMessage] = useState('');

  useEffect(() => {
    if (interactionState.type === 'success' || interactionState.type === 'cancel' || interactionState.type === 'error') {
      const message = interactionState.type === 'success' 
        ? '✅ Care Plan successfully updated.' 
        : (interactionState.message || 'An unexpected error occurred.');
      setDisplayMessage(message);
      const timer = setTimeout(() => setDisplayMessage(''), 5000); // Display message for 5 seconds
      return () => clearTimeout(timer);
    }
  }, [interactionState]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim() && !isLoading) {
      onSendCommand(command);
      setCommand('');
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
            <p className="ml-3 text-sm text-brand-gray-600">Gemini is working...</p>
        </div>
      );
    }

    if (displayMessage) {
        const isSuccess = interactionState.type === 'success';
        const bgColor = isSuccess ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200';
        return (
             <div className={`text-sm text-brand-gray-800 p-3 rounded-md border ${bgColor}`}>
                {displayMessage}
             </div>
        );
    }

    switch (interactionState.type) {
        case 'clarification':
            return (
                <div className="space-y-3">
                    <p className="text-sm text-brand-gray-700">{interactionState.message}</p>
                    <div className="flex flex-wrap gap-2">
                        {interactionState.options.map((opt: AiClarificationOption) => (
                            <button key={opt.text} onClick={() => onInteraction(opt, interactionState.conversationContext)}
                                className="px-3 py-1.5 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-100">
                                {opt.text}
                            </button>
                        ))}
                    </div>
                </div>
            );
        case 'confirmation':
            return (
                <div className="space-y-3">
                    <p className="text-sm font-semibold text-brand-gray-800">Proposed Action Summary</p>
                    <div className="text-sm text-brand-gray-700 bg-blue-50 border border-blue-200 p-3 rounded-md whitespace-pre-wrap">
                        {interactionState.summary}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                         <button onClick={() => onInteraction({ action: 'cancel' }, interactionState.conversationContext)}
                            className="px-3 py-1 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">
                            Cancel
                        </button>
                        <button onClick={() => onInteraction({ action: 'confirm_action' }, interactionState.conversationContext)}
                            className="px-3 py-1 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600">
                            Confirm
                        </button>
                    </div>
                </div>
            );
        default: // idle, error, cancel, success (after timeout)
            return (
                <>
                    <p className="text-sm text-brand-gray-600">Use natural language to modify the care plan. Try:</p>
                    <p className="mt-2 text-sm text-brand-gray-800 bg-brand-gray-100 p-2 rounded-md">
                        “Add a goal for hypertension.”
                    </p>
                    <p className="mt-2 text-sm text-brand-gray-800 bg-brand-gray-100 p-2 rounded-md">
                        “Add a task for a follow-up call.”
                    </p>
                </>
            );
    }
  };

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="fixed bottom-8 right-8 bg-brand-blue text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition-transform transform hover:scale-110" aria-label="Open Gemini Assistant">
        <AiSparkleIcon className="w-8 h-8" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-8 right-8 w-full max-w-sm bg-white rounded-lg shadow-2xl border border-brand-gray-200 flex flex-col z-50">
      <header className="p-4 border-b border-brand-gray-200 flex justify-between items-center bg-brand-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
            <AiSparkleIcon className="w-6 h-6 text-brand-blue" />
            <h3 className="font-semibold text-brand-gray-800">Gemini Assistant</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-brand-gray-400 hover:text-brand-gray-600"><XIcon className="w-5 h-5" /></button>
      </header>
      <main className="p-4 flex-grow min-h-[160px]">
        {renderContent()}
      </main>
      <footer className="p-4 border-t border-brand-gray-200">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input type="text" value={command} onChange={(e) => setCommand(e.target.value)} placeholder="Type your command..." className={inputStyles} disabled={isLoading}/>
            <button type="submit" className="p-2 bg-brand-blue text-white rounded-md hover:bg-blue-600 disabled:bg-brand-gray-300" disabled={isLoading || !command.trim()} aria-label="Send command">
                <PaperAirplaneIcon className="w-5 h-5"/>
            </button>
        </form>
      </footer>
    </div>
  );
};