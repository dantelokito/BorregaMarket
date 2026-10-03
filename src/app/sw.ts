/// <reference lib="webworker" />
import { CacheableResponsePlugin, CacheFirst, ExpirationPlugin, Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const MEDIA_CACHE = "lbm-media-v1";
const PRECACHE_PREFIX = "serwist-precache";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  precacheOptions: {
    cleanupOutdatedCaches: true,
  },
  runtimeCaching: [
    {
      matcher({ url, request }) {
        return request.method === "GET" && url.pathname.startsWith("/api/media/");
      },
      handler: new CacheFirst({
        cacheName: MEDIA_CACHE,
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({
            maxEntries: 300,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          }),
        ],
      }),
    },
  ],
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key === MEDIA_CACHE || key.startsWith(PRECACHE_PREFIX)) return undefined;
          return caches.delete(key);
        })
      )
    )
  );
});

serwist.addEventListeners();
