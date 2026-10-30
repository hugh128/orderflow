import type { z } from "zod";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { computeProgress } from "../domain/compute-progress";
import { advance, reject } from "../domain/package-status";
import type { PackageStatus } from "../domain/types";
import type { createOrderSchema } from "../schemas/order";
import { splitIntoPackages } from "../domain/split-into-packages";
import { getDb } from "./client";
import { DuplicateOrderNumberError, isUniqueViolation, NotFoundError, StatusConflictError } from "./errors";
import { orders, packages, packageEvents } from "./schema";
import { rejectionReasonSchema } from "../schemas/rejection";

export async function createOrderWithPackages(input: z.output<typeof createOrderSchema>) {
  const db = getDb();
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
  reason?: string,
) {
  const status = kind === "advance" ? advance(expected) : reject(expected);
  const validatedReason = kind === "reject" ? rejectionReasonSchema.parse(reason) : null;
  const db = getDb();
  return db.transaction(async (tx) => {
    const [updated] = await tx.update(packages)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(packages.id, id), eq(packages.status, expected)))
      .returning();
    if (updated) {
      await tx.insert(packageEvents).values({ packageId: id, fromStatus: expected, toStatus: updated.status, kind, reason: validatedReason });
      return updated;
    }

    const [current] = await tx.select({ status: packages.status }).from(packages)
      .where(eq(packages.id, id)).limit(1);
    if (!current) throw new NotFoundError();
    throw new StatusConflictError(current.status);
  });
}

export async function listOrders() {
  const db = getDb();
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt), desc(orders.id));
  if (rows.length === 0) return [];

  const allPackages = await db.select().from(packages)
    .where(inArray(packages.orderId, rows.map((order) => order.id)));
  const grouped = new Map<string, (typeof packages.$inferSelect)[]>();
  for (const pkg of allPackages) {
    const group = grouped.get(pkg.orderId);
    if (group) group.push(pkg);
    else grouped.set(pkg.orderId, [pkg]);
  }
  return rows.map((order) => ({ ...order, summary: computeProgress(grouped.get(order.id) ?? []) }));
}

export async function getOrder(id: string) {
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return null;
  const orderedPackages = await db.select().from(packages)
    .where(eq(packages.orderId, id)).orderBy(asc(packages.sequence));
  return { ...order, packages: orderedPackages, summary: computeProgress(orderedPackages) };
}

export async function getPackageHistory(id: string) {
  const db = getDb();
  const [pkg] = await db.select({ id: packages.id }).from(packages).where(eq(packages.id, id)).limit(1);
  if (!pkg) throw new NotFoundError();
  return (await db.select().from(packageEvents).where(eq(packageEvents.packageId, id))
    .orderBy(desc(packageEvents.id)).limit(50)).reverse();
}

export async function getOrderHistorySnapshot(id: string) {
  return getDb().transaction(
    async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);
      if (!order) return null;
      const rows = await tx
        .select()
        .from(packages)
        .where(eq(packages.orderId, id));
      const events = (
        await tx
          .select({ event: packageEvents, sequence: packages.sequence })
          .from(packageEvents)
          .innerJoin(packages, eq(packages.id, packageEvents.packageId))
          .where(eq(packages.orderId, id))
          .orderBy(desc(packageEvents.id))
          .limit(50)
      ).reverse();
      return {
        order: { ...order, summary: computeProgress(rows) },
        events,
        observedAt: new Date().toISOString(),
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
