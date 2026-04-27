/**
 * Category Seed Script
 *
 * Populates the global category tree (shared across all users). Idempotent —
 * safe to re-run; existing categories are detected by (name, parentCategoryId)
 * and reused. Admin can also trigger this via POST /api/categories/seed-defaults.
 *
 * Usage:
 *   npx tsx prisma/seed.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { seedGlobalCategories } from "../src/lib/defaultCategories";

const createPrismaClient = (): PrismaClient => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

const main = async () => {
  const prisma = createPrismaClient();

  try {
    console.log("Seeding global categories...");
    const totalCreated = await seedGlobalCategories(prisma);
    console.log(`Done. ${totalCreated} categories created.`);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

void main();
