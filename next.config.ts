import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: false,
  reloadOnOnline: false,
  globPublicPatterns: ["brand/**"],
  disable: process.env.NODE_ENV !== "production",
});

function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function reportOnlyCsp(): string {
  const umami = originOf(process.env.NEXT_PUBLIC_UMAMI_SRC);
  const tile = originOf(process.env.NEXT_PUBLIC_OSM_TILE_URL);
  const script = ["'self'", "'unsafe-inline'", "'unsafe-eval'", umami].filter(Boolean);
  const connect = [
    "'self'",
    umami,
    "https://tile.openstreetmap.org",
    "https://nominatim.openstreetmap.org",
    "https://res.cloudinary.com",
    "https://images.unsplash.com",
    tile,
  ].filter(Boolean);
  const img = [
    "'self'",
    "data:",
    "blob:",
    "https://tile.openstreetmap.org",
    "https://*.tile.openstreetmap.org",
    "https://res.cloudinary.com",
    "https://*.cloudinary.com",
    "https://images.unsplash.com",
    tile,
  ].filter(Boolean);
  return [
    "default-src 'self'",
    `script-src ${script.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${img.join(" ")}`,
    `connect-src ${connect.join(" ")}`,
    "font-src 'self' data:",
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  { key: "Content-Security-Policy-Report-Only", value: reportOnlyCsp() },
];

if (process.env.NODE_ENV === "production") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost"],
  serverExternalPackages: ["pdfkit"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.cloudinary.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
