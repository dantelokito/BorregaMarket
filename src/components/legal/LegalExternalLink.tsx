import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

export function LegalExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-1 text-slate-700 underline underline-offset-2 hover:text-slate-900 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
    >
      {children}
      <ExternalLink size={14} aria-hidden />
      <span className="sr-only">(abre en otra pestaña)</span>
    </a>
  );
}
