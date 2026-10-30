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
    (await import("@/lib/db/client")).getDb();
    expect(connect).toHaveBeenCalledWith(expect.any(String), { prepare: false, max: 1 });
  });

  it("T08: reutiliza la conexión durante hot reload de desarrollo", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const first = await import("@/lib/db/client");
    const firstSql = first.getSql();
    vi.resetModules();
    const second = await import("@/lib/db/client");
    expect(firstSql).toBe(second.getSql());
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("T08: no guarda el cliente en globalThis en producción", async () => {
    vi.stubEnv("NODE_ENV", "production");
    (await import("@/lib/db/client")).getDb();
    vi.resetModules();
    (await import("@/lib/db/client")).getDb();
    expect(connect).toHaveBeenCalledTimes(2);
    expect(Reflect.has(globalThis, "orderflowSql")).toBe(false);
  });

  it("T13-T15: importar sin DATABASE_URL permite compilar; usar la BD falla explícitamente", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const client = await import("@/lib/db/client");
    expect(connect).not.toHaveBeenCalled();
    expect(() => client.getDb()).toThrow("DATABASE_URL es obligatoria");
    expect(connect).not.toHaveBeenCalled();
  });
});
