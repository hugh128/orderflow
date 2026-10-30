import { describe, expect, it } from "vitest";
import { computeProgress } from "@/lib/domain/compute-progress";
import type { PackageStatus } from "@/lib/domain/types";

describe("computeProgress", () => {
  it("CA-22: 100 unidades listas de 250 representan 40 %", () => {
    expect(
      computeProgress([
        { units: 100, status: "done" },
        { units: 100, status: "in_progress" },
        { units: 50, status: "review" },
      ]),
    ).toEqual({
      counts: { pending: 0, in_progress: 1, review: 1, done: 1 },
      totalPackages: 3,
      totalUnits: 250,
      doneUnits: 100,
      percent: 40,
    });
  });

  it("CA-23: solo el paquete de 50 listo representa 20 %, no 33 %", () => {
    const summary = computeProgress([
      { units: 100, status: "pending" },
      { units: 100, status: "pending" },
      { units: 50, status: "done" },
    ]);
    expect(summary.percent).toBe(20);
    expect(summary.doneUnits).toBe(50);
  });

  it("CA-24: todos los paquetes listos representan 100 %", () => {
    expect(
      computeProgress([
        { units: 100, status: "done" },
        { units: 100, status: "done" },
        { units: 50, status: "done" },
      ]),
    ).toEqual({
      counts: { pending: 0, in_progress: 0, review: 0, done: 3 },
      totalPackages: 3,
      totalUnits: 250,
      doneUnits: 250,
      percent: 100,
    });
  });

  it("CA-25: sin paquetes listos da 0 % y los contadores suman el total", () => {
    const summary = computeProgress([
      { units: 100, status: "pending" },
      { units: 100, status: "in_progress" },
      { units: 50, status: "review" },
    ]);
    expect(summary).toEqual({
      counts: { pending: 1, in_progress: 1, review: 1, done: 0 },
      totalPackages: 3,
      totalUnits: 250,
      doneUnits: 0,
      percent: 0,
    });
    expect(Object.values(summary.counts).reduce((sum, count) => sum + count, 0))
      .toBe(summary.totalPackages);
  });

  it("CA-26: 100 unidades listas de 300 se truncan a 33 %", () => {
    expect(
      computeProgress([
        { units: 100, status: "done" },
        { units: 100, status: "pending" },
        { units: 100, status: "pending" },
      ]).percent,
    ).toBe(33);
  });

  it("CA-24: 99 999 unidades listas de 100 000 dan 99 %, nunca 100 %", () => {
    const packages: { units: number; status: PackageStatus }[] = Array.from(
      { length: 999 },
      () => ({ units: 100, status: "done" }),
    );
    packages.push({ units: 99, status: "done" }, { units: 1, status: "pending" });
    const summary = computeProgress(packages);
    expect(summary.totalUnits).toBe(100_000);
    expect(summary.doneUnits).toBe(99_999);
    expect(summary.percent).toBe(99);
  });

  it("CA-25: una lista vacía da 0 y conserva los cuatro contadores", () => {
    expect(computeProgress([])).toEqual({
      counts: { pending: 0, in_progress: 0, review: 0, done: 0 },
      totalPackages: 0,
      totalUnits: 0,
      doneUnits: 0,
      percent: 0,
    });
  });
});
