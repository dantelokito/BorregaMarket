"use client";

export interface ReportFilterOption {
  id: string;
  name: string;
}

export function ProductFilterChecklist({
  options,
  selected,
  onChange,
}: {
  options: ReportFilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Productos del corte</legend>
      <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
        {options.map((option) => (
          <li key={option.id}>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selected.includes(option.id)}
                onChange={() => toggle(option.id)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">{option.name}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-slate-500">Ninguno marcado = todos</p>
    </fieldset>
  );
}
