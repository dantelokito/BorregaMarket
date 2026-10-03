import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const count = await prisma.user.count();
  console.log(`USER_COUNT=${count}`);
  await prisma.$disconnect();
}

main();
