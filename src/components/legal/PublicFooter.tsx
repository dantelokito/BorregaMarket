import Link from "next/link";
import { Info } from "lucide-react";
import type { PublicLegalSettings } from "@/lib/api/legal";
import { monterreyYear } from "@/lib/legal/format";
import { PreferencesLink } from "./PreferencesLink";

const linkClass =
  "inline-flex min-h-11 items-center text-sm text-slate-700 underline underline-offset-2 hover:text-slate-900 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2";

export function PublicFooter({ settings }: { settings: PublicLegalSettings | null }) {
  const complete = Boolean(settings?.isComplete && settings.legalName && settings.address);
  const year = monterreyYear();

  return (
    <footer className="no-print mt-12 border-t border-gray-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_auto] lg:items-start lg:gap-12">
          <nav aria-label="Legal" className="flex flex-col gap-1 lg:flex-row lg:flex-wrap lg:gap-x-6">
            <Link className={linkClass} href="/legal/privacidad">
              Aviso de Privacidad
            </Link>
            <Link className={linkClass} href="/legal/terminos">
              Términos y Condiciones
            </Link>
            <Link className={linkClass} href="/legal/cookies">
              Política de Cookies
            </Link>
            <PreferencesLink className={linkClass} />
          </nav>
          {complete && settings ? (
            <address className="not-italic text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Responsable de tus datos</p>
              <p>{settings.legalName}</p>
              <p>{settings.address}</p>
              {settings.arcoEmail ? (
                <p>
                  Derechos ARCO:{" "}
                  <a className="underline underline-offset-2" href={`mailto:${settings.arcoEmail}`}>
                    {settings.arcoEmail}
                  </a>
                </p>
              ) : null}
              {settings.phone ? (
                <p>
                  Teléfono:{" "}
                  <a className="underline underline-offset-2" href={`tel:${settings.phone}`}>
                    {settings.phone}
                  </a>
                </p>
              ) : null}
            </address>
          ) : (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Info size={16} aria-hidden />
              Datos del responsable en actualización
            </p>
          )}
        </div>
        <p className="mt-6 text-xs text-slate-600">
          © {year} LaBorregaMarket. Intermediario entre clientes y fruterías; cada frutería responde
          por sus productos.
        </p>
      </div>
    </footer>
  );
}
