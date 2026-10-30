import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { query, end, connect } = vi.hoisted(() => ({
  query: vi.fn(),
  end: vi.fn(),
  connect: vi.fn(),
}));

vi.mock("postgres", () => ({ default: connect }));

import { GET } from "@/app/api/health/route";

describe("T02: comprobación temporal de conexión", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("DATABASE_URL", "postgres://test:pass@localhost:5432/health_test");
    end.mockResolvedValue(undefined);
    connect.mockReturnValue(Object.assign(query, { end }));
  });

  afterEach(() => vi.unstubAllEnvs());

  it("devuelve ok y cierra el cliente cuando SELECT 1 funciona", async () => {
    query.mockResolvedValue([{ ok: 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(query).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledWith({ timeout: 1 });
  });

  it("no intenta conectarse si falta DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false });
    expect(connect).not.toHaveBeenCalled();
  });

  it("oculta errores de conexión y libera el cliente", async () => {
    query.mockRejectedValue(new Error("private connection details"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false });
    expect(end).toHaveBeenCalledOnce();
  });

  it("devuelve un error genérico si la URL no permite crear el cliente", async () => {
    connect.mockImplementation(() => {
      throw new Error("invalid connection string");
    });

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false });
  });
});
