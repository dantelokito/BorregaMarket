import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderSource, OrderStatus, PaymentMethod, UserRole } from "@prisma/client";
import { Decimal } from "@/lib/money";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    order: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    provider: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    providerProduct: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    userAddress: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue("audit1"),
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));

import { createMarketplaceOrder, transitionStatus } from "@/lib/services/order.service";
import { createPosSale } from "@/lib/services/pos.service";
import { ProductUnavailableError } from "@/lib/orders/errors";
import { OrderValidationError } from "@/lib/orders/errors";
import { inngest } from "@/lib/inngest/client";

const includeShape = expect.any(Object);

describe("createMarketplaceOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns replay without creating when idempotency key exists", async () => {
    const existing = {
      id: "ord1",
      source: OrderSource.MARKETPLACE,
      status: OrderStatus.PENDING,
      paymentMethod: PaymentMethod.UNPAID,
      paidAt: null,
      providerId: "prov1",
      clientId: "client1",
      customerName: null,
      notes: null,
      total: new Decimal("85.50"),
      createdAt: new Date("2026-08-13T18:00:00.000Z"),
      fulfillmentType: "PICKUP",
      etaMinutes: 20,
      deliveryAddressSnapshot: null,
      items: [
        {
          id: "item1",
          providerProductId: "pp1",
          productId: "prod1",
          itemName: "Mango",
          quantity: new Decimal("2"),
          unitOfMeasure: "PZA",
          unitPrice: new Decimal("42.75"),
          subtotal: new Decimal("85.50"),
        },
      ],
      provider: { id: "prov1", businessName: "Don Carlos", userId: "u2" },
      client: { id: "client1", name: "María", phone: "811" },
    };
    prismaMock.order.findUnique.mockResolvedValue(existing);

    const result = await createMarketplaceOrder({
      clientId: "client1",
      clientName: "María",
      input: {
        providerId: "prov1",
        fulfillmentType: "PICKUP",
        items: [{ providerProductId: "pp1", quantity: "2", unitOfMeasure: "PZA" }],
      },
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
    });

    expect(result.replay).toBe(true);
    expect(prismaMock.order.create).not.toHaveBeenCalled();
    expect(result.order.total).toBe("85.50");
  });

  it("rejects unavailable catalog products with 409-class error", async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);
    prismaMock.provider.findFirst.mockResolvedValue({
      id: "prov1",
      businessName: "Don Carlos",
      offersDelivery: false,
      preparationTimeMinutes: 20,
      latitude: 25.6714,
      longitude: -100.3089,
      user: { email: "c@test.com" },
    });
    prismaMock.user.findUnique.mockResolvedValue({ name: "María", phone: "811" });
    prismaMock.providerProduct.findMany.mockResolvedValue([
      {
        id: "pp1",
        providerId: "prov1",
        productId: "prod1",
        isAvailable: false,
        price: new Decimal("10.00"),
        product: { name: "Mango", isActive: true },
      },
    ]);

    await expect(
      createMarketplaceOrder({
        clientId: "client1",
        clientName: "María",
        input: {
          providerId: "prov1",
          fulfillmentType: "PICKUP",
          items: [{ providerProductId: "pp1", quantity: "1", unitOfMeasure: "PZA" }],
        },
        idempotencyKey: "11111111-1111-4111-8111-111111111111",
      })
    ).rejects.toBeInstanceOf(ProductUnavailableError);
  });

  it("rejects catalog products whose Product.isActive is false", async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);
    prismaMock.provider.findFirst.mockResolvedValue({
      id: "prov1",
      businessName: "Don Carlos",
      offersDelivery: false,
      preparationTimeMinutes: 20,
      latitude: 25.6714,
      longitude: -100.3089,
      user: { email: "c@test.com" },
    });
    prismaMock.user.findUnique.mockResolvedValue({ name: "María", phone: "811" });
    prismaMock.providerProduct.findMany.mockResolvedValue([
      {
        id: "pp1",
        providerId: "prov1",
        productId: "prod1",
        isAvailable: true,
        price: new Decimal("10.00"),
        product: { name: "Mango", isActive: false },
      },
    ]);

    await expect(
      createMarketplaceOrder({
        clientId: "client1",
        clientName: "María",
        input: {
          providerId: "prov1",
          fulfillmentType: "PICKUP",
          items: [{ providerProductId: "pp1", quantity: "1", unitOfMeasure: "PZA" }],
        },
        idempotencyKey: "11111111-1111-4111-8111-111111111111",
      })
    ).rejects.toBeInstanceOf(ProductUnavailableError);
  });
});

