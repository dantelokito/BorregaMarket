import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { HeaderWrapper } from "@/components/layout/HeaderWrapper";
import { PublicFooter } from "@/components/legal/PublicFooter";
import { LegalToc } from "@/components/legal/LegalToc";
import { MeasurementPreferencesInline } from "@/components/legal/MeasurementPreferences";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatLegalDate } from "@/lib/legal/format";
import { LegalArticle, parseLegalMarkdown } from "@/lib/legal/markdown";
import { getCurrentDocument } from "@/lib/services/legal.service";
import { legalTypeFromSlug, type LegalSlug } from "@/lib/validators/legal";

export const dynamic = "force-dynamic";

const TITLES: Record<LegalSlug, string> = {
  privacidad: "Aviso de Privacidad",
  terminos: "Términos y Condiciones",
  cookies: "Política de Cookies",
};

const ALL: { slug: LegalSlug; href: string; label: string }[] = [
  { slug: "privacidad", href: "/legal/privacidad", label: "Aviso de Privacidad" },
  { slug: "terminos", href: "/legal/terminos", label: "Términos y Condiciones" },
  { slug: "cookies", href: "/legal/cookies", label: "Política de Cookies" },
];

function LegalDocumentLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6" aria-busy="true" aria-label="Cargando documento">
      <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-slate-200" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-4 animate-pulse rounded bg-slate-200" />
        ))}
      </div>
    </div>
  );
}

export default async function LegalDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(slug in TITLES)) notFound();
  const legalSlug = slug as LegalSlug;
  const type = legalTypeFromSlug(legalSlug);
  if (!type) notFound();

  return (
    <Suspense fallback={<LegalDocumentLoading />}>
      <LegalDocumentBody legalSlug={legalSlug} />
    </Suspense>
  );
}

async function LegalDocumentBody({ legalSlug }: { legalSlug: LegalSlug }) {
  const type = legalTypeFromSlug(legalSlug);
  if (!type) notFound();

  const { document, settings } = await getCurrentDocument(type);
  const dbError = document === null && settings === null;
  const headings = document ? parseLegalMarkdown(document.content).headings : [];

  return (
    <div className="min-h-screen bg-white">
      <HeaderWrapper />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {!document ? (
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{TITLES[legalSlug]}</h1>
            <div className="mt-8">
              <EmptyState
                icon={<FileText size={40} aria-hidden />}
                title="Documento en actualización"
                description={
                  dbError
                    ? "Estamos preparando este documento. Intenta de nuevo en unos minutos."
                    : "Estamos preparando este documento."
                }
              />
              {settings?.arcoEmail ? (
                <p className="mt-4 text-center text-sm text-slate-600">
                  Para dudas sobre tus datos escribe a {settings.arcoEmail}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:gap-12">
            <LegalToc headings={headings} />
            <div id="legal-print">
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{TITLES[legalSlug]}</h1>
              <p className="mt-2 text-sm text-slate-600">
                Versión {document.version} · Vigente desde {formatLegalDate(document.effectiveAt)}
              </p>
              <div className="mt-8">
                <LegalArticle content={document.content} />
              </div>
              {legalSlug === "cookies" ? <MeasurementPreferencesInline /> : null}
            </div>
          </div>
        )}

        <nav className="no-print mt-10 flex flex-col gap-2" aria-label="Otros documentos legales">
          {ALL.filter((item) => item.slug !== legalSlug).map((item) => (
            <Link
              key={item.slug}
              href={item.href}
              className="min-h-11 text-sm text-slate-700 underline underline-offset-2 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/"
            className="min-h-11 text-sm text-slate-700 underline underline-offset-2 hover:text-slate-900"
          >
            Volver al inicio
          </Link>
        </nav>
      </main>
      <PublicFooter settings={settings} />
    </div>
  );
}
