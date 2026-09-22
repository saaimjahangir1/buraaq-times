import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import slugify from "slugify";

const prisma = new PrismaClient();

const CATEGORIES = [
  "Politics", "Technology", "Business", "Sports", "Health",
  "Education", "Science", "International", "Entertainment", "Local",
];

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@buraaqtimes.example";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

async function main() {
  const existingAdmin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await prisma.user.create({
      data: {
        name: "Site Admin",
        email: ADMIN_EMAIL,
        passwordHash,
        role: "ADMIN",
        status: "APPROVED",
        emailVerified: true,
        bio: "Editorial administrator.",
      },
    });
    console.log(`Created admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } else {
    console.log("Admin already exists, skipping.");
  }

  for (const name of CATEGORIES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, slug: slugify(name, { lower: true, strict: true }) },
    });
  }
  console.log(`Seeded ${CATEGORIES.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