describe("createPosSale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects DELIVERED + UNPAID", async () => {
    prismaMock.provider.findUnique.mockResolvedValue({ id: "prov1", userId: "u2" });
    prismaMock.order.findUnique.mockResolvedValue(null);

    await expect(
      createPosSale({
        userId: "u2",
        idempotencyKey: "11111111-1111-4111-8111-111111111111",
        input: {
          paymentMethod: PaymentMethod.UNPAID,
          status: OrderStatus.DELIVERED,
          items: [
            {
              customItem: { name: "Piña miel", unitPrice: "35.00" },
              quantity: "2",
              unitOfMeasure: "PZA",
            },
          ],
        },
      })
    ).rejects.toBeInstanceOf(OrderValidationError);
  });

  it("creates a walk-in sale with clientId null and no catalog FKs on custom lines", async () => {
    prismaMock.provider.findUnique.mockResolvedValue({ id: "prov1", userId: "u2" });
    prismaMock.order.findUnique.mockResolvedValue(null);
    prismaMock.order.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "ord-pos",
      source: OrderSource.POS,
      status: data.status,
      paymentMethod: data.paymentMethod,
      paidAt: data.paidAt,
      providerId: "prov1",
      clientId: data.clientId,
      customerName: data.customerName,
      notes: null,
      total: data.total,
      createdAt: new Date("2026-08-13T18:05:00.000Z"),
      fulfillmentType: "PICKUP",
      etaMinutes: null,
      deliveryAddressSnapshot: null,
      items: (data.items as { create: unknown[] }).create,
      provider: { id: "prov1", businessName: "Don Carlos", userId: "u2" },
      client: null,
    }));

    const result = await createPosSale({
      userId: "u2",
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      input: {
        paymentMethod: PaymentMethod.CASH,
        status: OrderStatus.DELIVERED,
        customerName: null,
        items: [
          {
            customItem: { name: "Piña miel", unitPrice: "35.00" },
            quantity: "2",
            unitOfMeasure: "PZA",
          },
        ],
      },
    });

    expect(result.replay).toBe(false);
    expect(prismaMock.order.create).toHaveBeenCalled();
    const payload = prismaMock.order.create.mock.calls[0][0].data;
    expect(payload.clientId).toBeNull();
    expect(payload.source).toBe(OrderSource.POS);
    expect(payload.items.create[0].providerProductId).toBeNull();
    expect(payload.items.create[0].itemName).toBe("Piña miel");
    expect(includeShape).toBeTruthy();
  });

  it("rejects unavailable catalog lines and does not create the sale", async () => {
    prismaMock.provider.findUnique.mockResolvedValue({ id: "prov1", userId: "u2" });
    prismaMock.order.findUnique.mockResolvedValue(null);
    prismaMock.providerProduct.findMany.mockResolvedValue([
      {
        id: "pp1",
        providerId: "prov1",
        productId: "prod1",
        isAvailable: false,
        price: new Decimal("10.00"),
        product: { name: "Mango", isActive: true },
      },
    ]);

    await expect(
      createPosSale({
        userId: "u2",
        idempotencyKey: "11111111-1111-4111-8111-111111111111",
        input: {
          paymentMethod: PaymentMethod.CASH,
          status: OrderStatus.DELIVERED,
          items: [{ providerProductId: "pp1", quantity: "1", unitOfMeasure: "PZA" }],
        },
      })
    ).rejects.toBeInstanceOf(ProductUnavailableError);
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });
});

