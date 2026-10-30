# Orderflow

Aplicación de seguimiento de pedidos por paquetes. T00–T06 completadas: documentación SDD, esqueleto, CI, despliegue conectado a Supabase y lógica de dominio probada. El registro y seguimiento desde la interfaz todavía no están implementados.

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

Los scripts `db:generate` y `db:migrate` están preparados; el esquema y las migraciones se implementarán en T08.

## Documentación y pendientes

- `specs/constitution.md`: principios y stack.
- `specs/spec.md`: requisitos y criterios de aceptación.
- `specs/plan.md`: arquitectura y contratos.
- `specs/tasks.md`: tareas y avance.
- `docs/agent-errors.md`: errores detectados y correcciones.
- `docs/deployment.md`: configuración y verificaciones de CI, Supabase y Vercel (T02).
- `docs/domain-verification.md`: pruebas y mutaciones verificadas para T03–T06.

Pendiente desde T07: validación con Zod, persistencia, API, interfaz funcional y extra de IA con OpenAI. El README final se completará en T25.
