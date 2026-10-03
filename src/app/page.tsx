import Link from "next/link";
import { HeaderWrapper } from "@/components/layout/HeaderWrapper";
import { PublicFooter } from "@/components/legal/PublicFooter";
import { getPublicLegalSettings } from "@/lib/services/legal.service";
import { ArrowRight, MapPin, Shield, Store } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getPublicLegalSettings();
  return (
    <div className="min-h-screen">
      <HeaderWrapper />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-orange-50 via-white to-green-50 px-6 py-20 lg:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-5xl mb-6 block">🍊🥬🌾</span>
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
            Encuentra la frutería
            <span className="text-[var(--brand)]"> perfecta cerca de ti</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            LaBorregaMarket conecta clientes con fruterías, verdulerías y productores
            agrícolas locales. Compara precios, explora en el mapa y contacta directo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/explorar"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[var(--brand)] text-white rounded-full font-semibold hover:bg-[var(--brand-dark)] transition-colors"
            >
              Explorar fruterías
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/registro?role=provider"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-gray-300 rounded-full font-semibold hover:shadow-md transition-shadow"
            >
              <Store size={18} />
              Registrar mi negocio
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <MapPin className="text-[var(--brand)]" size={28} />,
              title: "Mapa interactivo",
              desc: "Visualiza fruterías cercanas y los precios que publica cada una",
            },
            {
              icon: <Store className="text-[var(--brand)]" size={28} />,
              title: "Catálogo unificado",
              desc: "Un solo catálogo de frutas, verduras y productos agrícolas. Cada negocio activa los suyos.",
            },
            {
              icon: <Shield className="text-[var(--brand)]" size={28} />,
              title: "Información clara",
              desc: "Cada frutería publica sus datos, precios y horarios; tus datos se tratan según nuestro Aviso de Privacidad.",
            },
          ].map((f) => (
            <div key={f.title} className="text-center p-6">
              <div className="flex justify-center mb-4">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <PublicFooter settings={settings} />
    </div>
  );
}
