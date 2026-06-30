import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Prisma CLI (migrate, db push, generate) needs a direct connection,
  // not the pgbouncer pooler — so this uses DIRECT_URL, while the app's
  // runtime PrismaClient (src/lib/prisma.ts) uses DATABASE_URL (pooled).
  //
  // `prisma generate` (run during `npm install`/`npm run build`) doesn't
  // actually need a live DB connection, but Prisma's typed env() helper
  // still throws if the variable is unset — so we read process.env
  // directly with a fallback to avoid breaking builds where only
  // DATABASE_URL is configured (or neither is set yet).
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "postgresql://localhost:5432/placeholder",
  },
});
