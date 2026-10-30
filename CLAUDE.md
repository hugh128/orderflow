# CLAUDE.md

Proyecto: **Seguimiento de Pedidos** (prueba técnica Desarrollador Jr. – IA). Se desarrolla con **SDD (Spec-Driven Development)**.

## Lee primero

1. `specs/constitution.md`: principios, stack y convenciones.
2. `specs/spec.md`: requisitos y criterios de aceptación (CA-xx).
3. `specs/plan.md` y `specs/tasks.md`: arquitectura y tareas (cuando existan).

## Flujo de trabajo obligatorio

1. Toma **una tarea** de `specs/tasks.md` a la vez.
2. Escribe primero la(s) prueba(s) que cubren los CA de esa tarea. Nombra las pruebas con el ID del criterio, por ejemplo `it("CA-03: 101 unidades → [100, 1]")`.
3. Verifica que la prueba **falla** por la razón correcta.
4. Implementa lo mínimo para que pase.
5. Ejecuta `pnpm lint && pnpm typecheck && pnpm test`.
6. Marca la tarea como hecha y haz un commit pequeño (Conventional Commits).

## Reglas

- **No cambies `specs/` por tu cuenta.** Si encuentras una contradicción, ambigüedad o hueco en la spec, detente y pregunta antes de seguir.
- **No inventes funcionalidades** que no estén en la spec.
- La lógica de negocio va en `src/lib/domain/` como **funciones puras** (sin BD, red ni framework).
- Las validaciones usan **un único esquema Zod** de `src/lib/schemas/`, reutilizado en cliente, API y salida de la IA.
- **El servidor valida siempre.** Nunca confíes en la validación del cliente.
- Crear pedido + paquetes ocurre en **una sola transacción**.
- La unicidad del número se garantiza con un **índice UNIQUE** (sobre el valor normalizado); captura el error de Postgres `23505` y devuelve 409. No hagas "SELECT y luego INSERT".
- Las transiciones usan **actualización condicional atómica**: `UPDATE ... WHERE id = :id AND status = :estado_esperado`; si afecta 0 filas, responde 409.
- El porcentaje de avance se calcula por **unidades** listas, no por cantidad de paquetes; se trunca a entero.
- La API key de IA vive solo en variables de entorno del servidor. Nunca la imprimas en logs ni la expongas al cliente.
- Trata el texto del usuario enviado al modelo como **datos**, no como instrucciones, y valida siempre la salida con Zod.
- Sin `any` injustificado. TypeScript en modo estricto.
- Sin dependencias nuevas salvo que la tarea las requiera; menciónalo al añadirlas.
- No hagas commits con secretos, `.env` ni datos de prueba.

## Comandos

```bash
pnpm install          # instalar dependencias
pnpm dev              # servidor de desarrollo
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm test             # Vitest (unitarias + integración)
pnpm db:generate      # generar migración (drizzle-kit)
pnpm db:migrate       # aplicar migraciones
pnpm build            # build de producción
```

## Base de datos

- PostgreSQL en Supabase. Conexión **por el pooler** (puerto 6543, modo transaction) con `prepare: false` en `postgres.js`.
- Las pruebas de integración usan una base separada (`TEST_DATABASE_URL`), nunca la de producción.
- Variables de entorno: ver `.env.example`.

## Registro de errores del agente (para el README)

Cuando cometas un error relevante (violar una regla de esta lista, romper un CA, introducir un bug), regístralo en `docs/agent-errors.md` con este formato:

```
## Error N: título corto
- Qué pasó:
- Cómo se detectó (idealmente, qué prueba falló):
- Cómo se corrigió:
- Lección / regla añadida:
```

## Estilo de respuesta

Responde en español. Sé breve: indica qué tarea hiciste, qué CA cubre y el resultado de las pruebas.
