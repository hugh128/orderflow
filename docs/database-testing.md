# Base de datos y pruebas: T07–T08

## Entorno local

pgAdmin es un cliente de administración. Puede usarse para inspeccionar el contenedor de pruebas, sin cambiar el PostgreSQL 18 que ya estaba instalado en la máquina.

Se usa PostgreSQL 16, igual que CI, en una base dedicada `orders_test`. Para crear el contenedor por primera vez:

```bash
docker run -d --name orders-test-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=orders_test -p 127.0.0.1:5433:5432 postgres:16
```

Para reutilizarlo: `docker start orders-test-db`. Para detenerlo: `docker stop orders-test-db`.

En el `.env` local, ignorado por Git:

```dotenv
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/orders_test
```

La contraseña de ese ejemplo es exclusiva de la BD local desechable. No es una credencial de Supabase. Para verla en pgAdmin, registrar un servidor en `127.0.0.1:5433`, base `orders_test`, usuario `postgres` y contraseña `postgres`.

## Comandos y aislamiento

```bash
corepack pnpm test:unit
corepack pnpm test:integration
corepack pnpm test
```

- `test:unit` no necesita BD ni `.env`.
- `test:integration` exige `TEST_DATABASE_URL`, aplica las migraciones y ejecuta los archivos en serie. Limpia las tablas antes de cada prueba con `resetDb()`.
- `test` ejecuta ambos proyectos de Vitest.
- El setup carga `.env` con `dotenv/config`, sin sobrescribir las variables que CI ya proporciona.
- El guard solo admite la base `orders_test` en loopback, sin parámetros de URL. Rechaza Supabase, hosts remotos y destinos equivalentes a `DATABASE_URL` o `DATABASE_URL_DIRECT`, aunque cambien las credenciales o los alias de loopback.
- El guard se ejecuta antes de migrar y antes de cada limpieza. No hay fallback a la BD de la aplicación ni pruebas omitidas silenciosamente.

CI utiliza el PostgreSQL 16 ya configurado en GitHub Actions, en puerto 5432; no requiere secretos de producción.

## Esquema y migraciones

La migración versionada `drizzle/0000_initial_orders.sql` fue generada con Drizzle 0.45.4 y drizzle-kit 0.31.11. Incluye enum, índices funcionales, checks, FK con cascada y RLS en ambas tablas. `.enableRLS()` también queda representado en el snapshot, evitando divergencias al generar migraciones futuras.

`pnpm db:migrate` exige `DATABASE_URL_DIRECT`, que usa conexión directa o Session pooler. Mantener el historial en Drizzle; no volver a aplicar ese mismo SQL manualmente desde el panel o MCP.

Después de pasar las pruebas locales se aplicó la migración a Supabase `orderflow` (`ooufpxsciemtskwqewuo`). Se verificaron:

- `public.orders` y `public.packages`, ambas vacías y con RLS activado.
- Índice único `orders_number_unique_ci` sobre `lower(btrim(number))`.
- Una migración registrada en `drizzle.__drizzle_migrations`.
- `/api/health` de producción con HTTP 200 y `{ "ok": true }`.

El asesor de seguridad solo devuelve dos avisos INFO de [RLS sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), intencionales según el plan: el servidor se conecta con `postgres`, y los roles de la API pública no tienen políticas de acceso a las filas.

## Evidencia de validación

- T07: 34 pruebas para CA-07, CA-08 y CA-11, con campos y mensajes en español. `"007"` se normaliza a 7; `"1e2"` se rechaza. La suite falló primero por ausencia del esquema.
- T08: las 20 pruebas de SQL directo para CA-28 fallaron primero por ausencia de tablas. Tras migrar, pasaron.
- Guard y cliente: 15 pruebas de seguridad de destino, opciones de conexión y reutilización en desarrollo.
- Mutación: quitar temporalmente `packages_units_range` en la migración y recrear solo la BD local hizo fallar los casos de 0 y 101 unidades. Se restauraron el SQL y la BD; no se cambió Supabase durante esa comprobación.
- Se verificó que las unitarias pasan sin variables de BD y que integración falla explícitamente si falta `TEST_DATABASE_URL`.
- Lint, typecheck, build y **122 pruebas** locales correctos. Los errores reales están en `docs/agent-errors.md`.

T09 y las operaciones de negocio sobre la BD todavía no están implementadas. La BD de Supabase no se usa para pruebas destructivas.
