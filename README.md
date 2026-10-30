# Orderflow

Aplicación de seguimiento de pedidos por paquetes. T00–T15 completadas: documentación SDD, CI, despliegue y backend con creación, consultas y transiciones atómicas por API. El registro y seguimiento desde la interfaz todavía no están implementados.

Aplicación publicada: https://orderflow-jet-ten.vercel.app

## Desarrollo local

Requisitos: Node.js 22.18 o superior y Corepack. La versión de pnpm está fijada en `package.json`.

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Abrir http://localhost:3000. Este esqueleto funciona sin base de datos ni API key.

Para las tareas de persistencia, copiar `.env.example` a `.env` y configurar las conexiones. `DATABASE_URL` usa el pooler; `DATABASE_URL_DIRECT`, la conexión directa para migraciones. `TEST_DATABASE_URL` debe apuntar a una base de pruebas separada. No guardar secretos en Git.

## Verificaciones

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

`typecheck` genera los tipos de rutas de Next.js antes de ejecutar TypeScript, por lo que funciona desde un checkout limpio. Vitest usa Node por defecto; las pruebas de componentes seleccionan jsdom mediante `@vitest-environment jsdom`.

`pnpm test` incluye integración y necesita PostgreSQL local. Para ejecutar solo unitarias sin BD: `corepack pnpm test:unit`. Para preparar el contenedor de pruebas y `TEST_DATABASE_URL`, seguir [la guía de BD y pruebas](docs/database-testing.md).

Para una nueva BD de aplicación, configurar `DATABASE_URL_DIRECT` y ejecutar `corepack pnpm db:migrate`. Las migraciones se versionan en `drizzle/`; no usar la BD de producción para las pruebas.

## Documentación y pendientes

- `specs/constitution.md`: principios y stack.
- `specs/spec.md`: requisitos y criterios de aceptación.
- `specs/plan.md`: arquitectura y contratos.
- `specs/tasks.md`: tareas y avance.
- `docs/agent-errors.md`: errores detectados y correcciones.
- `docs/deployment.md`: configuración y verificaciones de CI, Supabase y Vercel (T02).
- `docs/domain-verification.md`: pruebas y mutaciones verificadas para T03–T06.
- `docs/database-testing.md`: entorno local, seguridad de integración y migración de T07–T08.
- `docs/concurrency-testing.md`: pruebas, concurrencia y mutaciones verificadas para T09–T10.
- `docs/queries-api-verification.md`: consultas, DTO y mapeo de errores de T11–T12.
- `docs/endpoints-verification.md`: endpoints, aislamiento de pruebas y flujo HTTP de T13–T15.

Pendiente desde T16: interfaz funcional y extra de IA con OpenAI. El listado actual no tiene paginación; con mayor volumen habrá que paginar o limitar los resultados. El README final se completará en T25.
