"use client";

import { shouldShowDemoAccounts } from "@/lib/auth/demo-accounts";

const ACCOUNTS = [
  { email: "admin@laborregamarket.mx", role: "Administrador" },
  { email: "frutas@elparaiso.mx", role: "Proveedor · 2 fruterías" },
  { email: "verduras@campoverde.mx", role: "Proveedor · 1 frutería" },
  { email: "cliente@demo.mx", role: "Cliente" },
] as const;

export function DemoAccountsBlock({
  onPick,
}: {
  onPick: (email: string, password: string) => void;
}) {
  if (!shouldShowDemoAccounts()) return null;

  return (
    <div className="mt-6 border-t border-gray-200 pt-6 text-sm text-gray-500">
      <p className="mb-2 font-medium">Cuentas demo (localhost)</p>
      <p className="mb-2 text-xs">Password de todas: Demo1234!</p>
      <ul className="space-y-1 text-xs">
        {ACCOUNTS.map((account) => (
          <li key={account.email}>
            <button
              type="button"
              onClick={() => onPick(account.email, "Demo1234!")}
              className="min-h-11 text-left text-[var(--brand)] hover:underline"
            >
              {account.email}
            </button>{" "}
            {account.role}
          </li>
        ))}
      </ul>
    </div>
  );
}
