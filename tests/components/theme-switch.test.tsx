import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Providers } from "@/components/providers";
import { ThemeSwitch } from "@/components/theme-switch";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    matches: true, media: "(prefers-color-scheme: dark)",
    addListener: vi.fn(), removeListener: vi.fn(),
  })));
});
afterEach(() => vi.unstubAllGlobals());

describe("Tema", () => {
  it("CA-54: inicia en Sistema, sigue el tema oscuro del sistema y permite cambiar", async () => {
    render(<Providers><ThemeSwitch /></Providers>);
    const select = screen.getByRole("combobox", { name: "Tema" });
    expect(select).toHaveValue("system");
    await waitFor(() => expect(document.documentElement).toHaveAttribute("data-theme", "dark"));
    fireEvent.change(select, { target: { value: "light" } });
    await waitFor(() => expect(document.documentElement).toHaveAttribute("data-theme", "light"));
    expect(localStorage.getItem("orderflow-theme")).toBe("light");
    fireEvent.change(select, { target: { value: "dark" } });
    await waitFor(() => expect(document.documentElement).toHaveAttribute("data-theme", "dark"));
    expect(localStorage.getItem("orderflow-theme")).toBe("dark");
    fireEvent.change(select, { target: { value: "system" } });
    expect(localStorage.getItem("orderflow-theme")).toBe("system");
  });

  it("CA-54: restaura el tema guardado aunque el sistema prefiera oscuro", async () => {
    localStorage.setItem("orderflow-theme", "light");
    render(<Providers><ThemeSwitch /></Providers>);
    expect(screen.getByRole("combobox", { name: "Tema" })).toHaveValue("light");
    await waitFor(() => expect(document.documentElement).toHaveAttribute("data-theme", "light"));
  });

  it("CA-56: el servidor no expone una selección dependiente del navegador", () => {
    localStorage.setItem("orderflow-theme", "dark");
    const html = renderToString(<Providers><ThemeSwitch /></Providers>);
    expect(html).toContain('disabled=""');
    expect(html).toContain('value="system" selected=""');
    expect(html).not.toContain('value="dark" selected=""');
  });
});
