# Tareas: Seguimiento de Pedidos

**Deriva de:** `specs/spec.md` y `specs/plan.md`
**Regla:** una tarea a la vez, en orden. Para cada tarea: **prueba primero → falla → implementa → pasa → lint/typecheck → commit**.
Marca `[x]` al terminar. El mensaje de commit sugerido va entre paréntesis.

Leyenda: **CA** = criterios de aceptación que cubre · **Dep.** = dependencias · ⏱ = tiempo estimado.

---

## Fase 0: Cimientos

- [x] **T00 Repositorio y specs** ⏱ 10 min
  - Crear repo público en GitHub. Añadir `specs/`, `CLAUDE.md`, `AGENTS.md`, `docs/agent-errors.md` (vacío con plantilla) y `.gitignore`.
  - Conservar el primer commit de Fase 1 ya publicado; añadir plan y tareas en un segundo commit de documentación, antes de cualquier código. (`docs: add technical plan and tasks`)
  - Hecho cuando: el historial muestra specs antes que código.

- [x] **T01 Esqueleto del proyecto** ⏱ 20 min · Dep. T00
  - `pnpm create next-app` (TypeScript, App Router, Tailwind, ESLint, `src/`). Instalar: `zod`, `@tanstack/react-query`, `@tanstack/react-form`, `drizzle-orm`, `postgres`, `drizzle-kit`, `vitest`, `dotenv`.
  - Scripts en `package.json`: `lint`, `typecheck`, `test`, `db:generate`, `db:migrate`. `.env.example` según plan §10.
  - Configurar también `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` y `jsdom` para las pruebas de componente. Fijar `packageManager` con la versión de pnpm utilizada para CI. Una prueba inicial de Vitest que verifique la configuración. (`chore: scaffold next app with tooling`)

- [x] **T02 CI y despliegue temprano** ⏱ 20 min · Dep. T01
  - Añadir `.github/workflows/ci.yml` (plan §9). Importar el repo en Vercel y crear el proyecto de Supabase; configurar variables de entorno.
  - Hecho cuando: CI en verde y la URL de Vercel muestra la página inicial. (`ci: add github actions workflow`)

---

## Fase 1: Dominio puro (sin BD)

- [x] **T03 Constantes y tipos de dominio** ⏱ 5 min · Dep. T01
  - `src/lib/domain/types.ts`: `PACKAGE_STATUSES`, `PackageStatus`, `MAX_PACKAGE_UNITS`, `MAX_ORDER_UNITS`. (`feat(domain): add domain types and constants`)

- [x] **T04 División en paquetes** ⏱ 15 min · Dep. T03 · **CA-01, 02, 03, 04, 05**
  - Pruebas: 250 → [100,100,50]; 100 → [100]; 101 → [100,1]; 1 → [1]; 200 → [100,100]; 100 000 → 1 000 paquetes de 100; suma = N; entradas inválidas (0, -1, 1.5, NaN, 100 001) lanzan `RangeError`.
  - Implementar `splitIntoPackages`. (`feat(domain): split orders into packages`)

- [x] **T05 Máquina de estados** ⏱ 20 min · Dep. T03 · **CA-13 a 17, 19, 20, 21**
  - Pruebas: las 3 transiciones de avance; `done` no avanza; las 13 combinaciones inválidas de avance/salto lanzan `InvalidTransitionError`; `reject` solo desde `review` → `in_progress`; `reject` desde los otros 3 estados lanza error; ciclo rechazo → avance de nuevo hasta `done`.
  - Implementar `nextStatus`, `advance`, `reject`, `InvalidTransitionError`. (`feat(domain): add package state machine`)

- [x] **T06 Cálculo de avance** ⏱ 20 min · Dep. T03 · **CA-22, 23, 24, 25, 26**
  - Pruebas: 250 con un 100 listo → 40; 250 con el de 50 listo → 20; todos listos → 100; ninguno listo → 0 y conteos suman el total; 300 (100/100/100) con uno listo → 33; 99 999 de 100 000 → 99 (nunca 100); lista vacía → 0 sin error; los 4 estados siempre presentes en `counts`.
  - Implementar `computeProgress`. (`feat(domain): compute order progress by ready units`)

