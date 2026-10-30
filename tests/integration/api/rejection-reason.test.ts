import { expect, it } from "vitest";
import { POST } from "@/app/api/packages/[id]/reject/route";
import { createOrderWithPackages } from "@/lib/db/repo";
import { testSql as sql } from "../db";

it.each([undefined, " ", "x".repeat(301)])("CA-44: motivo inválido %j devuelve 400 sin evento", async reason => {
  const { packages } = await createOrderWithPackages({ number: "R-1", customer: "Ejemplo", units: 10 });
  const id = packages[0].id;
  await sql`update packages set status='review' where id=${id}`;
  const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({expectedStatus:"review",reason}) }), {params:Promise.resolve({id})});
  expect(response.status).toBe(400);
  expect((await response.json()).error.details.fieldErrors.reason).toBeDefined();
  expect((await sql`select status from packages where id=${id}`)[0].status).toBe("review");
  expect(await sql`select id from package_events where package_id=${id}`).toHaveLength(0);
});
