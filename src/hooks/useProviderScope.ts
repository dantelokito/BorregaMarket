"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getAuthSession, refreshSessionTheme, SESSION_THEME_EVENT } from "@/lib/api/auth";
import {
  ACTIVE_PROVIDER_EVENT,
  getProviderMine,
  notifyActiveProviderChanged,
  setActiveProvider,
} from "@/lib/api/provider-f11";
import { ApiError } from "@/lib/api/client";
import type { MineProvider } from "@/lib/api/types";
import {
  mineProvidersFromSession,
  shouldRetryScopeSession,
  shouldShowGlobalReports,
  shouldShowProviderSwitcher,
} from "@/lib/ui/provider-label";

export type ProviderScopeStatus = "loading" | "ready" | "error";

interface ProviderScopeValue {
  status: ProviderScopeStatus;
  providerCount: number;
  activeProviderId: string | null;
  activeName: string;
  providers: MineProvider[];
  showSwitcher: boolean;
  showGlobalReports: boolean;
  switching: boolean;
  error: string;
  reload: () => Promise<void>;
  switchTo: (providerId: string) => Promise<boolean>;
}

const ProviderScopeContext = createContext<ProviderScopeValue | null>(null);

export function ProviderScopeProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ProviderScopeStatus>("loading");
  const [providers, setProviders] = useState<MineProvider[]>([]);
  const [activeProviderId, setActiveId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const reloadGen = useRef(0);

  const reload = useCallback(async () => {
    const gen = ++reloadGen.current;
    const stillCurrent = () => reloadGen.current === gen;

    let session = await getAuthSession();
    if (shouldRetryScopeSession(session) && typeof window !== "undefined") {
      const onProviderRoute = window.location.pathname.startsWith("/proveedor");
      if (onProviderRoute) {
        for (let i = 0; i < 3 && stillCurrent(); i++) {
          await new Promise((r) => setTimeout(r, 160));
          session = await getAuthSession();
          if (session.authenticated) break;
        }
      }
    }
    if (!stillCurrent()) return;

    if (session.role !== "PROVIDER") {
      setProviders([]);
      setActiveId(null);
      setStatus("ready");
      return;
    }

    const fromSession = mineProvidersFromSession(session);
    if (fromSession.length > 0) {
      setProviders(fromSession);
      setActiveId(session.activeProviderId ?? fromSession[0]?.id ?? null);
    }

    try {
      const mine = await getProviderMine();
      if (!stillCurrent()) return;
      setProviders(mine.providers);
      setActiveId(mine.activeProviderId);
      setError("");
      setStatus("ready");
    } catch {
      if (!stillCurrent()) return;
      if (fromSession.length > 0) {
        setError("");
        setStatus("ready");
        return;
      }
      setStatus("error");
      setError("No se pudieron cargar tus fruterías");
    }
  }, []);

  useEffect(() => {
    void reload();
    const onChange = () => {
      void reload();
    };
    window.addEventListener(ACTIVE_PROVIDER_EVENT, onChange);
    window.addEventListener(SESSION_THEME_EVENT, onChange);
    return () => {
      window.removeEventListener(ACTIVE_PROVIDER_EVENT, onChange);
      window.removeEventListener(SESSION_THEME_EVENT, onChange);
    };
  }, [reload]);

  const switchTo = useCallback(
    async (providerId: string) => {
      if (providerId === activeProviderId) return true;
      setSwitching(true);
      try {
        const result = await setActiveProvider(providerId);
        setActiveId(result.activeProviderId);
        refreshSessionTheme();
        notifyActiveProviderChanged();
        return true;
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "No se pudo cambiar de frutería";
        setError(message);
        return false;
      } finally {
        setSwitching(false);
      }
    },
    [activeProviderId]
  );

  const activeName = providers.find((p) => p.id === activeProviderId)?.businessName ?? "";
  const providerCount = providers.length;
  const value = useMemo<ProviderScopeValue>(
    () => ({
      status,
      providerCount,
      activeProviderId,
      activeName,
      providers,
      showSwitcher: shouldShowProviderSwitcher(providerCount),
      showGlobalReports: shouldShowGlobalReports(providerCount),
      switching,
      error,
      reload,
      switchTo,
    }),
    [
      status,
      providerCount,
      activeProviderId,
      activeName,
      providers,
      switching,
      error,
      reload,
      switchTo,
    ]
  );

  return createElement(ProviderScopeContext.Provider, { value }, children);
}

export function useProviderScope(): ProviderScopeValue {
  const ctx = useContext(ProviderScopeContext);
  if (!ctx) {
    return {
      status: "ready",
      providerCount: 0,
      activeProviderId: null,
      activeName: "",
      providers: [],
      showSwitcher: false,
      showGlobalReports: false,
      switching: false,
      error: "",
      reload: async () => undefined,
      switchTo: async () => false,
    };
  }
  return ctx;
}