---

## Fase 2: Validación

- [x] **T07 Esquema de creación de pedido** ⏱ 20 min · Dep. T03 · **CA-07, 08, 11**
  - Pruebas en tabla. Rechazar: `0`, `-5`, `10.5`, `""`, `"abc"`, `"1e2"`, `"  "`, `null`, `NaN`, `Infinity`, `100001`; número/cliente vacíos o solo espacios; número > 30 caracteres. Aceptar: `1`, `"250"`, `" 250 "`, `100000`; número con espacios extremos queda recortado.
  - Implementar `createOrderSchema` con mensajes en español. (`feat(schemas): add create order schema`)

---

## Fase 3: Persistencia

- [x] **T08 Esquema de BD y migración** ⏱ 25 min · Dep. T01 · **CA-28**
  - Escribir `src/lib/db/schema.ts` (plan §2.1) y `client.ts`. Generar migración y añadir `ENABLE ROW LEVEL SECURITY` en ambas tablas. Configurar BD de pruebas y un `setup` de Vitest que migre y limpie (`TRUNCATE`) entre pruebas.
  - Pruebas de integración directas con SQL: insertar número duplicado con distinta capitalización o espacios extremos falla; paquete con 0 o 101 unidades falla; `sequence` repetido en un pedido falla; estado fuera del enum falla.
  - Aplicar la migración a Supabase. (`feat(db): add schema, migration and constraints`)

- [x] **T09 Crear pedido con paquetes** ⏱ 30 min · Dep. T04, T07, T08 · **CA-01 a 06, 09, 10, 27**
  - Pruebas: 250 unidades → 3 paquetes `pending` con `sequence` 1–3 y unidades 100/100/50; suma de paquetes = total; si falla el insert de paquetes (simular con unidades inválidas forzadas) no queda pedido (rollback); número duplicado (también `"a-1"` vs `"A-1"`) → `DuplicateOrderNumberError`; dos creaciones concurrentes con el mismo número con `Promise.all` → exactamente una tiene éxito.
  - Implementar `createOrderWithPackages` y `isUniqueViolation`. (`feat(db): create order and packages in one transaction`)

- [ ] **T10 Transición atómica de paquetes** ⏱ 30 min · Dep. T05, T08 · **CA-13 a 21**
  - Pruebas: avance y rechazo válidos persisten; `expected` ≠ estado real → `StatusConflictError` con `currentStatus`; `done` + avanzar → `InvalidTransitionError`; id inexistente → `NotFoundError`; **dos `advance` concurrentes** con el mismo `expected` → un éxito y un conflicto, y el estado final avanzó **una sola vez**.
  - Implementar `transitionPackage`. (`feat(db): atomic package transitions`)

- [ ] **T11 Consultas con resumen** ⏱ 25 min · Dep. T06, T09 · **CA-22 a 26, 27, 29**
  - Pruebas: `listOrders` devuelve más reciente primero, con `summary` correcto (usa `computeProgress`); usa 2 consultas (sin N+1); `getOrder` incluye paquetes ordenados por `sequence`; `getOrder` de id inexistente → `null`; los datos persisten entre instancias del cliente de BD.
  - Implementar `listOrders` y `getOrder`. (`feat(db): list and get orders with progress summary`)

---

## Fase 4: API

- [ ] **T12 Utilidades de API** ⏱ 15 min · Dep. T09, T10
  - `handleError` que mapea `ZodError` → 400 `VALIDATION_ERROR` (con `details` por campo), `DuplicateOrderNumberError` → 409, `InvalidTransitionError` → 409, `StatusConflictError` → 409 con `currentStatus`, `NotFoundError` → 404, otros → 500 genérico (sin filtrar detalles). Pruebas unitarias de cada mapeo. (`feat(api): add error mapping`)

