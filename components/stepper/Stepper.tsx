import React from 'react';
import { CheckIcon } from '../icons/CheckIcon';

interface StepperProps {
  steps: { id: number; label: string }[];
  activeStep: number;
  goToStep: (step: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({ steps, activeStep, goToStep }) => {
  return (
    <nav aria-label="Progress" className="pb-4">
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIdx) => {
          const isCompleted = step.id < activeStep;
          const isActive = step.id === activeStep;

          let statusStyles = {
            circle: 'border-brand-gray-300 bg-white',
            text: 'text-brand-gray-500',
            icon: 'text-brand-gray-500',
          };

          if (isCompleted) {
            statusStyles = {
              circle: 'bg-brand-blue border-brand-blue',
              text: 'text-brand-gray-900',
              icon: 'text-white',
            };
          } else if (isActive) {
            statusStyles = {
              circle: 'border-brand-blue border-2 bg-white',
              text: 'text-brand-blue font-bold',
              icon: 'text-brand-blue',
            };
          }

          return (
            <React.Fragment key={step.id}>
              <li className="relative flex items-center">
                <button
                  onClick={() => goToStep(step.id)}
                  className="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-brand-gray-100"
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span
                    className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 ${statusStyles.circle}`}
                  >
                    {isCompleted ? (
                      <CheckIcon className={`w-5 h-5 ${statusStyles.icon}`} />
                    ) : (
                      <span className={`font-semibold text-sm ${statusStyles.icon}`}>
                        {step.id}
                      </span>
                    )}
                  </span>
                  <span className={`text-sm font-medium hidden md:block ${statusStyles.text}`}>
                    {step.label}
                  </span>
                </button>
              </li>

              {stepIdx < steps.length - 1 && (
                <li className="flex-auto">
                  <div
                    className={`h-0.5 transition-colors duration-500 ${isCompleted ? 'bg-brand-blue' : 'bg-brand-gray-200'}`}
                  />
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};
