export interface FieldError {
  field: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  radiusKm?: number;
  rating?: number;
  reviewCount?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "CLIENT" | "PROVIDER" | "ADMIN";
}

export interface SessionBrand {
  primaryColor: string | null;
  secondaryColor: string | null;
  source: "provider";
}

export interface SessionProviderSummary {
  id: string;
  businessName: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

export interface AuthSession {
  authenticated: boolean;
  role: "CLIENT" | "PROVIDER" | "ADMIN" | null;
  brand: SessionBrand | null;
  providerCount?: number;
  activeProviderId?: string | null;
  providers?: SessionProviderSummary[];
}

export interface MineProvider {
  id: string;
  businessName: string;
  address: string;
  isActive: boolean;
}

export interface ProviderMine {
  providerCount: number;
  activeProviderId: string | null;
  providers: MineProvider[];
}

export interface ActiveProviderResult {
  activeProviderId: string;
  businessName: string;
  brand: SessionBrand | null;
}

export interface GlobalReportByProvider {
  providerId: string;
  businessName: string;
  gmv: string;
  orderCount: number;
  avgTicket: string;
}

export interface GlobalProviderReport {
  empty: boolean;
  timezone: string;
  generatedAt: string;
  scope: "allOwnedProviders";
  providerCount: number;
  period: {
    mode: "range" | "grain";
    from: string;
    to: string;
    fromUtc?: string;
    toUtc?: string;
  };
  kpis: {
    gmv: string;
    avgTicket: string;
    orderCount: number;
    bySource: {
      MARKETPLACE: { gmv: string; orderCount: number };
      POS: { gmv: string; orderCount: number };
    };
  };
  byProvider: GlobalReportByProvider[];
  series: { bucket: string; gmv: string; orderCount: number }[];
  products: {
    providerProductId: string;
    providerId: string;
    businessName: string;
    name: string;
    quantitySum: string;
    salesTotal: string;
    bySource: {
      MARKETPLACE: { gmv: string; quantitySum: string };
      POS: { gmv: string; quantitySum: string };
    };
  }[];
}

export interface ProviderListing {
  id: string;
  businessName: string;
  description: string | null;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  logoUrl: string | null;
  coverUrl: string | null;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  offersWholesale: boolean;
  offersDelivery: boolean;
  productCount: number;
  sampleProducts: { name: string; price: number; unit: string }[];
  minPrice: number | null;
  distanceKm?: number;
}

export type UnitOfMeasure = "PZA" | "KG" | "GR";
export type ProductScope = "GLOBAL" | "LOCAL";
export type OrderStatus = "PENDING" | "CONFIRMED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
export type OrderSource = "MARKETPLACE" | "POS";
export type PaymentMethod = "CASH" | "OTHER" | "UNPAID";

export interface ProviderProduct {
  providerProductId: string;
  productId: string;
  name: string;
  slug: string;
  category: string | null;
  unit: string;
  unitOfMeasure: UnitOfMeasure;
  price: number;
  isAvailable: boolean;
  imageUrl?: string | null;
  scope?: ProductScope;
  sectionId?: string | null;
  sectionName?: string | null;
  sectionSortOrder?: number | null;
}

export interface OpeningHourDay {
  day: number;
  open: string | null;
  close: string | null;
  closed: boolean;
}

export interface ProviderDetail {
  id: string;
  businessName: string;
  description: string | null;
  address: string;
  city: string;
  state: string | null;
  latitude: number;
  longitude: number;
  phone: string;
  logoUrl: string | null;
  coverUrl: string | null;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  verifiedAt?: string | null;
  preparationTimeMinutes?: number;
  offersDelivery?: boolean;
  whatsappEnabled?: boolean;
  acceptsCardAtStore?: boolean;
  offersWholesale?: boolean;
  offersRetail?: boolean;
  hoursPublished?: boolean;
  isOpenNow?: boolean | null;
  openingHours?: OpeningHourDay[] | null;
  reviewsPreview?: ProviderReview[];
  googleReviews?: {
    enabled: boolean;
    placeId: string | null;
    mapsUrl: string | null;
  } | null;
  products: ProviderProduct[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "CLIENT";
  whatsappOptIn?: boolean;
}

export interface ProviderBusiness {
  id: string;
  businessName: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  description: string | null;
  isVerified: boolean;
  verifiedAt?: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  preparationTimeMinutes?: number;
  offersDelivery?: boolean;
  whatsappEnabled?: boolean;
  acceptsCardAtStore?: boolean;
  offersWholesale?: boolean;
  offersRetail?: boolean;
  googlePlaceId?: string | null;
  googleMapsUrl?: string | null;
  googleReviewsEnabled?: boolean;
  googleReviewsLocked?: boolean;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  posShowImages?: boolean;
  openingHours?: OpeningHourDay[] | null;
}

export interface CatalogItem {
  product: {
    id: string;
    name: string;
    slug: string;
    category: string | null;
    unit: string;
    description: string | null;
    imageUrl?: string | null;
  };
  price: number | null;
  isAvailable: boolean;
  providerProductId: string | null;
  scope?: ProductScope;
  sectionId?: string | null;
  sectionName?: string | null;
  imageUrl?: string | null;
  onHand?: string | null;
  capacityMax?: string | null;
  fillPercent?: number | null;
  reserved?: string | null;
  lowStockAlert?: boolean | null;
  alertEnabled?: boolean | null;
  archivedAt?: string | null;
  saleUnit?: string | null;
  effectiveSaleUnit?: string | null;
  boxContentFactor?: string | null;
  canEditMaster?: boolean;
}

export interface ProviderSection {
  id: string;
  name: string;
  sortOrder: number;
  productCount: number;
}

export interface LocalProductRecord {
  providerProductId: string;
  productId: string;
  scope: "LOCAL";
  name: string;
  slug: string;
  unit: string;
  price: number;
  isAvailable: boolean;
  sectionId: string | null;
  imageUrl: string | null;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  unit: string;
  imageUrl: string | null;
  isActive: boolean;
  scope: ProductScope;
  ownerProviderId?: string | null;
  ownerBusinessName?: string | null;
  createdAt: string;
}

export interface PriceHistoryRow {
  id: string;
  price: string;
  previousPrice: string | null;
  changedByUserId: string | null;
  createdAt: string;
}

export interface InventoryReportBalance {
  providerProductId: string;
  productId?: string;
  name: string;
  effectiveSaleUnit: string;
  onHand: string;
  reserved?: string;
  isAvailable?: boolean;
}

export interface InventoryReportEntry {
  id: string;
  providerProductId: string;
  name: string;
  quantity: string;
  receiveAs: string;
  appliedDelta: string;
  createdAt: string;
}

export interface BranchInventoryReport {
  timezone: string;
  generatedAt: string;
  scope: "activeProvider";
  providerId: string;
  balances: InventoryReportBalance[];
  entries: InventoryReportEntry[];
}

export interface GlobalInventoryReport {
  timezone: string;
  generatedAt: string;
  scope: "allOwnedProviders";
  providerCount: number;
  byProvider: Array<{
    providerId: string;
    businessName: string;
    branchLabel?: string | null;
    balances: InventoryReportBalance[];
  }>;
}

export interface ProviderProductsResponse {
  provider: { id: string; businessName: string };
  catalog: CatalogItem[];
}

export interface AdminProvider {
  id: string;
  businessName: string;
  city: string;
  phone: string | null;
  isVerified: boolean;
  isActive: boolean;
  offersWholesale?: boolean;
  offersDelivery?: boolean;
  userEmail: string;
  ownerEmail?: string;
  hasValidEmail?: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  module: string;
  action: string;
  entityId: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  details: unknown;
  ipAddress: string | null;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  providerProductId: string | null;
  productId: string | null;
  itemName: string;
  quantity: string;
  unitOfMeasure: UnitOfMeasure;
  unitPrice: string;
  subtotal: string;
}

export interface OrderClient {
  id: string;
  name: string;
  phone: string | null;
}

export type FulfillmentType = "PICKUP" | "DELIVERY";

export interface DeliveryAddressSnapshot {
  label: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}

export interface Order {
  id: string;
  source: OrderSource;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paidAt: string | null;
  providerId: string;
  providerName?: string;
  clientId: string | null;
  customerName?: string | null;
  notes: string | null;
  total: string;
  items: OrderItem[];
  createdAt: string;
  client?: OrderClient | null;
  fulfillmentType?: FulfillmentType;
  etaMinutes?: number | null;
  deliveryAddressSnapshot?: DeliveryAddressSnapshot | null;
}

export interface UserAddress {
  id: string;
  label: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  isFavorite: boolean;
  isDefault: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface ProviderReview {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string;
  createdAt: string;
}

export interface OrderReview {
  id: string;
  orderId: string;
  providerId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export type EtaCopyKey = "eta_prep_only" | "eta_ready_approx";

export interface ProviderEta {
  providerId: string;
  preparationTimeMinutes: number;
  travelMinutes: number;
  etaMinutes: number;
  distanceKm: number;
  fulfillmentType: FulfillmentType;
  copyKey: EtaCopyKey;
}

export type AnalyticsRange = "today" | "7d" | "30d";

export interface AdminAnalyticsKpis {
  gmv: number;
  orderCount: number;
  activeProviders: number;
  cancellationRate: number;
  bySource: {
    MARKETPLACE: { gmv: number; orderCount: number };
    POS: { gmv: number; orderCount: number };
  };
}

export interface AdminAnalytics {
  empty: boolean;
  range: AnalyticsRange;
  timezone: string;
  from: string;
  to: string;
  kpis: AdminAnalyticsKpis | null;
}

export interface ProviderOrderListItem {
  id: string;
  source: OrderSource;
  status: OrderStatus;
  total: string;
  itemCount: number;
  customerName: string | null;
  client: OrderClient | null;
  notes: string | null;
  createdAt: string;
}

export interface DashboardKpi {
  salesTotal: string;
  orderCount: number;
}

export interface DashboardSummary {
  kpis: {
    d1: DashboardKpi;
    d7: DashboardKpi;
    d30: DashboardKpi;
    bySource: {
      marketplace: DashboardKpi;
      pos: DashboardKpi;
    };
  };
  statusToday: Record<OrderStatus, number>;
  series7d: { date: string; salesTotal: string; orderCount: number }[];
  topProducts: {
    providerProductId: string | null;
    name: string;
    salesTotal: string;
    quantitySum: string;
  }[];
  empty: boolean;
}

export type ReportGrain = "day" | "month" | "year";

export interface ProviderReportSourceKpi {
  gmv: string;
  orderCount: number;
}

export interface ProviderReport {
  empty: boolean;
  timezone: "America/Monterrey";
  generatedAt: string;
  provider: {
    id: string;
    businessName: string;
  };
  period: {
    mode?: "grain" | "range";
    grain?: ReportGrain;
    date?: string;
    from: string;
    to: string;
    fromUtc?: string;
    toUtc?: string;
  };
  kpis: {
    gmv: string;
    avgTicket: string;
    orderCount: number;
    bySource: {
      MARKETPLACE: ProviderReportSourceKpi;
      POS: ProviderReportSourceKpi;
    };
  };
  series: { bucket: string; gmv: string; orderCount: number }[];
  topProducts?: {
    providerProductId: string | null;
    name: string;
    salesTotal: string;
    quantitySum: string;
  }[];
  products?: {
    providerProductId: string | null;
    name: string;
    quantitySum: string;
    salesTotal: string;
    bySource: {
      MARKETPLACE: { gmv: string; quantitySum: string };
      POS: { gmv: string; quantitySum: string };
    };
  }[];
}

export interface CreateProviderInput {
  businessName: string;
  address: string;
  city?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  description?: string;
}
