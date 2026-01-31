import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

console.log("Initializing database connection...");
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("ERROR: DATABASE_URL is not set!");
  process.exit(1);
}

console.log("DATABASE_URL is set, connecting...");
const client = postgres(connectionString);

export const db = drizzle(client, { schema });
console.log("Database connection initialized");
export { schema };
