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

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "CLIENT" | "PROVIDER" | "ADMIN";
}

export const FILTER_CHIPS = [
  { id: "organico", label: "Orgánico", icon: "🌿" },
  { id: "mayoreo", label: "Mayoreo", icon: "📦" },
  { id: "domicilio", label: "A domicilio", icon: "🚚" },
  { id: "verificado", label: "Verificado", icon: "✓" },
  { id: "frutas", label: "Frutas", icon: "🍎" },
  { id: "verduras", label: "Verduras", icon: "🥬" },
  { id: "agricola", label: "Agrícola", icon: "🌾" },
  { id: "filtros", label: "Filtros", icon: "⚙️" },
] as const;

export const DEMO_PROVIDERS: ProviderListing[] = [
  {
    id: "1",
    businessName: "Frutas El Paraíso",
    description: "Frutas frescas de temporada, orgánicas y de exportación.",
    address: "Av. Constitución 1200, Centro",
    city: "Monterrey",
    latitude: 25.6714,
    longitude: -100.3095,
    phone: "+528110000002",
    logoUrl: "https://images.unsplash.com/photo-1610831308542-9b788b11c4e0?w=400",
    coverUrl: "https://images.unsplash.com/photo-1488459716781-31db525782fe?w=800",
    rating: 4.92,
    reviewCount: 128,
    isVerified: true,
    productCount: 12,
    sampleProducts: [
      { name: "Mango Ataulfo", price: 55, unit: "KG" },
      { name: "Aguacate Hass", price: 95, unit: "KG" },
    ],
    minPrice: 28,
  },
  {
    id: "2",
    businessName: "Campo Verde Frutería",
    description: "Verduras de la huerta, directo del productor.",
    address: "Calle Hidalgo 450, San Pedro",
    city: "Monterrey",
    latitude: 25.6515,
    longitude: -100.4025,
    phone: "+528110000004",
    logoUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400",
    coverUrl: "https://images.unsplash.com/photo-1518843879619-1d2b755659a8?w=800",
    rating: 4.78,
    reviewCount: 89,
    isVerified: true,
    productCount: 10,
    sampleProducts: [
      { name: "Lechuga Romana", price: 18, unit: "PIEZA" },
      { name: "Jitomate", price: 32, unit: "KG" },
    ],
    minPrice: 18,
  },
  {
    id: "3",
    businessName: "La Borrega Agrícola",
    description: "Productos agrícolas locales: miel, mermeladas, frutos secos.",
    address: "Blvd. Díaz Ordaz 2100, Santa Catarina",
    city: "Monterrey",
    latitude: 25.6736,
    longitude: -100.4583,
    phone: "+528110000005",
    logoUrl: "https://images.unsplash.com/photo-1566385101042-1a0aa0c1269c?w=400",
    coverUrl: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800",
    rating: 4.85,
    reviewCount: 56,
    isVerified: false,
    productCount: 8,
    sampleProducts: [
      { name: "Miel de Abeja", price: 180, unit: "LITRO" },
      { name: "Nuez de Castilla", price: 350, unit: "KG" },
    ],
    minPrice: 55,
  },
  {
    id: "4",
    businessName: "Frutas del Valle",
    description: "Frutas tropicales y cítricos de la región.",
    address: "Av. Lincoln 3400, Mitras",
    city: "Monterrey",
    latitude: 25.6869,
    longitude: -100.3161,
    phone: "+528110000006",
    logoUrl: "https://images.unsplash.com/photo-1619566636852-156a2c2c2c2c?w=400",
    coverUrl: "https://images.unsplash.com/photo-1605027990120-9c5760802145?w=800",
    rating: 4.65,
    reviewCount: 42,
    isVerified: true,
    productCount: 9,
    sampleProducts: [
      { name: "Naranja Valencia", price: 35, unit: "KG" },
      { name: "Plátano Tabasco", price: 28, unit: "KG" },
    ],
    minPrice: 28,
  },
  {
    id: "5",
    businessName: "Huerta San Miguel",
    description: "Verduras orgánicas certificadas, entrega mismo día.",
    address: "Calle Morelos 890, Guadalupe",
    city: "Monterrey",
    latitude: 25.6768,
    longitude: -100.2565,
    phone: "+528110000007",
    logoUrl: "https://images.unsplash.com/photo-1597362925123-77861d3fab48?w=400",
    coverUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
    rating: 4.88,
    reviewCount: 73,
    isVerified: true,
    productCount: 11,
    sampleProducts: [
      { name: "Zanahoria", price: 25, unit: "KG" },
      { name: "Chile Jalapeño", price: 40, unit: "KG" },
    ],
    minPrice: 22,
  },
  {
    id: "6",
    businessName: "Mercado Central Frutal",
    description: "El mayor surtido de frutas importadas y nacionales.",
    address: "Mercado Juárez, Local 45",
    city: "Monterrey",
    latitude: 25.6692,
    longitude: -100.3098,
    phone: "+528110000008",
    logoUrl: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400",
    coverUrl: "https://images.unsplash.com/photo-1571771019784-3fa35f4fa6af?w=800",
    rating: 4.71,
    reviewCount: 201,
    isVerified: true,
    productCount: 15,
    sampleProducts: [
      { name: "Fresa", price: 120, unit: "KG" },
      { name: "Sandía", price: 80, unit: "PIEZA" },
    ],
    minPrice: 35,
  },
];