- [ ] **T13 `POST /api/orders`** ⏱ 20 min · Dep. T12 · **CA-01, 07, 08, 09, 11, 12**
  - Pruebas invocando el handler con `Request`: 201 con `OrderDetailDTO` y 3 paquetes para 250; 400 para cada entrada inválida de T07 (**CA-12:** sin pasar por el cliente); 400 con JSON malformado; 409 duplicado. (`feat(api): create order endpoint`)

- [ ] **T14 `GET /api/orders` y `GET /api/orders/:id`** ⏱ 15 min · Dep. T11, T12 · **CA-29, 30**
  - Pruebas: lista vacía → `[]`; orden y resumen correctos; detalle 200; id no UUID → 400; inexistente → 404. (`feat(api): list and detail endpoints`)

- [ ] **T15 `POST /api/packages/:id/advance` y `/reject`** ⏱ 25 min · Dep. T10, T12 · **CA-13 a 21, 33**
  - Pruebas: avance/rechazo OK devuelven paquete + pedido actualizado (con nuevo avance); falta `expectedStatus` o valor inválido → 400; `INVALID_TRANSITION`; `STATUS_CONFLICT` con `currentStatus`; 404; doble petición simultánea → 200 + 409. (`feat(api): advance and reject package endpoints`)

---

## Fase 5: Interfaz

- [ ] **T16 Proveedores y layout** ⏱ 15 min · Dep. T01
  - `QueryClientProvider`, layout con título, estilos base de Tailwind, función `apiFetch` tipada que lanza un `ApiError` con `code` y `message`. (`feat(ui): layout and providers`)

- [ ] **T17 Formulario de creación** ⏱ 35 min · Dep. T13, T16 · **CA-07, 08, 09, 11**
  - TanStack Form con `createOrderSchema`; campo de unidades `type="text" inputMode="numeric"`; errores bajo cada campo; el 409 de duplicado se muestra en el campo número; deshabilitar el botón mientras guarda; limpiar el formulario al guardar con éxito.
  - Pruebas de componente (Vitest + Testing Library) para validación y mensajes. (`feat(ui): create order form`)

- [ ] **T18 Lista de pedidos y tarjetas** ⏱ 35 min · Dep. T14, T16 · **CA-22 a 26, 29, 30**
  - `useOrders`, `OrderList` (carga / vacío / error con reintento), `OrderCard` con barra de progreso accesible, conteo de los 4 estados (incluye ceros) y detalle expandible de paquetes. (`feat(ui): order list with progress`)

- [ ] **T19 Acciones sobre paquetes** ⏱ 35 min · Dep. T15, T18 · **CA-31, 32, 33**
  - `PackageRow` con `Avanzar` (no en `done`) y `Rechazar` (solo en `review`); envía `expectedStatus`; deshabilita mientras la mutación está en curso; invalida `["orders"]` al terminar; ante cualquier error (409, red, etc.) muestra mensaje y resincroniza; si la red sigue caída, ofrece reintento.
  - Pruebas de componente: botones visibles según estado; mensaje en conflicto. (`feat(ui): package actions`)

- [ ] **T20 Pulido de UX y accesibilidad** ⏱ 20 min · Dep. T17–T19
  - Responsive en móvil, `aria-live` para resultados, estados no solo por color, foco visible, textos en español. Revisión manual con teclado. (`style(ui): responsive and accessibility pass`)

> **Punto de corte:** al terminar T20 la entrega mínima está completa. Desplegar, probar en producción y asegurar que el correo se pueda enviar con esto aunque lo demás falle.

---

## Fase 6: Extra IA

