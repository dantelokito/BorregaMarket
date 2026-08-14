import { Suspense } from "react";
import { OrdenesPageClient } from "./OrdenesPageClient";

export default function OrdenesPage() {
  return (
    <Suspense fallback={<div className="px-6 py-8">Cargando órdenes…</div>}>
      <OrdenesPageClient />
    </Suspense>
  );
}
