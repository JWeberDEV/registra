import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Create SQL connection only if DATABASE_URL is available
let client: any = null;
let db: any = null;

if (process.env.DATABASE_URL) {
  client = postgres(process.env.DATABASE_URL);
  db = drizzle(client);
}

// Initialize Drizzle ORM
export { db };

// Export a function to initialize the database connection
export function initializeDatabase(databaseUrl: string) {
  if (client) {
    client.end();
  }
  client = postgres(databaseUrl);
  db = drizzle(client);
  return db;
}
