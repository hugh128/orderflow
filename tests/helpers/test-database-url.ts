const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

function target(url: URL): string {
  const host = localHosts.has(url.hostname) ? "loopback" : url.hostname;
  return `${host}:${url.port || "5432"}${url.pathname}`;
}

type DatabaseEnvironment = {
  TEST_DATABASE_URL?: string;
  DATABASE_URL?: string;
  DATABASE_URL_DIRECT?: string;
};

export function getTestDatabaseUrl(env: DatabaseEnvironment = {
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_URL_DIRECT: process.env.DATABASE_URL_DIRECT,
}): string {
  const value = env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL es obligatoria para integración");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("TEST_DATABASE_URL debe ser una URL PostgreSQL válida");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !localHosts.has(url.hostname) ||
    url.pathname !== "/orders_test" ||
    url.search !== ""
  ) {
    throw new Error("La integración solo admite PostgreSQL local en orders_test, sin parámetros adicionales");
  }

  for (const key of ["DATABASE_URL", "DATABASE_URL_DIRECT"] as const) {
    if (env[key] && target(new URL(env[key])) === target(url)) {
      throw new Error("TEST_DATABASE_URL coincide con una base de la aplicación");
    }
  }
  return value;
}
