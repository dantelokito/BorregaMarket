import { PrismaClient, UserRole, ProductCategory, ProductUnit, SystemModule, AuditAction } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Sembrando LaBorregaMarket...\n");

  // ─── Módulos del sistema ───────────────────────────────────────────────────
  const modules = await Promise.all(
    [
      { code: SystemModule.USERS, name: "Usuarios", description: "Gestión de cuentas de usuario" },
      { code: SystemModule.PROVIDERS, name: "Proveedores", description: "Fruterías y negocios registrados" },
      { code: SystemModule.PRODUCTS, name: "Productos", description: "Catálogo global de frutas y verduras" },
      { code: SystemModule.ORDERS, name: "Pedidos", description: "Historial de pedidos" },
      { code: SystemModule.PERMISSIONS, name: "Permisos", description: "Control de acceso por rol" },
      { code: SystemModule.AUTH, name: "Autenticación", description: "Login y sesiones" },
      { code: SystemModule.AUDIT, name: "Bitácora", description: "Registro de auditoría" },
    ].map((m) =>
      prisma.module.upsert({
        where: { code: m.code },
        update: {},
        create: m,
      })
    )
  );

  // ─── Permisos: ADMIN acceso total, PROVIDER y CLIENT limitados ─────────────
  const adminPerms = modules.map((mod) => ({
    role: UserRole.ADMIN,
    moduleId: mod.id,
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
  }));

  const providerModules = modules.filter((m) =>
    [SystemModule.PRODUCTS, SystemModule.ORDERS, SystemModule.AUTH].includes(m.code as typeof SystemModule.PRODUCTS | typeof SystemModule.ORDERS | typeof SystemModule.AUTH)
  );
  const providerPerms = providerModules.map((mod) => ({
    role: UserRole.PROVIDER,
    moduleId: mod.id,
    canView: mod.code !== SystemModule.AUTH,
    canCreate: mod.code === SystemModule.ORDERS,
    canEdit: mod.code === SystemModule.PRODUCTS,
    canDelete: false,
  }));

  const clientModules = modules.filter((m) =>
    [SystemModule.PRODUCTS, SystemModule.ORDERS, SystemModule.AUTH].includes(m.code as typeof SystemModule.PRODUCTS | typeof SystemModule.ORDERS | typeof SystemModule.AUTH)
  );
  const clientPerms = clientModules.map((mod) => ({
    role: UserRole.CLIENT,
    moduleId: mod.id,
    canView: mod.code === SystemModule.PRODUCTS,
    canCreate: mod.code === SystemModule.ORDERS,
    canEdit: false,
    canDelete: false,
  }));

  for (const perm of [...adminPerms, ...providerPerms, ...clientPerms]) {
    await prisma.rolePermission.upsert({
      where: { role_moduleId: { role: perm.role, moduleId: perm.moduleId } },
      update: perm,
      create: perm,
    });
  }

  // ─── Usuarios de prueba ────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("Demo1234!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@laborregamarket.mx" },
    update: {},
    create: {
      email: "admin@laborregamarket.mx",
      passwordHash,
      name: "Admin LaBorrega",
      role: UserRole.ADMIN,
      phone: "+528110000001",
    },
  });

  const providerUser = await prisma.user.upsert({
    where: { email: "frutas@elparaiso.mx" },
    update: {},
    create: {
      email: "frutas@elparaiso.mx",
      passwordHash,
      name: "Carlos Méndez",
      role: UserRole.PROVIDER,
      phone: "+528110000002",
    },
  });

  const client = await prisma.user.upsert({
    where: { email: "cliente@demo.mx" },
    update: {},
    create: {
      email: "cliente@demo.mx",
      passwordHash,
      name: "María González",
      role: UserRole.CLIENT,
      phone: "+528110000003",
    },
  });

  // ─── Proveedores (fruterías en Monterrey) ──────────────────────────────────
  const providers = await Promise.all([
    prisma.provider.upsert({
      where: { userId: providerUser.id },
      update: { rating: 0, reviewCount: 0 },
      create: {
        userId: providerUser.id,
        businessName: "Frutas El Paraíso",
        description: "Frutas frescas de temporada, orgánicas y de exportación. Entrega a domicilio.",
        address: "Av. Constitución 1200, Centro, Monterrey",
        latitude: 25.6714,
        longitude: -100.3095,
        phone: "+528110000002",
        logoUrl: "https://images.unsplash.com/photo-1610831308542-9b788b11c4e0?w=400",
        coverUrl: "https://images.unsplash.com/photo-1488459716781-31db525782fe?w=800",
        rating: 0,
        reviewCount: 0,
        isVerified: true,
      },
    }),
  ]);

  // Segundo proveedor sin cuenta de usuario vinculada (solo demo)
  const provider2User = await prisma.user.upsert({
    where: { email: "verduras@campoverde.mx" },
    update: {},
    create: {
      email: "verduras@campoverde.mx",
      passwordHash,
      name: "Ana Ruiz",
      role: UserRole.PROVIDER,
      phone: "+528110000004",
    },
  });

  const provider2 = await prisma.provider.upsert({
    where: { userId: provider2User.id },
    update: { rating: 0, reviewCount: 0 },
    create: {
      userId: provider2User.id,
      businessName: "Campo Verde Frutería",
      description: "Verduras de la huerta, directo del productor. Precios de mayoreo disponibles.",
      address: "Calle Hidalgo 450, San Pedro, Monterrey",
      latitude: 25.6515,
      longitude: -100.4025,
      phone: "+528110000004",
      logoUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400",
      coverUrl: "https://images.unsplash.com/photo-1518843879619-1d2b755659a8?w=800",
      rating: 0,
      reviewCount: 0,
      isVerified: true,
    },
  });

  const provider3User = await prisma.user.upsert({
    where: { email: "agro@laborrega.mx" },
    update: {},
    create: {
      email: "agro@laborrega.mx",
      passwordHash,
      name: "Roberto Sánchez",
      role: UserRole.PROVIDER,
      phone: "+528110000005",
    },
  });

  const provider3 = await prisma.provider.upsert({
    where: { userId: provider3User.id },
    update: { rating: 0, reviewCount: 0 },
    create: {
      userId: provider3User.id,
      businessName: "La Borrega Agrícola",
      description: "Productos agrícolas locales: miel, mermeladas, frutos secos y más.",
      address: "Blvd. Díaz Ordaz 2100, Santa Catarina",
      latitude: 25.6736,
      longitude: -100.4583,
      phone: "+528110000005",
      logoUrl: "https://images.unsplash.com/photo-1566385101042-1a0aa0c1269c?w=400",
      coverUrl: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800",
      rating: 0,
      reviewCount: 0,
      isVerified: false,
    },
  });

  // ─── Catálogo global de productos ──────────────────────────────────────────
  const productsData = [
    { name: "Manzana Roja", slug: "manzana-roja", category: ProductCategory.FRUTA, unit: ProductUnit.KG },
    { name: "Plátano Tabasco", slug: "platano-tabasco", category: ProductCategory.FRUTA, unit: ProductUnit.KG },
    { name: "Naranja Valencia", slug: "naranja-valencia", category: ProductCategory.FRUTA, unit: ProductUnit.KG },
    { name: "Fresa", slug: "fresa", category: ProductCategory.FRUTA, unit: ProductUnit.KG },
    { name: "Mango Ataulfo", slug: "mango-ataulfo", category: ProductCategory.FRUTA, unit: ProductUnit.KG },
    { name: "Sandía", slug: "sandia", category: ProductCategory.FRUTA, unit: ProductUnit.PIEZA },
    { name: "Aguacate Hass", slug: "aguacate-hass", category: ProductCategory.FRUTA, unit: ProductUnit.KG },
    { name: "Jitomate", slug: "jitomate", category: ProductCategory.VERDURA, unit: ProductUnit.KG },
    { name: "Lechuga Romana", slug: "lechuga-romana", category: ProductCategory.VERDURA, unit: ProductUnit.PIEZA },
    { name: "Zanahoria", slug: "zanahoria", category: ProductCategory.VERDURA, unit: ProductUnit.KG },
    { name: "Cebolla Blanca", slug: "cebolla-blanca", category: ProductCategory.VERDURA, unit: ProductUnit.KG },
    { name: "Chile Jalapeño", slug: "chile-jalapeno", category: ProductCategory.VERDURA, unit: ProductUnit.KG },
    { name: "Miel de Abeja", slug: "miel-de-abeja", category: ProductCategory.AGRICOLA, unit: ProductUnit.LITRO },
    { name: "Nuez de Castilla", slug: "nuez-castilla", category: ProductCategory.AGRICOLA, unit: ProductUnit.KG },
    { name: "Chile Seco Ancho", slug: "chile-seco-ancho", category: ProductCategory.AGRICOLA, unit: ProductUnit.KG },
  ];

  const products = await Promise.all(
    productsData.map((p) =>
      prisma.product.upsert({
        where: { slug: p.slug },
        update: {},
        create: {
          ...p,
          imageUrl: `https://images.unsplash.com/photo-1566385101042-1a0aa0c1269c?w=300&sig=${p.slug}`,
        },
      })
    )
  );

  // ─── Productos por proveedor con precios ───────────────────────────────────
  const priceMap: Record<string, number> = {
    "manzana-roja": 45,
    "platano-tabasco": 28,
    "naranja-valencia": 35,
    "fresa": 120,
    "mango-ataulfo": 55,
    "sandia": 80,
    "aguacate-hass": 95,
    "jitomate": 32,
    "lechuga-romana": 18,
    "zanahoria": 25,
    "cebolla-blanca": 22,
    "chile-jalapeno": 40,
    "miel-de-abeja": 180,
    "nuez-castilla": 350,
    "chile-seco-ancho": 280,
  };

  const allProviders = [providers[0], provider2, provider3];

  for (const provider of allProviders) {
    for (const product of products) {
      const basePrice = priceMap[product.slug] ?? 50;
      const variation = (Math.random() * 0.2 - 0.1) * basePrice;
      const price = Math.round((basePrice + variation) * 100) / 100;
      const isAvailable = Math.random() > 0.15;

      await prisma.providerProduct.upsert({
        where: {
          providerId_productId: { providerId: provider.id, productId: product.id },
        },
        update: {},
        create: {
          providerId: provider.id,
          productId: product.id,
          price,
          isAvailable,
        },
      });
    }
  }

  // ─── Bitácora inicial ────────────────────────────────────────────────────────
  await prisma.auditLog.create({
    data: {
      module: SystemModule.AUTH,
      action: AuditAction.CREATE,
      entityId: admin.id,
      userId: admin.id,
      details: { message: "Seed inicial de LaBorregaMarket completado" },
    },
  });

  console.log("✅ Seed completado:");
  console.log(`   ${modules.length} módulos`);
  console.log(`   ${products.length} productos en catálogo global`);
  console.log(`   ${allProviders.length} proveedores`);
  console.log(`   Usuarios demo (password: Demo1234!):`);
  console.log(`     admin@laborregamarket.mx  → ADMIN`);
  console.log(`     frutas@elparaiso.mx       → PROVIDER`);
  console.log(`     cliente@demo.mx           → CLIENT`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
