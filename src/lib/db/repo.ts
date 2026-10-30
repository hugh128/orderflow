import type { z } from "zod";
import { and, eq } from "drizzle-orm";
import { advance, reject } from "../domain/package-status";
import type { PackageStatus } from "../domain/types";
import type { createOrderSchema } from "../schemas/order";
import { splitIntoPackages } from "../domain/split-into-packages";
import { db } from "./client";
import { DuplicateOrderNumberError, isUniqueViolation, NotFoundError, StatusConflictError } from "./errors";
import { orders, packages } from "./schema";

export async function createOrderWithPackages(input: z.output<typeof createOrderSchema>) {
  try {
    return await db.transaction(async (tx) => {
      const [order] = await tx.insert(orders).values({
        number: input.number,
        customer: input.customer,
        totalUnits: input.units,
      }).returning();

      const insertedPackages = await tx.insert(packages).values(
        splitIntoPackages(input.units).map((units, index) => ({
          orderId: order.id,
          sequence: index + 1,
          units,
        })),
      ).returning();

      return { order, packages: insertedPackages.sort((a, b) => a.sequence - b.sequence) };
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateOrderNumberError();
    throw error;
  }
}

export async function transitionPackage(
  id: string,
  expected: PackageStatus,
  kind: "advance" | "reject",
) {
  const status = kind === "advance" ? advance(expected) : reject(expected);
  const [updated] = await db.update(packages)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(packages.id, id), eq(packages.status, expected)))
    .returning();
  if (updated) return updated;

  const [current] = await db.select({ status: packages.status }).from(packages)
    .where(eq(packages.id, id)).limit(1);
  if (!current) throw new NotFoundError();
  throw new StatusConflictError(current.status);
}
