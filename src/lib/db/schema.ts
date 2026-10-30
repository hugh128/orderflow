import { sql } from "drizzle-orm";
import { check, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { PACKAGE_STATUSES } from "../domain/types";

export const packageStatus = pgEnum("package_status", PACKAGE_STATUSES);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: text("number").notNull(),
  customer: text("customer").notNull(),
  totalUnits: integer("total_units").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("orders_number_unique_ci").on(sql`lower(btrim(${table.number}))`),
  check("orders_number_len", sql`length(btrim(${table.number})) BETWEEN 1 AND 30`),
  check("orders_customer_len", sql`length(btrim(${table.customer})) BETWEEN 1 AND 100`),
  check("orders_total_units_range", sql`${table.totalUnits} BETWEEN 1 AND 100000`),
]).enableRLS();

export const packages = pgTable("packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  sequence: integer("sequence").notNull(),
  units: integer("units").notNull(),
  status: packageStatus("status").notNull().default("pending"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("packages_order_sequence_unique").on(table.orderId, table.sequence),
  index("packages_order_id_idx").on(table.orderId),
  check("packages_units_range", sql`${table.units} BETWEEN 1 AND 100`),
  check("packages_sequence_positive", sql`${table.sequence} >= 1`),
]).enableRLS();
