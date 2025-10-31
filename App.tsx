
import React, { useState, useCallback } from 'react';
import { Stepper } from './components/stepper/Stepper';
import { InformationStep } from './components/steps/InformationStep';
import { GoalsTasksStep } from './components/steps/GoalsTasksStep';
import { BarriersStep } from './components/steps/BarriersStep';
import { InstructionsStep } from './components/steps/InstructionsStep';
import { EducationStep } from './components/steps/EducationStep';
import { SummaryStep } from './components/steps/SummaryStep';
import { AICarePlanAssistantPanel } from './components/assistant/AICarePlanAssistantPanel';
import { Chatbot } from './components/chatbot/Chatbot';
import type { CarePlan, AiOrchestratorResponse } from './types';
import { initialCarePlan } from './data/mockData';
import { updateCarePlanWithAI, generateCarePlanWithAI } from './services/geminiService';

const App: React.FC = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [carePlan, setCarePlan] = useState<CarePlan>(initialCarePlan);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [highlightedItems, setHighlightedItems] = useState<Set<string>>(new Set());
  const [aiInteractionState, setAiInteractionState] = useState<AiOrchestratorResponse>({ type: 'idle' });
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);


  const steps = [
    { id: 1, label: 'Information' },
    { id: 2, label: 'Goals & Tasks' },
    { id: 3, label: 'Barriers' },
    { id: 4, label: 'Instructions' },
    { id: 5, label: 'Education' },
    { id: 6, label: 'Summary' },
  ];

  const handleNext = () => setActiveStep((prev) => Math.min(prev + 1, steps.length));
  const handleBack = () => setActiveStep((prev) => Math.max(prev - 1, 1));
  const goToStep = (step: number) => setActiveStep(step);

  const processAiCommand = useCallback(async (command: string) => {
    setIsAiLoading(true);
    setAiInteractionState({ type: 'idle' }); // Clear previous state
    const response = await updateCarePlanWithAI({ command, currentPlan: carePlan });
    setAiInteractionState(response);
    setIsAiLoading(false);
  }, [carePlan]);

  const handleAiInteraction = useCallback(async (payload: any, context: any) => {
    setIsAiLoading(true);
    setAiInteractionState({ type: 'idle' }); // Clear previous state
    const response = await updateCarePlanWithAI({ currentPlan: carePlan, interaction: payload, context });
    
    if (response.type === 'success') {
      setCarePlan(response.updatedPlan);
      
      if (response.highlights.size > 0) {
        setHighlightedItems(response.highlights);
        const hasGoalOrTaskHighlight = Array.from(response.highlights).some(id => id.startsWith('goal') || id.startsWith('task'));
        if (hasGoalOrTaskHighlight && activeStep !== 2) goToStep(2);
        
        setTimeout(() => setHighlightedItems(new Set()), 2500); // highlight animation duration
      }
    }
    
    setAiInteractionState(response);
    setIsAiLoading(false);
  }, [carePlan, activeStep]);


  const handleGeneratePlan = useCallback(async () => {
    setIsGenerating(true);
    try {
      const patientInfo = { primaryDiagnoses: carePlan.diagnoses.primary };
      const newPlan = await generateCarePlanWithAI(patientInfo);
      setCarePlan(newPlan);
      handleNext();
    } catch (error)      {
      console.error("Error generating care plan with AI:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [carePlan.diagnoses]);

  const renderStepContent = () => {
    switch (activeStep) {
      case 1:
        return <InformationStep carePlan={carePlan} setCarePlan={setCarePlan} onGeneratePlan={handleGeneratePlan} isGenerating={isGenerating} onManualBuild={handleNext} />;
      case 2:
        return <GoalsTasksStep carePlan={carePlan} setCarePlan={setCarePlan} highlightedItems={highlightedItems} />;
      case 3:
        return <BarriersStep carePlan={carePlan} setCarePlan={setCarePlan} />;
      case 4:
        return <InstructionsStep carePlan={carePlan} setCarePlan={setCarePlan} />;
      case 5:
        return <EducationStep carePlan={carePlan} setCarePlan={setCarePlan} />;
      case 6:
        return <SummaryStep carePlan={carePlan} setCarePlan={setCarePlan} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-brand-gray-50 min-h-screen font-sans text-brand-gray-800">
       <AICarePlanAssistantPanel
        carePlan={carePlan}
        isCollapsed={isPanelCollapsed}
        onToggleCollapse={() => setIsPanelCollapsed(prev => !prev)}
        onSendCommand={processAiCommand}
        isLoading={isAiLoading}
        interactionState={aiInteractionState}
        onInteraction={handleAiInteraction}
      />
      <main className={`transition-all duration-300 ${isPanelCollapsed ? 'pl-20' : 'pl-[400px]'}`}>
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-brand-gray-900">AI Care Plan Creator</h1>
            <p className="text-brand-gray-500 mt-1">Design smarter, personalized care plans with intelligent assistance.</p>
          </header>

          <div>
            <Stepper steps={steps} activeStep={activeStep} goToStep={goToStep} />
            <div className="mt-8 bg-white p-6 md:p-8 rounded-lg shadow-sm border border-brand-gray-200">
              {renderStepContent()}
            </div>
            <div className="mt-8 flex justify-between">
              <button onClick={handleBack} disabled={activeStep === 1} className="px-6 py-2 bg-white border border-brand-gray-300 rounded-md text-brand-gray-700 font-semibold hover:bg-brand-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                Back
              </button>
              <button onClick={handleNext} disabled={activeStep === steps.length} className="px-6 py-2 bg-brand-blue text-white rounded-md font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
                {activeStep === steps.length ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </main>
      <Chatbot />
    </div>
  );
};

export default App;
