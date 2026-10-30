import { describe, expect, it } from "vitest";
import { createOrderWithPackages, transitionPackage } from "@/lib/db/repo";
import { testSql as sql } from "./db";
import { concurrentWrites } from "./concurrent-writes";

async function fixture() {
  const { packages } = await createOrderWithPackages({ number: "H-1", customer: "Ejemplo", units: 100 });
  return packages[0].id;
}
describe("H01: eventos transaccionales", () => {
  it("CA-41: registra solo cambios reales, estados y motivo recortado", async () => {
    const id = await fixture();
    await transitionPackage(id, "pending", "advance");
    await transitionPackage(id, "in_progress", "advance");
    await transitionPackage(id, "review", "reject", "  Revisar acabado  ");
    const events = await sql`select from_status, to_status, kind, reason from package_events where package_id=${id} order by id`;
    expect(events).toEqual([
      { from_status: "pending", to_status: "in_progress", kind: "advance", reason: null },
      { from_status: "in_progress", to_status: "review", kind: "advance", reason: null },
      { from_status: "review", to_status: "in_progress", kind: "reject", reason: "Revisar acabado" },
    ]);
  });
  it("CA-42: fallo al registrar evento revierte estado y fecha", async () => {
    const id = await fixture();
    const [before] = await sql`select status, updated_at from packages where id=${id}`;
    await sql`alter table package_events add constraint test_event_failure check (false) not valid`;
    try { await expect(transitionPackage(id, "pending", "advance")).rejects.toBeDefined(); }
    finally { await sql`alter table package_events drop constraint test_event_failure`; }
    const [after] = await sql`select status, updated_at from packages where id=${id}`;
    expect(after).toEqual(before);
    expect(await sql`select id from package_events where package_id=${id}`).toHaveLength(0);
  });
  it("CA-42: concurrencia produce exactamente un cambio y un evento", async () => {
    const id = await fixture();
    const results = await concurrentWrites("packages", () => [transitionPackage(id, "pending", "advance"), transitionPackage(id, "pending", "advance")]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await sql`select id from package_events where package_id=${id}`).toHaveLength(1);
  });
  it.each([undefined, " ", "x".repeat(301)])("CA-41: rechaza motivo inválido %j sin cambio", async (reason) => {
    const id = await fixture();
    await sql`update packages set status='review' where id=${id}`;
    await expect(transitionPackage(id, "review", "reject", reason)).rejects.toBeDefined();
    expect((await sql`select status from packages where id=${id}`)[0].status).toBe("review");
    expect(await sql`select id from package_events where package_id=${id}`).toHaveLength(0);
  });
  it("CA-43: checks de transición/motivo, FK, RLS y cascada", async () => {
    const id = await fixture();
    await expect(sql`insert into package_events(package_id,from_status,to_status,kind) values (${id},'pending','done','advance')`).rejects.toMatchObject({code:"23514"});
    await expect(sql`insert into package_events(package_id,from_status,to_status,kind,reason) values (${id},'review','in_progress','reject',' ')`).rejects.toMatchObject({code:"23514"});
    await expect(sql`insert into package_events(package_id,from_status,to_status,kind) values ('00000000-0000-4000-8000-000000000001','pending','in_progress','advance')`).rejects.toMatchObject({code:"23503"});
    expect((await sql`select relrowsecurity from pg_class where oid='public.package_events'::regclass`)[0].relrowsecurity).toBe(true);
    await transitionPackage(id, "pending", "advance");
    await sql`delete from packages where id=${id}`;
    expect(await sql`select id from package_events where package_id=${id}`).toHaveLength(0);
  });
});
