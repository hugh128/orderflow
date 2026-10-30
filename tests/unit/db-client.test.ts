import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { connect, wrap } = vi.hoisted(() => ({ connect: vi.fn(), wrap: vi.fn() }));
vi.mock("postgres", () => ({ default: connect }));
vi.mock("drizzle-orm/postgres-js", () => ({ drizzle: wrap }));

describe("T08: cliente de aplicación", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    Reflect.deleteProperty(globalThis, "orderflowSql");
    vi.stubEnv("DATABASE_URL", "postgres://test:pass@localhost:5432/app");
    connect.mockImplementation(() => ({}));
    wrap.mockImplementation((client) => ({ client }));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    Reflect.deleteProperty(globalThis, "orderflowSql");
  });

  it("T08: usa prepare=false y max=1", async () => {
    await import("@/lib/db/client");
    expect(connect).toHaveBeenCalledWith(expect.any(String), { prepare: false, max: 1 });
  });

  it("T08: reutiliza la conexión durante hot reload de desarrollo", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const first = await import("@/lib/db/client");
    vi.resetModules();
    const second = await import("@/lib/db/client");
    expect(first.sql).toBe(second.sql);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("T08: no guarda el cliente en globalThis en producción", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await import("@/lib/db/client");
    vi.resetModules();
    await import("@/lib/db/client");
    expect(connect).toHaveBeenCalledTimes(2);
    expect(Reflect.has(globalThis, "orderflowSql")).toBe(false);
  });

  it("T08: falla explícitamente si falta DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(import("@/lib/db/client")).rejects.toThrow("DATABASE_URL es obligatoria");
    expect(connect).not.toHaveBeenCalled();
  });
});
