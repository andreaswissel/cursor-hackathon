import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: bun src/scripts/add-admin.ts <email> <password>");
  process.exit(1);
}

async function addAdmin() {
  console.log(`Adding admin user: ${email}`);

  const passwordHash = await bcrypt.hash(password, 10);

  // Check if user exists
  const [existing] = await db.select().from(users).where(eq(users.email, email));

  if (existing) {
    // Update existing user to admin with password
    await db
      .update(users)
      .set({ passwordHash, isAdmin: 1, role: "admin" })
      .where(eq(users.email, email));
    console.log(`Updated existing user ${email} to admin`);
  } else {
    // Create new admin user
    await db.insert(users).values({
      email,
      passwordHash,
      isAdmin: 1,
      role: "admin",
    });
    console.log(`Created admin user ${email}`);
  }

  console.log("Done!");
  process.exit(0);
}

addAdmin().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
