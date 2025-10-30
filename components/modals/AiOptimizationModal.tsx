import React, { useState, useEffect } from 'react';
import type { CarePlan, AiOptimizationSuggestion } from '../../types';
import { getAiOptimizationSuggestions } from '../../services/geminiService';
import { XIcon } from '../icons/XIcon';
import { AiSparkleIcon } from '../icons/AiSparkleIcon';
import { CheckIcon } from '../icons/CheckIcon';

interface AiOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  carePlan: CarePlan;
  onApply: (optimizedPlan: CarePlan) => void;
}

const categoryIcons: { [key in AiOptimizationSuggestion['category']]: string } = {
    'Goal Improvements': '🎯',
    'Task Optimization': '⚙️',
    'Barrier Alerts': '⚠️',
    'Quality Measure Alignment': '📈',
    'General': '💡',
};

export const AiOptimizationModal: React.FC<AiOptimizationModalProps> = ({ isOpen, onClose, carePlan, onApply }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<AiOptimizationSuggestion[]>([]);
  const [optimizedPlan, setOptimizedPlan] = useState<CarePlan | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getAiOptimizationSuggestions(carePlan).then(({ suggestions, modifiedPlan }) => {
        setSuggestions(suggestions);
        setOptimizedPlan(modifiedPlan);
        setIsLoading(false);
      });
    }
  }, [isOpen, carePlan]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (optimizedPlan) {
      onApply(optimizedPlan);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AiSparkleIcon className="w-6 h-6 text-brand-blue" />
            AI Optimization Insights
          </h2>
          <button onClick={onClose}><XIcon className="w-6 h-6 text-brand-gray-400" /></button>
        </div>
        <div className="p-6 flex-grow overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
              <p className="mt-4 text-brand-gray-600">Gemini is analyzing the care plan...</p>
              <p className="text-sm text-brand-gray-500">This may take a moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-brand-gray-600">Gemini has analyzed the plan and provided the following suggestions for improvement:</p>
              {suggestions.map((s, i) => (
                <div key={i} className="p-4 bg-brand-gray-50 border border-brand-gray-200 rounded-lg">
                    <h4 className="font-semibold text-brand-gray-800 flex items-center gap-2">
                        <span>{categoryIcons[s.category]}</span>
                        {s.category}
                    </h4>
                    <p className="mt-2 text-brand-gray-700">{s.text}</p>
                    <p className="mt-1 text-xs text-brand-blue italic"><strong>Rationale:</strong> {s.rationale}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 bg-brand-gray-50 border-t flex justify-end items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">
                Discard Suggestions
            </button>
            <button onClick={handleApply} disabled={isLoading || !optimizedPlan} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600 disabled:opacity-50">
                <CheckIcon className="w-5 h-5" />
                Apply All Suggestions
            </button>
        </div>
      </div>
    </div>
  );
};