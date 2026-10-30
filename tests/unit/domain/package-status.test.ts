import { describe, expect, it } from "vitest";
import {
  advance,
  InvalidTransitionError,
  nextStatus,
  reject,
} from "@/lib/domain/package-status";

describe("estados de los paquetes", () => {
  const operations = { advance, reject };

  it.each([
    ["CA-13", "pending", "advance", "in_progress"],
    ["CA-14", "in_progress", "advance", "review"],
    ["CA-15", "review", "advance", "done"],
    ["CA-16", "done", "advance", null],
    ["CA-20", "pending", "reject", null],
    ["CA-20", "in_progress", "reject", null],
    ["CA-19", "review", "reject", "in_progress"],
    ["CA-20", "done", "reject", null],
  ] as const)("%s: %s con %s produce %s", (_criterion, from, operation, expected) => {
    if (expected === null) {
      expect(() => operations[operation](from)).toThrow(InvalidTransitionError);
    } else {
      expect(operations[operation](from)).toBe(expected);
    }
  });

  it.each([
    ["CA-13", "pending", "in_progress"],
    ["CA-14", "in_progress", "review"],
    ["CA-15", "review", "done"],
    ["CA-16", "done", null],
  ] as const)("%s: nextStatus desde %s devuelve %s", (_criterion, from, expected) => {
    expect(nextStatus(from)).toBe(expected);
  });

  it.each([
    ["pending", "pending"],
    ["pending", "review"],
    ["pending", "done"],
    ["in_progress", "pending"],
    ["in_progress", "in_progress"],
    ["in_progress", "done"],
    ["review", "pending"],
    ["review", "in_progress"],
    ["review", "review"],
    ["done", "pending"],
    ["done", "in_progress"],
    ["done", "review"],
    ["done", "done"],
  ] as const)("CA-17: avanzar desde %s nunca produce %s", (from, invalidTarget) => {
    if (from === "done") {
      expect(() => advance(from)).toThrow(InvalidTransitionError);
    } else {
      expect(advance(from)).not.toBe(invalidTarget);
    }
  });

  it("CA-16: el error tiene clase y nombre propios", () => {
    expect(() => advance("done")).toThrowError(
      expect.objectContaining({ name: "InvalidTransitionError" }),
    );
  });

  it("CA-21: permite rechazar y volver a avanzar hasta Listo", () => {
    const rejected = reject("review");
    expect(rejected).toBe("in_progress");
    const reviewed = advance(rejected);
    expect(reviewed).toBe("review");
    expect(advance(reviewed)).toBe("done");
  });
});
