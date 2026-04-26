/**
 * Category Seed Script
 *
 * Populates default household categories (with subcategories) for a given user.
 * Idempotent — skips categories that already exist at the same hierarchy level.
 *
 * Usage:
 *   npx tsx prisma/seed.ts <user-email>
 *
 * Example:
 *   npx tsx prisma/seed.ts admin@example.com
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

interface CategoryDefinition {
  name: string;
  children?: CategoryDefinition[];
}

const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  // 🍎 High-Frequency Consumables
  {
    name: "Grocery & Daily Needs",
    children: [
      { name: "Fresh Fruits & Vegetables" }, // Tracked in kg/grams or pieces
      { name: "Atta, Rice & Dal" },
      { name: "Oil, Ghee & Masalas" },
      { name: "Dairy, Bread & Eggs" }, // Milk, paneer, butter
      { name: "Snacks & Biscuits" },
      { name: "Tea, Coffee & Beverages" }
    ]
  },
  {
    name: "Home Care & Cleaning",
    children: [
      { name: "Detergents & Dishwash" }, // Surf Excel, Vim
      { name: "Floor & Toilet Cleaners" }, // Harpic, Lizol
      { name: "Fresheners & Repellents" }, // Odonil, All Out
      { name: "Pooja Needs" } // Agarbatti, camphor (very common Indian category)
    ]
  },

  // 📺 Electronics & Appliances (Discrete Unit Tracking: 1, 2, 3...)
  {
    name: "Mobiles & Computers",
    children: [
      { name: "Mobiles & Tablets" },
      { name: "Laptops & Accessories" },
      { name: "Cables & Chargers" },
      { name: "Audio & Smartwatches" }
    ]
  },
  {
    name: "TV & Home Appliances",
    children: [
      { name: "Large Appliances" }, // TV, Fridge, Washing Machine, AC
      { name: "Kitchen Appliances" }, // Mixer Grinder, Microwave, Air Fryer
      { name: "Fans, Coolers & Heaters" },
      { name: "Bulbs, Batteries & Electricals" }
    ]
  },

  // 🛋️ Household Items & Gear
  {
    name: "Kitchen & Dining",
    children: [
      { name: "Utensils & Cookware" }, // Pressure cookers, kadhais
      { name: "Storage Containers" }, // Dabbas, glass jars
      { name: "Bottles & Flasks" }
    ]
  },
  {
    name: "Home & Furniture",
    children: [
      { name: "Furniture" }, // Beds, sofas, chairs
      { name: "Bedsheets & Curtains" },
      { name: "Tools & Hardware" } // Screwdrivers, drills, nails
    ]
  },

  // 🧴 Personal, Health & Clothing
  {
    name: "Beauty & Personal Care",
    children: [
      { name: "Skincare & Face" },
      { name: "Bath, Body & Hair" }, // Shampoos, soaps, oils
      { name: "Men's Grooming" }, // Trimmers, shaving foam
      { name: "Makeup & Cosmetics" }
    ]
  },
  {
    name: "Health & Medicines",
    children: [
      { name: "First Aid & Bandages" },
      { name: "Daily Medicines" },
      { name: "Vitamins & Supplements" }
    ]
  },
  {
    name: "Clothing & Fashion",
    children: [
      { name: "Everyday Wear" },
      { name: "Innerwear & Sleepwear" },
      { name: "Shoes & Footwear" }
    ]
  },

  // 🎒 Travel & Pets
  {
    name: "Bags & Travel",
    children: [
      { name: "Luggage & Backpacks" },
      { name: "Travel Accessories" },
      { name: "Tickets & Documents" }
    ]
  },
  {
    name: "Dog & Pet Care",
    children: [
      { name: "Pet Food & Treats" },
      { name: "Pet Medicines & Care" },
      { name: "Collars, Bowls & Toys" }
    ]
  }
];

const createPrismaClient = (): PrismaClient => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

const seedCategories = async (
  prisma: PrismaClient,
  userId: string,
  categories: CategoryDefinition[],
  parentCategoryId: string | null = null,
  depth = 0
): Promise<number> => {
  let created = 0;
  const indent = "  ".repeat(depth);

  for (const category of categories) {
    // Check if category already exists at this level
    const existing = await prisma.category.findFirst({
      where: {
        userId,
        name: category.name,
        parentCategoryId
      }
    });

    let categoryId: string;

    if (existing) {
      console.log(`${indent}⏩ Skipping "${category.name}" (already exists)`);
      categoryId = existing.id;
    } else {
      const newCategory = await prisma.category.create({
        data: {
          name: category.name,
          userId,
          parentCategoryId
        }
      });
      console.log(`${indent}✅ Created "${category.name}"`);
      categoryId = newCategory.id;
      created++;
    }

    // Recursively seed children
    if (category.children && category.children.length > 0) {
      created += await seedCategories(prisma, userId, category.children, categoryId, depth + 1);
    }
  }

  return created;
};

const main = async () => {
  const email = process.argv[2];

  if (!email) {
    console.error("❌ Usage: npx tsx prisma/seed.ts <user-email>");
    console.error("   Example: npx tsx prisma/seed.ts admin@example.com");
    process.exit(1);
  }

  const prisma = createPrismaClient();

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      console.error(`❌ No user found with email: ${email}`);
      process.exit(1);
    }

    console.log(`\n🌱 Seeding categories for ${user.name ?? user.email} (${user.id})...\n`);

    const totalCreated = await seedCategories(prisma, user.id, DEFAULT_CATEGORIES);

    console.log(`\n✅ Done! ${totalCreated} categories created.\n`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

void main();
