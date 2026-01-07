'use client';

import { ReactNode } from 'react';

type Step = {
  id: string;
  title: string;
  content: ReactNode;
};

type LoginStepperProps = {
  steps: Step[];
  currentStep: number;
  onNext?: () => void;
  onBack?: () => void;
};

export default function LoginStepper({ steps, currentStep, onNext, onBack }: LoginStepperProps) {
  const current = steps[currentStep];

  return (
    <div className="w-full">
      {/* Step indicator */}
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mx-1 ${
              index === currentStep
                ? 'bg-gold-500 text-navy-900 border-2 border-gold-400'
                : index < currentStep
                  ? 'bg-emerald-500 text-white border-2 border-emerald-400'
                  : 'bg-navy-700 text-slate-400 border-2 border-navy-600'
            }`}>
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-12 h-0.5 mx-1 ${
                index < currentStep ? 'bg-emerald-500' : 'bg-navy-600'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step title */}
      <h3 className="text-xl font-semibold text-white mb-6 text-center">
        {current.title}
      </h3>

      {/* Step content */}
      <div className="space-y-4">
        {current.content}
      </div>

      {/* Navigation buttons */}
      {currentStep > 0 && onBack && (
        <div className="mt-6">
          <button
            type="button"
            onClick={onBack}
            className="w-full flex justify-center py-3 px-4 border border-gold-500/60 text-sm font-semibold rounded-xl text-gold-200 bg-navy-900/70 hover:bg-gold-500/10 hover:border-gold-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50 transition-all duration-200"
          >
            Înapoi
          </button>
        </div>
      )}
    </div>
  );
}