describe("createMarketplaceOrder Should delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.order.findUnique.mockResolvedValue(null);
    prismaMock.provider.findFirst.mockResolvedValue({
      id: "prov1",
      businessName: "Don Carlos",
      offersDelivery: false,
      preparationTimeMinutes: 20,
      latitude: 25.6714,
      longitude: -100.3089,
    });
    prismaMock.providerProduct.findMany.mockResolvedValue([
      {
        id: "pp1",
        providerId: "prov1",
        productId: "prod1",
        isAvailable: true,
        price: new Decimal("10.00"),
        product: { name: "Mango", isActive: true },
      },
    ]);
  });

  it("rejects DELIVERY when provider does not offer it", async () => {
    await expect(
      createMarketplaceOrder({
        clientId: "client1",
        clientName: "María",
        input: {
          providerId: "prov1",
          items: [{ providerProductId: "pp1", quantity: "1", unitOfMeasure: "PZA" }],
          fulfillmentType: "DELIVERY",
          deliveryAddressId: "addr1",
        },
        idempotencyKey: "11111111-1111-4111-8111-111111111111",
      })
    ).rejects.toBeInstanceOf(OrderValidationError);
  });

  it("returns 404-class error when delivery address is not owned", async () => {
    prismaMock.provider.findFirst.mockResolvedValue({
      id: "prov1",
      offersDelivery: true,
      preparationTimeMinutes: 20,
      latitude: 25.6714,
      longitude: -100.3089,
    });
    prismaMock.userAddress.findFirst.mockResolvedValue(null);

    const { AddressNotFoundError } = await import("@/lib/services/address.service");
    await expect(
      createMarketplaceOrder({
        clientId: "client1",
        clientName: "María",
        input: {
          providerId: "prov1",
          items: [{ providerProductId: "pp1", quantity: "1", unitOfMeasure: "PZA" }],
          fulfillmentType: "DELIVERY",
          deliveryAddressId: "addr-other",
        },
        idempotencyKey: "11111111-1111-4111-8111-111111111111",
      })
    ).rejects.toBeInstanceOf(AddressNotFoundError);
  });

  it("PICKUP ignores deliveryAddressId and snapshots eta from prep time", async () => {
    prismaMock.order.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "ord-pick",
      source: OrderSource.MARKETPLACE,
      status: OrderStatus.PENDING,
      paymentMethod: PaymentMethod.UNPAID,
      paidAt: null,
      providerId: "prov1",
      clientId: data.clientId,
      customerName: null,
      notes: null,
      total: data.total,
      createdAt: new Date("2026-08-14T18:00:00.000Z"),
      fulfillmentType: data.fulfillmentType,
      etaMinutes: data.etaMinutes,
      deliveryAddressSnapshot: data.deliveryAddressSnapshot,
      items: (data.items as { create: unknown[] }).create,
      provider: { id: "prov1", businessName: "Don Carlos", userId: "u2" },
      client: { id: "client1", name: "María", phone: "811" },
    }));

    const result = await createMarketplaceOrder({
      clientId: "client1",
      clientName: "María",
      input: {
        providerId: "prov1",
        items: [{ providerProductId: "pp1", quantity: "1", unitOfMeasure: "PZA" }],
        fulfillmentType: "PICKUP",
        deliveryAddressId: "addr1",
      },
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
    });

    expect(result.replay).toBe(false);
    const payload = prismaMock.order.create.mock.calls[0][0].data;
    expect(payload.fulfillmentType).toBe("PICKUP");
    expect(payload.deliveryAddressId).toBeNull();
    expect(payload.etaMinutes).toBe(20);
    expect(prismaMock.userAddress.findFirst).not.toHaveBeenCalled();
    expect(result.order.fulfillmentType).toBe("PICKUP");
  });

  it("DELIVERY persists address snapshot and etaMinutes", async () => {
    prismaMock.provider.findFirst.mockResolvedValue({
      id: "prov1",
      offersDelivery: true,
      preparationTimeMinutes: 20,
      latitude: 25.6714,
      longitude: -100.3089,
    });
    prismaMock.userAddress.findFirst.mockResolvedValue({
      id: "addr1",
      userId: "client1",
      label: "Casa",
      formattedAddress: "Av. Juárez 123",
      lat: 25.6714,
      lng: -100.3089,
    });
    prismaMock.order.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "ord-del",
      source: OrderSource.MARKETPLACE,
      status: OrderStatus.PENDING,
      paymentMethod: PaymentMethod.UNPAID,
      paidAt: null,
      providerId: "prov1",
      clientId: data.clientId,
      customerName: null,
      notes: null,
      total: data.total,
      createdAt: new Date("2026-08-14T18:00:00.000Z"),
      fulfillmentType: data.fulfillmentType,
      etaMinutes: data.etaMinutes,
      deliveryAddressSnapshot: data.deliveryAddressSnapshot,
      items: (data.items as { create: unknown[] }).create,
      provider: { id: "prov1", businessName: "Don Carlos", userId: "u2" },
      client: { id: "client1", name: "María", phone: "811" },
    }));

    const result = await createMarketplaceOrder({
      clientId: "client1",
      clientName: "María",
      input: {
        providerId: "prov1",
        items: [{ providerProductId: "pp1", quantity: "1", unitOfMeasure: "PZA" }],
        fulfillmentType: "DELIVERY",
        deliveryAddressId: "addr1",
      },
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
    });

    const payload = prismaMock.order.create.mock.calls[0][0].data;
    expect(payload.fulfillmentType).toBe("DELIVERY");
    expect(payload.deliveryAddressId).toBe("addr1");
    expect(payload.deliveryAddressSnapshot).toEqual({
      label: "Casa",
      formattedAddress: "Av. Juárez 123",
      lat: 25.6714,
      lng: -100.3089,
    });
    expect(payload.etaMinutes).toBe(20);
    expect(result.order.fulfillmentType).toBe("DELIVERY");
    expect(result.order.etaMinutes).toBe(20);
  });
});

