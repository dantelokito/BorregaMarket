"use client";

interface NumericKeypadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onDecimal: () => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"] as const;

export function NumericKeypad({ onDigit, onBackspace, onDecimal }: NumericKeypadProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => {
            if (key === "⌫") onBackspace();
            else if (key === ".") onDecimal();
            else onDigit(key);
          }}
          className="flex h-14 min-w-16 items-center justify-center rounded-lg border border-gray-300 bg-white text-lg font-semibold tabular-nums hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        >
          {key}
        </button>
      ))}
    </div>
  );
}
