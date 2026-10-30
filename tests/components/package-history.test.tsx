import { fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PackageHistory } from "@/components/package-history";
import { renderWithQuery } from "./test-utils";

afterEach(()=>vi.unstubAllGlobals());
it("CA-47: historial bajo demanda, con estados y motivo", async()=>{
  const fetch=vi.fn().mockResolvedValue(Response.json([{id:1,fromStatus:"review",toStatus:"in_progress",kind:"reject",reason:"Revisar acabado",createdAt:"2026-10-30T00:00:00.000Z"}]));
  vi.stubGlobal("fetch",fetch);
  renderWithQuery(<PackageHistory id="package-id" sequence={2} />);
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Ver historial del paquete 2"}));
  expect(await screen.findByText("Revisar acabado")).toBeVisible();
  expect(screen.getByText("Revisión → En proceso")).toBeVisible();
});
it("CA-47: error permite reintentar y muestra vacío honesto", async()=>{
  const fetch=vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(Response.json([]));
  vi.stubGlobal("fetch",fetch);
  renderWithQuery(<PackageHistory id="package-id" sequence={2} />);
  fireEvent.click(screen.getByRole("button",{name:"Ver historial del paquete 2"}));
  fireEvent.click(await screen.findByRole("button",{name:"Reintentar historial"}));
  expect(await screen.findByText("Aún no hay movimientos registrados")).toBeVisible();
});