describe("transitionStatus Should notify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not fail the transition when Inngest send rejects", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: "ord1",
      source: OrderSource.MARKETPLACE,
      status: OrderStatus.CONFIRMED,
      paymentMethod: PaymentMethod.UNPAID,
      paidAt: null,
      providerId: "prov1",
      clientId: "client1",
      customerName: null,
      notes: null,
      total: new Decimal("10.00"),
      createdAt: new Date(),
      fulfillmentType: "PICKUP",
      etaMinutes: 20,
      deliveryAddressSnapshot: null,
      items: [],
      provider: { id: "prov1", businessName: "Don Carlos", userId: "u2" },
      client: { id: "client1", name: "María", phone: "811" },
    });
    prismaMock.order.update.mockResolvedValue({
      id: "ord1",
      source: OrderSource.MARKETPLACE,
      status: OrderStatus.IN_TRANSIT,
      paymentMethod: PaymentMethod.UNPAID,
      paidAt: null,
      providerId: "prov1",
      clientId: "client1",
      customerName: null,
      notes: null,
      total: new Decimal("10.00"),
      createdAt: new Date(),
      fulfillmentType: "PICKUP",
      etaMinutes: 20,
      deliveryAddressSnapshot: null,
      items: [],
      provider: { id: "prov1", businessName: "Don Carlos", userId: "u2" },
      client: { id: "client1", name: "María", phone: "811" },
    });
    vi.mocked(inngest.send).mockRejectedValueOnce(new Error("down"));

    const result = await transitionStatus({
      orderId: "ord1",
      nextStatus: OrderStatus.IN_TRANSIT,
      session: { sub: "u2", role: UserRole.PROVIDER },
    });
    expect(result.status).toBe(OrderStatus.IN_TRANSIT);
    expect(prismaMock.order.update).toHaveBeenCalled();
  });
});
