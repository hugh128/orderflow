import type { z } from "zod";
import type { createOrderSchema } from "../schemas/order";
import { splitIntoPackages } from "../domain/split-into-packages";
import { db } from "./client";
import { DuplicateOrderNumberError, isUniqueViolation } from "./errors";
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
