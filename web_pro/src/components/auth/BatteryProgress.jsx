import React from 'react';
import { User, Car, Lock, Check } from 'lucide-react';

export const BatteryProgress = ({ currentStep = 1, totalSteps = 3, onStepClick }) => {
  const steps = [
    { number: 1, label: 'Driver Details', icon: User },
    { number: 2, label: 'Vehicle Specs', icon: Car },
    { number: 3, label: 'Security Pass', icon: Lock },
  ];

  return (
    <div className="w-full mb-5">
      <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wider font-bold">
            Step Progress
          </span>
          <span className="text-xs font-mono font-bold text-brand-red">
            Step {currentStep} of {totalSteps}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {steps.map((step) => {
            const isCompleted = step.number < currentStep;
            const isCurrent = step.number === currentStep;
            const Icon = step.icon;

            return (
              <button
                key={step.number}
                type="button"
                onClick={() => isCompleted && onStepClick && onStepClick(step.number)}
                disabled={!isCompleted}
                className={`py-2 px-2.5 rounded-md border text-left transition-all flex items-center space-x-2 ${
                  isCurrent
                    ? 'bg-white border-brand-red shadow-sm'
                    : isCompleted
                    ? 'bg-white border-gray-200 hover:border-gray-300 cursor-pointer'
                    : 'bg-gray-100/60 border-transparent opacity-60 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0 ${
                    isCurrent
                      ? 'bg-brand-red text-white'
                      : isCompleted
                      ? 'bg-red-50 text-brand-red border border-red-200'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3" /> : step.number}
                </div>

                <div className="min-w-0 flex-1 hidden sm:block">
                  <p
                    className={`text-[11px] font-semibold truncate ${
                      isCurrent ? 'text-brand-red font-bold' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
