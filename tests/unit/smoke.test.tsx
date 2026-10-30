// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { Providers } from "@/components/providers";

afterEach(() => vi.unstubAllGlobals());

describe("T01: esqueleto de la aplicación", () => {
  it("renderiza la página inicial con el alias @ y los matchers de DOM", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([])));
    await act(async () => { render(<Providers><Home /></Providers>); });

    expect(
      screen.getByRole("heading", { level: 1, name: "Seguimiento de pedidos" }),
    ).toBeVisible();
  });
});
