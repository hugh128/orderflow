# Orderflow

Aplicación de seguimiento de pedidos por paquetes, con validación, concurrencia, accesibilidad y asistente de IA. La entrega mínima y el extra de IA se validaron en producción y tienen las etiquetas `v0.1-minimo` y `v0.2-ia`.

El extra de [historial y resumen asistido](docs/history-verification.md) registra cada cambio de estado de forma transaccional, exige motivo al rechazar y permite resumir un pedido desde el asistente. Su verificación pública se realiza después del merge.

Aplicación publicada: https://orderflow-jet-ten.vercel.app

## Desarrollo local

Requisitos: Node.js 22.18 o superior y Corepack. La versión de pnpm está fijada en `package.json`.

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Abrir http://localhost:3000. Para crear y consultar pedidos hace falta configurar la base de datos; la API key de IA sigue siendo opcional.

Para las tareas de persistencia, copiar `.env.example` a `.env` y configurar las conexiones. `DATABASE_URL` usa el pooler; `DATABASE_URL_DIRECT`, la conexión directa para migraciones. `TEST_DATABASE_URL` debe apuntar a una base de pruebas separada. No guardar secretos en Git.

## Verificaciones

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

`typecheck` genera los tipos de rutas de Next.js antes de ejecutar TypeScript, por lo que funciona desde un checkout limpio. Vitest separa unitarias en Node, componentes en jsdom e integración con PostgreSQL. Para ejecutar solo componentes sin BD: `corepack pnpm exec vitest run --project components`.

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
- `docs/ui-verification.md`: formulario, consultas de interfaz y revisión en navegador de T16–T18.
- `docs/actions-accessibility-verification.md`: acciones, foco, móvil y Lighthouse de T19–T20.

T21 añade el parser con Cloudflare Workers AI; su configuración, prueba manual y límites están en [la verificación del parser](docs/ai-parser-verification.md). T22 añade [el endpoint de análisis y su límite por IP](docs/ai-endpoint-verification.md). La integración inicial de [T23](docs/ai-ui-verification.md) se presenta ahora como [asistente flotante](docs/floating-assistant-verification.md): muestra una propuesta y solo rellena el formulario al pulsar «Usar estos datos», sin guardar automáticamente. Pendiente: cierre de la entrega desde T24 (e2e opcional). El listado no tiene paginación y el detalle renderiza hasta 1 000 paquetes a la vez; con mayor volumen habrá que limitar los resultados. El README final se completará en T25.
