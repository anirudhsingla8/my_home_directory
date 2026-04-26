/**
 * Location Dedup Script
 *
 * Collapses case-insensitive duplicate locations per user before the
 * @@unique([userId, name]) constraint is applied. For each (userId, lower(name))
 * group, the oldest row survives; items pointing at duplicates are repointed,
 * then the duplicate rows are deleted.
 *
 * Run BEFORE `npx prisma db push` or `npx prisma migrate dev` after the schema
 * change. Idempotent — safe to run multiple times.
 *
 * Usage:
 *   npx tsx scripts/dedupe-locations.ts
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
  const prisma = createPrismaClient();

  try {
    const locations = await prisma.location.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, userId: true }
    });

    const groups = new Map<string, { keepId: string; duplicateIds: string[] }>();

    for (const loc of locations) {
      const key = `${loc.userId}::${loc.name.trim().toLowerCase()}`;
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, { keepId: loc.id, duplicateIds: [] });
      } else {
        existing.duplicateIds.push(loc.id);
      }
    }

    let mergedGroups = 0;
    let repointedItems = 0;
    let deletedLocations = 0;

    for (const { keepId, duplicateIds } of groups.values()) {
      if (duplicateIds.length === 0) continue;

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.item.updateMany({
          where: { locationId: { in: duplicateIds } },
          data: { locationId: keepId }
        });
        const deleted = await tx.location.deleteMany({
          where: { id: { in: duplicateIds } }
        });
        return { updated: updated.count, deleted: deleted.count };
      });

      mergedGroups += 1;
      repointedItems += result.updated;
      deletedLocations += result.deleted;
    }

    console.log(`✅ Dedup complete.`);
    console.log(`   Merged groups:     ${mergedGroups}`);
    console.log(`   Repointed items:   ${repointedItems}`);
    console.log(`   Deleted locations: ${deletedLocations}`);
  } catch (error) {
    console.error("❌ Dedup failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

void main();
