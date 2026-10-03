export default function LegalDocumentLoading() {
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
