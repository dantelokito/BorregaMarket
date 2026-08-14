import prisma from "@/lib/prisma";
import type { CreateAddressInput, PatchAddressInput } from "@/lib/validators/address";

const MAX_ADDRESSES = 20;

export class AddressNotFoundError extends Error {
  constructor(message = "Dirección no encontrada") {
    super(message);
    this.name = "AddressNotFoundError";
  }
}

export class AddressLimitError extends Error {
  constructor(message = "Límite de 20 direcciones alcanzado") {
    super(message);
    this.name = "AddressLimitError";
  }
}

function serializeAddress(address: {
  id: string;
  label: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  isFavorite: boolean;
  isDefault: boolean;
  createdAt: Date;
}) {
  return {
    id: address.id,
    label: address.label,
    formattedAddress: address.formattedAddress,
    lat: address.lat,
    lng: address.lng,
    isFavorite: address.isFavorite,
    isDefault: address.isDefault,
    createdAt: address.createdAt.toISOString(),
  };
}

export async function listAddresses(userId: string) {
  const addresses = await prisma.userAddress.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { isFavorite: "desc" }, { createdAt: "desc" }],
  });
  return addresses.map(serializeAddress);
}

export async function createAddress(userId: string, input: CreateAddressInput) {
  const count = await prisma.userAddress.count({ where: { userId } });
  if (count >= MAX_ADDRESSES) {
    throw new AddressLimitError();
  }

  const created = await prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return tx.userAddress.create({
      data: {
        userId,
        label: input.label,
        formattedAddress: input.formattedAddress,
        lat: input.lat,
        lng: input.lng,
        isFavorite: input.isFavorite,
        isDefault: input.isDefault,
      },
    });
  });

  return serializeAddress(created);
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: PatchAddressInput
) {
  const existing = await prisma.userAddress.findFirst({
    where: { id: addressId, userId },
  });
  if (!existing) {
    throw new AddressNotFoundError();
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (input.isDefault === true) {
      await tx.userAddress.updateMany({
        where: { userId, id: { not: addressId } },
        data: { isDefault: false },
      });
    }
    return tx.userAddress.update({
      where: { id: addressId },
      data: {
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.formattedAddress !== undefined
          ? { formattedAddress: input.formattedAddress }
          : {}),
        ...(input.lat !== undefined ? { lat: input.lat } : {}),
        ...(input.lng !== undefined ? { lng: input.lng } : {}),
        ...(input.isFavorite !== undefined ? { isFavorite: input.isFavorite } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      },
    });
  });

  return serializeAddress(updated);
}

export async function deleteAddress(userId: string, addressId: string) {
  const existing = await prisma.userAddress.findFirst({
    where: { id: addressId, userId },
  });
  if (!existing) {
    throw new AddressNotFoundError();
  }
  await prisma.userAddress.delete({ where: { id: addressId } });
  return { id: addressId, deleted: true };
}
