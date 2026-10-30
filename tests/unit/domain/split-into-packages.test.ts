import { describe, expect, it } from "vitest";
import { splitIntoPackages } from "@/lib/domain/split-into-packages";

describe("splitIntoPackages", () => {
  it.each([
    ["CA-01", 250, [100, 100, 50]],
    ["CA-02", 100, [100]],
    ["CA-03", 101, [100, 1]],
    ["CA-04", 1, [1]],
    ["CA-05", 200, [100, 100]],
  ] as const)("%s: divide %i unidades en %j", (_criterion, total, expected) => {
    expect(splitIntoPackages(total)).toEqual(expected);
  });

  it("CA-05: 100 000 unidades generan 1 000 paquetes de 100", () => {
    expect(splitIntoPackages(100_000)).toEqual(Array(1_000).fill(100));
  });

  it("CA-05: conserva suma y rangos para todos los restos y límites de paquetes", () => {
    const totals = new Set<number>();
    for (let remainder = 1; remainder <= 100; remainder++) {
      totals.add(remainder);
      totals.add(99_900 + remainder);
    }
    for (let fullPackages = 1; fullPackages <= 1_000; fullPackages++) {
      for (const offset of [-1, 0, 1]) {
        const total = fullPackages * 100 + offset;
        if (total <= 100_000) totals.add(total);
      }
    }

    for (const total of totals) {
      const packages = splitIntoPackages(total);
      const remainder = total % 100;
      if (
        packages.length !== Math.ceil(total / 100) ||
        packages.reduce((sum, units) => sum + units, 0) !== total ||
        packages.some((units, index) =>
          index === packages.length - 1
            ? units !== (remainder || 100)
            : units !== 100,
        )
      ) {
        throw new Error(`CA-05: división incorrecta para ${total} unidades`);
      }
    }
  });

  it.each([0, -1, 1.5, NaN, Infinity, -Infinity, 100_001])(
    "CA-05: rechaza el total fuera de dominio %s con RangeError",
    (total) => {
      expect(() => splitIntoPackages(total)).toThrow(RangeError);
    },
  );
});
