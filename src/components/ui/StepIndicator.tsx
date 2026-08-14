interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

export function StepIndicator({ currentStep, totalSteps, labels }: StepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const step = i + 1;
          const active = step === currentStep;
          const done = step < currentStep;
          return (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  active
                    ? "bg-[var(--brand)] text-white"
                    : done
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {done ? "✓" : step}
              </div>
              {labels?.[i] && (
                <span className={`text-sm ${active ? "font-medium" : "text-gray-500"}`}>
                  {labels[i]}
                </span>
              )}
              {i < totalSteps - 1 && <div className="h-px w-8 bg-gray-300" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
