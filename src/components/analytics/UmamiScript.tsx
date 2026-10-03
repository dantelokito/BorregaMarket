"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { MEASUREMENT_EVENT, measurementAllowsScript } from "@/lib/analytics/measurement";

export function UmamiScript() {
  const [enabled, setEnabled] = useState(false);
  const src = process.env.NEXT_PUBLIC_UMAMI_SRC;
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const domains = process.env.NEXT_PUBLIC_UMAMI_DOMAINS;

  useEffect(() => {
    const sync = () => setEnabled(Boolean(src && websiteId && measurementAllowsScript()));
    sync();
    window.addEventListener(MEASUREMENT_EVENT, sync);
    return () => window.removeEventListener(MEASUREMENT_EVENT, sync);
  }, [src, websiteId]);

  if (!enabled || !src || !websiteId) return null;

  return (
    <Script
      id="umami-script"
      src={src}
      strategy="afterInteractive"
      data-website-id={websiteId}
      data-do-not-track="true"
      data-exclude-search="true"
      data-exclude-hash="true"
      {...(domains ? { "data-domains": domains } : {})}
    />
  );
}
