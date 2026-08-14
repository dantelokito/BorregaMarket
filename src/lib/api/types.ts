export interface FieldError {
  field: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "CLIENT" | "PROVIDER" | "ADMIN";
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
  productCount: number;
  sampleProducts: { name: string; price: number; unit: string }[];
  minPrice: number | null;
}

export type UnitOfMeasure = "PZA" | "KG" | "GR";
export type OrderStatus = "PENDING" | "CONFIRMED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
export type OrderSource = "MARKETPLACE" | "POS";
export type PaymentMethod = "CASH" | "OTHER" | "UNPAID";

export interface ProviderProduct {
  providerProductId: string;
  productId: string;
  name: string;
  slug: string;
  category: string;
  unit: string;
  unitOfMeasure: UnitOfMeasure;
  price: number;
  isAvailable: boolean;
  imageUrl?: string | null;
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
  products: ProviderProduct[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "CLIENT";
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
  logoUrl: string | null;
  coverUrl: string | null;
}

export interface CatalogItem {
  product: {
    id: string;
    name: string;
    slug: string;
    category: string;
    unit: string;
    description: string | null;
    imageUrl?: string | null;
  };
  price: number | null;
  isAvailable: boolean;
  providerProductId: string | null;
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
  userEmail: string;
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

export interface CreateProviderInput {
  businessName: string;
  address: string;
  city?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  description?: string;
}
