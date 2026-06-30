/**
 * Seeds a starting set of departments so a fresh install isn't a blank
 * slate. Safe to re-run — uses upsert, and only flags the GM office if
 * none exists yet (won't override an Admin's later choice).
 *
 * Usage: npx tsx prisma/seed.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEPARTMENTS = [
  { name: "General Manager's Office", code: "GM", isGmOffice: true },
  { name: "Finance Department", code: "FIN" },
  { name: "Human Resources", code: "HR" },
  { name: "IT Department", code: "IT" },
  { name: "Legal Office", code: "LEGAL" },
  { name: "Procurement", code: "PROC" },
];

async function main() {
  const existingGm = await prisma.department.findFirst({ where: { isGmOffice: true } });

  for (const dept of DEPARTMENTS) {
    const shouldFlagGm = dept.isGmOffice && !existingGm;
    await prisma.department.upsert({
      where: { code: dept.code },
      update: {},
      create: { name: dept.name, code: dept.code, isGmOffice: !!shouldFlagGm },
    });
  }

  console.log("Seeded departments. Create your first Admin user per the README, then add staff via Admin → Users.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
