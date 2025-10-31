
import React, { useState, useRef, useEffect } from 'react';
import { getChatbotResponse } from '../../services/geminiService';
import { AiSparkleIcon } from '../icons/AiSparkleIcon';
import { XIcon } from '../icons/XIcon';
import { PaperAirplaneIcon } from '../icons/PaperAirplaneIcon';
import { UserIcon } from '../icons/UserIcon';
import { BrainIcon } from '../icons/BrainIcon';

interface Message {
    sender: 'user' | 'ai';
    text: string;
}

export const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([{
        sender: 'ai',
        text: 'Hello! How can I help you today?'
    }]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const userMessage = inputValue.trim();
        if (!userMessage || isLoading) return;

        setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
        setInputValue('');
        setIsLoading(true);

        const aiResponse = await getChatbotResponse(userMessage);

        setMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
        setIsLoading(false);
    };
    
    if (!isOpen) {
        return (
          <button 
            onClick={() => setIsOpen(true)} 
            className="fixed bottom-8 right-8 bg-brand-blue text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition-transform transform hover:scale-110 animate-scale-in" 
            aria-label="Open AI Chat"
          >
            <AiSparkleIcon className="w-8 h-8" />
          </button>
        );
    }
    
    return (
        <div className="fixed bottom-8 right-8 w-full max-w-sm bg-white rounded-lg shadow-2xl border border-brand-gray-200 flex flex-col z-50 animate-scale-in" style={{height: '600px'}}>
          <header className="p-4 border-b border-brand-gray-200 flex justify-between items-center bg-brand-gray-50 rounded-t-lg flex-shrink-0">
            <div className="flex items-center gap-2">
                <AiSparkleIcon className="w-6 h-6 text-brand-blue" />
                <h3 className="font-semibold text-brand-gray-800">AI Chat</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-brand-gray-400 hover:text-brand-gray-600"><XIcon className="w-5 h-5" /></button>
          </header>
          <main className="p-4 flex-grow overflow-y-auto space-y-4">
            {messages.map((msg, index) => (
                <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                    {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-brand-gray-200 flex items-center justify-center flex-shrink-0"><BrainIcon className="w-5 h-5 text-brand-gray-600"/></div>}
                    <div className={`px-4 py-2 rounded-lg text-sm max-w-[80%] break-words ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-brand-gray-100 text-brand-gray-800'}`}>
                        {msg.text}
                    </div>
                     {msg.sender === 'user' && <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0"><UserIcon className="w-5 h-5 text-blue-600"/></div>}
                </div>
            ))}
            {isLoading && (
                 <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-gray-200 flex items-center justify-center flex-shrink-0"><BrainIcon className="w-5 h-5 text-brand-gray-600"/></div>
                    <div className="px-4 py-2 rounded-lg text-sm bg-brand-gray-100 text-brand-gray-800 flex items-center">
                        <div className="w-2 h-2 bg-brand-gray-500 rounded-full animate-bounce [animation-delay:-0.3s] mr-1"></div>
                        <div className="w-2 h-2 bg-brand-gray-500 rounded-full animate-bounce [animation-delay:-0.15s] mr-1"></div>
                        <div className="w-2 h-2 bg-brand-gray-500 rounded-full animate-bounce"></div>
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
          </main>
          <footer className="p-4 border-t border-brand-gray-200 flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input 
                    type="text" 
                    value={inputValue} 
                    onChange={(e) => setInputValue(e.target.value)} 
                    placeholder="Ask anything..." 
                    className="w-full h-10 px-3 py-2 bg-white border border-brand-gray-300 rounded-md focus:ring-1 focus:ring-brand-blue focus:border-brand-blue text-sm disabled:bg-brand-gray-100" 
                    disabled={isLoading}
                />
                <button 
                    type="submit" 
                    className="p-2 bg-brand-blue text-white rounded-md hover:bg-blue-600 disabled:bg-brand-gray-300" 
                    disabled={isLoading || !inputValue.trim()} 
                    aria-label="Send message"
                >
                    <PaperAirplaneIcon className="w-5 h-5"/>
                </button>
            </form>
          </footer>
        </div>
    );
}