- [ ] **T21 Parser de pedidos con IA** ⏱ 35 min · Dep. T07 · **CA-34, 35, 37, 38, 39**
  - Instalar `openai`; usar Responses API con Structured Outputs según plan §8 y configurar `OPENAI_API_KEY`/`OPENAI_MODEL`. Implementar `parseOrderFromText(text, client)` con el cliente **inyectable** para poder simularlo. Cubrir también ausencia de modelo, rechazo del proveedor, respuesta incompleta y JSON inválido con `AiUnavailableError`.
  - Pruebas con cliente simulado: salida válida → `draft` completo; campo `null` → omitido + `issue`; unidades `1000000` (inyección) → rechazadas por Zod, no aparecen en `draft`; unidades como string numérico → aceptadas; error/timeout del proveedor → `AiUnavailableError`; sin API key → `AiUnavailableError`; el texto del usuario va dentro de `<texto_pedido>`.
  - (`feat(ai): parse order text with structured output`)

- [ ] **T22 `POST /api/orders/parse`** ⏱ 25 min · Dep. T21 · **CA-36, 38, 40**
  - Pruebas: texto vacío o de más de 500 caracteres → 400 sin llamar al modelo; 11 solicitudes por minuto desde la misma IP → la 11.ª recibe 429; `AiUnavailableError` → 503; éxito → `{ draft, issues }`. Implementar el limitador en memoria (`src/lib/ai/rate-limit.ts`). (`feat(api): ai order parsing endpoint with rate limit`)

- [ ] **T23 Caja de IA en la interfaz** ⏱ 25 min · Dep. T17, T22 · **CA-34, 35, 38**
  - `AiOrderBox`: textarea con contador (máx. 500), botón "Analizar", estado de carga; al recibir `draft` rellena el formulario **sin guardar**; muestra `issues`; en 503/429 muestra mensaje amable y el formulario manual sigue funcionando. Pruebas de componente con el endpoint simulado. (`feat(ui): ai order box`)

---

## Fase 7: Cierre

- [ ] **T24 Prueba e2e (opcional)** ⏱ 25 min · Dep. T20
  - Playwright: crear pedido de 250 → ver 3 paquetes y 0 % → avanzar uno hasta `done` → ver 40 % → rechazar uno desde `review` → recargar y comprobar persistencia. (`test(e2e): happy path`)

- [ ] **T25 README** ⏱ 25 min · Dep. todas
  - Contenido obligatorio: descripción, **instalación** (requisitos, `pnpm install`, `.env`, migraciones, `pnpm dev`), cómo correr pruebas, enlace a la app publicada, estructura `specs/`, decisiones clave, **un error del agente de IA y cómo se corrigió** (tomado de `docs/agent-errors.md`), limitaciones conocidas (p. ej. límite por IP en memoria) y **pendientes**.
  - (`docs: add readme`)

- [ ] **T26 Prueba de humo en producción** ⏱ 15 min · Dep. T20 (y T23 si se hizo)
  - Con la URL de Vercel: crear pedido de 250 unidades, probar duplicado, avanzar/rechazar/completar, recargar. Si hay IA: probar una frase real y una con intento de inyección.
  - Verificar: repo público, CI en verde, `.env.example` sin secretos, historial con specs antes del código.

- [ ] **T27 Envío** ⏱ 5 min
  - Responder al correo (dentro de las 24 h) con: link de la app publicada y link del repo.

---

## Resumen de cobertura

| Requisito | Tareas |
|---|---|
| RF-01 Crear pedido | T04, T09, T13, T17 |
| RF-02 Validaciones | T07, T09, T13, T17 |
| RF-03 Avanzar estado | T05, T10, T15, T19 |
| RF-04 Rechazar | T05, T10, T15, T19 |
| RF-05 Resumen de avance | T06, T11, T14, T18 |
| RF-06 Persistencia | T08–T11 |
| RF-07 Listado y consulta | T11, T14, T18, T19 |
| Extra IA (CA-34 a 40) | T21, T22, T23 |

**Tiempo estimado total:** ≈ 9 h de trabajo efectivo (≈ 6 h sin el extra IA y sin e2e). Si el tiempo aprieta, recortar en este orden: T24, T23/T22/T21, y documentar lo pendiente en el README.
