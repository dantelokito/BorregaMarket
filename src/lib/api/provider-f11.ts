import { ApiError, apiGet, apiPost } from "./client";
import { getAuthSession } from "./auth";
import { getMyBusiness } from "./provider-panel";
import { buildReportRangeQuery } from "./provider-ops";
import type {
  ActiveProviderResult,
  GlobalProviderReport,
  MineProvider,
  ProviderMine,
  SessionBrand,
} from "./types";

export const ACTIVE_PROVIDER_EVENT = "lbm-active-provider";
export const MOCK_ACTIVE_KEY = "lbm_mock_active_provider";

const TECNO_MOCK_ID = "mock-paraiso-tecnologico";

export function notifyActiveProviderChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ACTIVE_PROVIDER_EVENT));
}

function readMockActive(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(MOCK_ACTIVE_KEY);
}

function writeMockActive(id: string) {
  sessionStorage.setItem(MOCK_ACTIVE_KEY, id);
}

function isMissingRoute(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 404 || err.status === 405);
}

function mockTecno(base: MineProvider): MineProvider {
  return {
    id: TECNO_MOCK_ID,
    businessName: "El Paraíso Tecnológico",
    address: "Av. Eugenio Garza Sada 2501, Tecnológico, Monterrey",
    isActive: true,
  };
}

function isParaisoName(name: string): boolean {
  const n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return n.includes("paraiso");
}

async function mockMineFromMe(): Promise<ProviderMine> {
  const { data: me } = await getMyBusiness();
  const mockId = readMockActive();
  const first: MineProvider = {
    id: me.id,
    businessName: me.businessName,
    address: me.address,
    isActive: true,
  };
  if (isParaisoName(me.businessName)) {
    const tecno = mockTecno(first);
    const providers = [first, tecno];
    const activeProviderId =
      mockId && providers.some((p) => p.id === mockId) ? mockId : first.id;
    return { providerCount: 2, activeProviderId, providers };
  }
  return {
    providerCount: 1,
    activeProviderId: first.id,
    providers: [first],
  };
}

export async function getProviderMine(): Promise<ProviderMine> {
  try {
    const { data } = await apiGet<ProviderMine>("/api/provider/mine");
    return data;
  } catch (err) {
    if (!isMissingRoute(err)) throw err;
  }

  const session = await getAuthSession();
  if (session.providers && session.providers.length > 0) {
    const providers: MineProvider[] = session.providers.map((p) => ({
      id: p.id,
      businessName: p.businessName,
      address: "",
      isActive: true,
    }));
    return {
      providerCount: session.providerCount ?? providers.length,
      activeProviderId: session.activeProviderId ?? providers[0]?.id ?? null,
      providers,
    };
  }

  if (session.role !== "PROVIDER") {
    return { providerCount: 0, activeProviderId: null, providers: [] };
  }

  return mockMineFromMe();
}

export async function setActiveProvider(providerId: string): Promise<ActiveProviderResult> {
  try {
    const { data } = await apiPost<ActiveProviderResult>("/api/provider/active", { providerId });
    return data;
  } catch (err) {
    if (!isMissingRoute(err)) throw err;
    writeMockActive(providerId);
    const mine = await getProviderMine();
    const chosen = mine.providers.find((p) => p.id === providerId);
    if (!chosen) {
      throw new ApiError("No se pudo cambiar de frutería", 403, undefined, "ACTIVE_FORBIDDEN");
    }
    const brand: SessionBrand | null = null;
    return {
      activeProviderId: chosen.id,
      businessName: chosen.businessName,
      brand,
    };
  }
}

export async function getGlobalProviderReport(input: {
  from: string;
  to: string;
  productIds?: string[];
}): Promise<GlobalProviderReport> {
  const ids = input.productIds && input.productIds.length > 0 ? input.productIds : undefined;
  try {
    const { data } = await apiGet<GlobalProviderReport>(
      `/api/provider/reports/global${buildReportRangeQuery(input.from, input.to, ids)}`
    );
    return data;
  } catch (err) {
    if (err instanceof ApiError && err.code === "GLOBAL_REPORTS_NOT_AVAILABLE") {
      throw err;
    }
    if (!isMissingRoute(err)) throw err;
    const mine = await getProviderMine();
    const zeros = mine.providers.map((p) => ({
      providerId: p.id,
      businessName: p.businessName,
      gmv: "0.00",
      orderCount: 0,
      avgTicket: "0.00",
    }));
    return {
      empty: true,
      timezone: "America/Monterrey",
      generatedAt: new Date().toISOString(),
      scope: "allOwnedProviders",
      providerCount: mine.providerCount,
      period: { mode: "range", from: input.from, to: input.to },
      kpis: {
        gmv: "0.00",
        avgTicket: "0.00",
        orderCount: 0,
        bySource: {
          MARKETPLACE: { gmv: "0.00", orderCount: 0 },
          POS: { gmv: "0.00", orderCount: 0 },
        },
      },
      byProvider: zeros,
      series: [],
      products: [],
    };
  }
}

export function usedF11MockRoutes(): boolean {
  return typeof window !== "undefined" && sessionStorage.getItem(MOCK_ACTIVE_KEY) != null;
}
