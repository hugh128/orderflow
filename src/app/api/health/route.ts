import postgres from "postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

// Diagnóstico temporal de T02: retirar junto con sus pruebas después de T14.
export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) return Response.json({ ok: false }, { status: 500 });

  let sql: ReturnType<typeof postgres> | undefined;
  try {
    sql = postgres(url, {
      prepare: false,
      max: 1,
      connect_timeout: 5,
      connection: { statement_timeout: 5_000 },
    });
    await sql`select 1 as ok`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  } finally {
    await sql?.end({ timeout: 1 });
  }
}
