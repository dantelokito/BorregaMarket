import type { ProviderDetail } from "@/lib/api/types";

const cache = new Map<string, ProviderDetail>();
let inflight: { id: string; controller: AbortController } | null = null;

export function getCachedProviderPreview(id: string): ProviderDetail | undefined {
  return cache.get(id);
}

export function setCachedProviderPreview(id: string, data: ProviderDetail): void {
  cache.set(id, data);
}

export function abortProviderPreviewFetch(): void {
  inflight?.controller.abort();
  inflight = null;
}

export function beginProviderPreviewFetch(id: string): AbortController {
  if (inflight && inflight.id !== id) {
    inflight.controller.abort();
  }
  const controller = new AbortController();
  inflight = { id, controller };
  return controller;
}

export function endProviderPreviewFetch(id: string): void {
  if (inflight?.id === id) inflight = null;
}
