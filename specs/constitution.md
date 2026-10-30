# Constitución del proyecto: Seguimiento de Pedidos

Este documento define los principios que gobiernan **todas** las decisiones técnicas del proyecto. Si una tarea contradice la constitución, se discute y se actualiza este documento antes de escribir código.

## 1. Propósito

Aplicación web para registrar pedidos y dar seguimiento a su avance por paquetes. Prueba técnica para el puesto de Desarrollador de Software Jr. – IA (Tata Accesorios Globales).

## 2. Principios

1. **La especificación manda.** El flujo es `spec → plan → tareas → pruebas → implementación`. No se escribe código de una funcionalidad que no esté en `spec.md`.
2. **Pruebas antes que código.** Cada criterio de aceptación (CA) de la spec debe tener al menos una prueba automatizada que lo referencie por su ID (ej. `CA-03`).
3. **El servidor es la fuente de verdad.** Toda regla de negocio y toda validación se aplican en el servidor. La validación del cliente es solo experiencia de usuario.
4. **Dominio puro y aislado.** La lógica de negocio (división en paquetes, máquina de estados, cálculo de avance) vive en `src/lib/domain/` como funciones puras, sin acceso a BD, red ni framework.
5. **La base de datos defiende la integridad.** Unicidad, rangos y estados válidos se garantizan también con constraints en PostgreSQL, no solo en código.
6. **Un solo esquema de validación.** Los esquemas de Zod se definen una vez (`src/lib/schemas/`) y se reutilizan en formularios, API y salida de la IA.
7. **La IA es opcional y nunca decide sola.** La funcionalidad con IA propone; el usuario confirma. Si la IA falla o no está configurada, la aplicación sigue funcionando completa.
8. **Simplicidad primero.** No se añade abstracción, librería ni servicio que la spec no necesite. Sin backend separado.
9. **Cambios pequeños y trazables.** Commits pequeños con Conventional Commits. El historial debe mostrar el orden SDD.

## 3. Stack

| Capa | Tecnología |
|---|---|
| Gestor de paquetes | pnpm |
| Framework | Next.js (App Router) + TypeScript estricto |
| Estilos | Tailwind CSS |
| Validación | Zod |
| Formularios | TanStack Form (con esquema Zod) |
| Datos en cliente | TanStack Query |
| ORM / migraciones | Drizzle ORM + drizzle-kit |
| Base de datos | PostgreSQL (Supabase, vía connection pooler) |
| Pruebas | Vitest (unitarias e integración); Playwright opcional (e2e) |
| IA (extra) | API de OpenAI (Responses API), solo desde el servidor |
| CI | GitHub Actions (lint, typecheck, test) |
| Despliegue | Vercel (app) + Supabase (BD) |

## 4. Convenciones

- **TypeScript** en modo `strict`. Prohibido `any` sin comentario que lo justifique.
- **Idioma:** documentación y textos de interfaz en español; identificadores de código en inglés.
- **Estados** en código (enum): `pending`, `in_progress`, `review`, `done`. En UI: Pendiente, En proceso, Revisión, Listo.
- **Errores de API:** JSON `{ error: { code, message } }` con códigos HTTP correctos (400 validación, 404 no existe, 409 conflicto, 500 inesperado).
- **Secretos:** nunca en el repo. Solo variables de entorno documentadas en `.env.example`.
- **Commits:** `docs:`, `test:`, `feat:`, `fix:`, `chore:`, `refactor:`.
- **Estructura de carpetas:**

```
specs/                  # constitution, spec, plan, tasks
docs/agent-errors.md    # registro de errores del agente de IA (alimenta el README)
src/
  app/                  # rutas, páginas y route handlers
  components/
  lib/
    domain/             # lógica pura (sin dependencias externas)
    schemas/            # esquemas Zod compartidos
    db/                 # esquema Drizzle, cliente, repositorios
    ai/                 # integración con el modelo (extra)
tests/                  # unit/ e integration/
```

## 5. Definición de "terminado" (DoD)

Una tarea está terminada cuando:

- [ ] Cumple los CA de la spec que le corresponden.
- [ ] Tiene pruebas automatizadas y pasan.
- [ ] `pnpm lint`, `pnpm typecheck` y `pnpm test` pasan sin errores.
- [ ] No introduce secretos ni datos de prueba en el repo.
- [ ] Si el agente cometió un error relevante, quedó registrado en `docs/agent-errors.md`.

## 6. Fuera de alcance

Autenticación y roles, multiusuario, edición o eliminación de pedidos, notificaciones, internacionalización, panel de administración.
