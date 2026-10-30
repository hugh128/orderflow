# T02: CI y despliegue temprano

## CI

GitHub Actions ejecuta instalación con lockfile, lint, tipos, pruebas y build en cada PR y push a `main`. Usa Node.js 22 y la versión de pnpm de `packageManager`. El servicio PostgreSQL 16 es desechable, exclusivo de CI y no contiene datos reales. Las pruebas de integración empezarán a usarlo en T08.

## Supabase y variables locales

Crear el proyecto en la región elegida y copiar las cadenas desde **Connect**; no deducir el host a partir de la región.

- `DATABASE_URL`: Transaction pooler, puerto 6543, para la aplicación.
- `DATABASE_URL_DIRECT`: conexión directa o Session pooler, puerto 5432, para migraciones. El Session pooler permite conectarse desde redes IPv4 cuando la directa requiere IPv6.
- `TEST_DATABASE_URL`: otra base de datos; nunca la de producción. Se configura al preparar las pruebas de integración de T08.
- `OPENAI_API_KEY` y `OPENAI_MODEL`: opcionales; se configurarán en T21.

Copiar `.env.example` a `.env` y completar los valores sin subirlos a Git. Codificar los caracteres especiales de la contraseña dentro de las URL.

Referencias: [conexiones de Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres) y [Postgres.js](https://supabase.com/docs/guides/database/postgres-js). El cliente usa `prepare: false` para Transaction pooler. En T08 se debe revisar también la limitación de pipelining documentada por Supabase antes de implementar transacciones y consultas concurrentes; no establecer `max_pipeline: 0`, que rompe transacciones según esa documentación.

## Vercel

1. Importar `hugh128/orderflow`, framework Next.js y raíz del repositorio.
2. Seleccionar Node.js 22.x y pnpm mediante `packageManager`.
3. Configurar `DATABASE_URL` en el servidor para Production. Para Preview/Development, usar conexiones a una base separada antes de que esas versiones escriban datos.
4. Mantener `DATABASE_URL_DIRECT` fuera de Vercel; las migraciones se aplicarán localmente en T08.
5. Alinear la región de las funciones con la región del proyecto de Supabase.
6. Verificar la página publicada y `GET /api/health` en una sesión sin autenticación de Vercel. Debe devolver HTTP 200 y `{ "ok": true }`.

La integración Git de Vercel publica `main` en producción y genera previews para PR. Si un despliegue falla, conservar la versión anterior; si se publica una versión incorrecta, restaurar el despliegue anterior desde Vercel y corregir mediante PR. Este despliegue todavía no ejecuta migraciones ni modifica datos.

Referencia: [integración de Vercel con GitHub](https://vercel.com/docs/git/vercel-for-github).

## Diagnóstico temporal

`src/app/api/health/route.ts` comprueba únicamente `SELECT 1`. Sin configuración o si falla la conexión responde HTTP 500 y `{ "ok": false }`, sin devolver credenciales ni errores internos. Usa tiempos acotados para conexión y consulta y cierra el cliente al terminar.

**Retirar la ruta y `tests/unit/health.test.ts` al terminar T14**, cuando se haya verificado la persistencia mediante los endpoints reales.

## Evidencias para cerrar T02

- [ ] GitHub Actions en verde para el commit del PR.
- [ ] `DATABASE_URL` comprobada localmente con `SELECT 1`.
- [ ] `DATABASE_URL_DIRECT` comprobada localmente con `SELECT 1`.
- [ ] URL pública de Vercel accesible y `/api/health` con HTTP 200.

T02 permanece pendiente hasta completar estas verificaciones. No ejecutar aún migraciones: el esquema pertenece a T08.
