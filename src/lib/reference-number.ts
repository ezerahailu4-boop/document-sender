import { prisma } from "@/lib/prisma";

const INSTITUTION_CODE = process.env.NEXT_PUBLIC_INSTITUTION_CODE || "TAF";

/**
 * Generates the next sequential reference number for the given year, e.g.
 * "TAF/IN/2026/001". Institution-wide sequence (not per-department) —
 * matches the original spec's single running counter per year.
 *
 * Concurrency safety: a single atomic SQL UPDATE ... RETURNING increments
 * the counter. Postgres serializes concurrent UPDATEs to the same row via
 * row-level locking, so two simultaneous registrations can never receive
 * the same number, even without an explicit application-level lock.
 *
 * The sequence row is created lazily (first document of the year) inside
 * the same transaction, using an upsert with ON CONFLICT DO NOTHING.
 */
export async function generateReferenceNumber(year: number = new Date().getFullYear()): Promise<string> {
  const nextValue = await prisma.$transaction(async (tx) => {
    // Ensure the row exists (no-op if it already does).
    await tx.$executeRaw`
      INSERT INTO reference_sequences (id, year, "departmentId", "lastValue")
      VALUES (gen_random_uuid()::text, ${year}, NULL, 0)
      ON CONFLICT (year, "departmentId") DO NOTHING
    `;

    // Atomic increment + return new value in one statement.
    const rows = await tx.$queryRaw<{ lastValue: number }[]>`
      UPDATE reference_sequences
      SET "lastValue" = "lastValue" + 1
      WHERE year = ${year} AND "departmentId" IS NULL
      RETURNING "lastValue"
    `;

    return rows[0].lastValue;
  });

  const padded = String(nextValue).padStart(3, "0");
  return `${INSTITUTION_CODE}/IN/${year}/${padded}`;
}
