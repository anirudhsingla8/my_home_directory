import type { PrismaClient, Prisma } from "@prisma/client";

export interface CategoryDefinition {
  name: string;
  children?: CategoryDefinition[];
}

/**
 * Default category tree seeded for every new user on signup. Also re-used by
 * the standalone `prisma/seed.ts` CLI for back-filling existing users.
 */
export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  {
    name: "Grocery & Daily Needs",
    children: [
      { name: "Fresh Fruits & Vegetables" },
      { name: "Atta, Rice & Dal" },
      { name: "Oil, Ghee & Masalas" },
      { name: "Dairy, Bread & Eggs" },
      { name: "Snacks & Biscuits" },
      { name: "Tea, Coffee & Beverages" }
    ]
  },
  {
    name: "Home Care & Cleaning",
    children: [
      { name: "Detergents & Dishwash" },
      { name: "Floor & Toilet Cleaners" },
      { name: "Fresheners & Repellents" },
      { name: "Pooja Needs" }
    ]
  },
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
      { name: "Large Appliances" },
      { name: "Kitchen Appliances" },
      { name: "Fans, Coolers & Heaters" },
      { name: "Bulbs, Batteries & Electricals" }
    ]
  },
  {
    name: "Kitchen & Dining",
    children: [
      { name: "Utensils & Cookware" },
      { name: "Storage Containers" },
      { name: "Bottles & Flasks" }
    ]
  },
  {
    name: "Home & Furniture",
    children: [
      { name: "Furniture" },
      { name: "Bedsheets & Curtains" },
      { name: "Tools & Hardware" }
    ]
  },
  {
    name: "Beauty & Personal Care",
    children: [
      { name: "Skincare & Face" },
      { name: "Bath, Body & Hair" },
      { name: "Men's Grooming" },
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

type CategoryClient = Pick<PrismaClient, "category"> | Prisma.TransactionClient;

/**
 * Idempotently seed the global category tree (categories shared across all
 * users — `userId` is `null`). Returns the number of newly-created rows.
 *
 * Re-running this is safe: existing global categories are detected by
 * (name, parentCategoryId) and reused.
 */
export const seedGlobalCategories = async (
  db: CategoryClient,
  categories: CategoryDefinition[] = DEFAULT_CATEGORIES,
  parentCategoryId: string | null = null
): Promise<number> => {
  let created = 0;

  for (const category of categories) {
    const existing = await db.category.findFirst({
      where: { userId: null, name: category.name, parentCategoryId },
      select: { id: true }
    });

    let id: string;
    if (existing) {
      id = existing.id;
    } else {
      const row = await db.category.create({
        data: { name: category.name, userId: null, parentCategoryId },
        select: { id: true }
      });
      id = row.id;
      created++;
    }

    if (category.children?.length) {
      created += await seedGlobalCategories(db, category.children, id);
    }
  }

  return created;
};
