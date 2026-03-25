import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Error: ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required");
  console.log(
    "\nUsage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='change-me' bun run --filter @product-os/api db:seed-admin"
  );
  process.exit(1);
}

async function seedAdmin() {
  console.log("Seeding admin user...");

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // Check if user exists
  const [existing] = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL));

  if (existing) {
    // Update existing user to admin with password
    await db
      .update(users)
      .set({ passwordHash, isAdmin: 1, role: "admin" })
      .where(eq(users.email, ADMIN_EMAIL));
    console.log(`Updated existing user ${ADMIN_EMAIL} to admin`);
  } else {
    // Create new admin user
    await db.insert(users).values({
      email: ADMIN_EMAIL,
      passwordHash,
      isAdmin: 1,
      role: "admin",
    });
    console.log(`Created admin user ${ADMIN_EMAIL}`);
  }

  console.log("Done!");
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Error seeding admin:", err);
  process.exit(1);
});
