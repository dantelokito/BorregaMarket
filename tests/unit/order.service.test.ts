import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderSource, OrderStatus, PaymentMethod } from "@prisma/client";
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
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

import { createMarketplaceOrder } from "@/lib/services/order.service";
import { createPosSale } from "@/lib/services/pos.service";
import { ProductUnavailableError } from "@/lib/orders/errors";
import { OrderValidationError } from "@/lib/orders/errors";

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
        items: [{ providerProductId: "pp1", quantity: "2", unitOfMeasure: "PZA" }],
      },
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
    });

    expect(result.replay).toBe(true);
    expect(result.emailJob).toBeNull();
    expect(prismaMock.order.create).not.toHaveBeenCalled();
    expect(result.order.total).toBe("85.50");
  });

  it("rejects unavailable catalog products with 409-class error", async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);
    prismaMock.provider.findFirst.mockResolvedValue({
      id: "prov1",
      businessName: "Don Carlos",
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
});
