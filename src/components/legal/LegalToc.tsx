"use client";

import { useEffect, useState } from "react";
import type { LegalHeading } from "@/lib/legal/markdown";

export function LegalToc({ headings }: { headings: LegalHeading[] }) {
  const [active, setActive] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    if (headings.length === 0) return;
    const nodes = headings
      .map((h) => document.getElementById(h.id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: [0.1, 0.5] }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  const links = (
    <ul className="space-y-2">
      {headings.map((heading) => (
        <li key={heading.id}>
          <a
            href={`#${heading.id}`}
            className={`text-sm underline-offset-2 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
              active === heading.id ? "font-medium text-slate-900" : "text-slate-600"
            }`}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <details className="no-print mb-6 rounded-lg border border-slate-200 bg-white px-4 py-2 lg:hidden">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-slate-900">
          Contenido
        </summary>
        <div className="pb-3">{links}</div>
      </details>
      <aside className="no-print sticky top-24 hidden w-64 self-start lg:block">{links}</aside>
    </>
  );
}
