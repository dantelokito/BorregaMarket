import prisma from "@/lib/prisma";

export async function findOwnedProvider(userId: string, providerId?: string | null) {
  if (providerId) {
    return prisma.provider.findFirst({
      where: { id: providerId, userId },
    });
  }
  return prisma.provider.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function listOwnedProviders(userId: string) {
  return prisma.provider.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}
