// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("T01: esqueleto de la aplicación", () => {
  it("renderiza la página inicial con el alias @ y los matchers de DOM", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Seguimiento de pedidos" }),
    ).toBeVisible();
  });
});
