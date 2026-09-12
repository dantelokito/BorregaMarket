"use client";

import { useEffect, useState } from "react";

const FRAMES = [
  "/brand/loader-borrega/B1.png",
  "/brand/loader-borrega/B2.png",
  "/brand/loader-borrega/B3.png",
] as const;

/** `loading` 64px (refetch) vs `empty` 80px (total=0) — design tokens v0.7.1 §6f. */
const SIZES = { sm: 64, loading: 64, empty: 80, md: 96 } as const;

export function BrandLoader({
  size = "sm",
  label = "Buscando fruterías",
}: {
  size?: keyof typeof SIZES;
  label?: string;
}) {
  const px = SIZES[size];
  const [frame, setFrame] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setFrame(0);
      return;
    }
    const id = window.setInterval(() => {
      setFrame((prev) => (prev + 1) % FRAMES.length);
    }, 500);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  return (
    <div className="flex flex-col items-center justify-center py-8" role="status">
      <img
        src={FRAMES[frame]}
        alt=""
        width={px}
        height={px}
        className="object-contain"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
