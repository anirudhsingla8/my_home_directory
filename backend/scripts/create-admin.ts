/**
 * Admin Promotion Script
 *
 * Promotes an existing user to the ADMIN role.
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts <user-email>
 *
 * Example:
 *   npx tsx scripts/create-admin.ts admin@example.com
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const createPrismaClient = (): PrismaClient => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

const main = async () => {
  const email = process.argv[2];

  if (!email) {
    console.error("❌ Usage: npx tsx scripts/create-admin.ts <user-email>");
    console.error("   Example: npx tsx scripts/create-admin.ts admin@example.com");
    process.exit(1);
  }

  const prisma = createPrismaClient();

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true }
    });

    if (!user) {
      console.error(`❌ No user found with email: ${email}`);
      process.exit(1);
    }

    if (user.role === "ADMIN") {
      console.log(`ℹ️  ${user.name ?? user.email} is already an ADMIN.`);
      process.exit(0);
    }

    await prisma.user.update({
      where: { email },
      data: { role: "ADMIN" }
    });

    console.log(`✅ ${user.name ?? user.email} (${user.email}) has been promoted to ADMIN.`);
  } catch (error) {
    console.error("❌ Failed to promote user:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

void main();
