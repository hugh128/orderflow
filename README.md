# Orderflow

[![CI](https://github.com/hugh128/orderflow/actions/workflows/ci.yml/badge.svg)](https://github.com/hugh128/orderflow/actions/workflows/ci.yml)

Aplicación web para registrar pedidos y seguir su avance por paquetes. Prueba técnica para **Desarrollador Jr. – IA**, desarrollada con especificaciones antes del código, pruebas automatizadas y revisión humana.

**[Abrir aplicación](https://orderflow-jet-ten.vercel.app/) · [Repositorio](https://github.com/hugh128/orderflow)**

![Demostración: propuesta con IA, paquetes e historial](docs/media/orderflow-demo.gif)

Captura de la aplicación local con datos de ejemplo. La IA propone; el usuario revisa y guarda.

## Funcionalidades

- Registrar número, cliente y entre 1 y 100 000 unidades. Un pedido de 250 genera paquetes de **100, 100 y 50**.
- Avanzar paquetes: **Pendiente → En proceso → Revisión → Listo**. Rechazar desde Revisión devuelve a En proceso y exige un motivo.
- Consultar avance por **unidades listas**, truncado a entero: completar un paquete de 100 de ese pedido representa **40 %**.
- Consultar historial con fecha, estados y motivos de rechazo.
- Usar el **Asistente IA** para preparar un pedido desde una frase o resumir los movimientos de un pedido existente.
- Trabajar desde móvil y con teclado, con foco visible, mensajes en español y estados expresados con texto.
- Elegir tema **Sistema, Claro u Oscuro** desde la cabecera; la preferencia se conserva al recargar.

<details>
<summary>Capturas: escritorio, asistente, historial y móvil</summary>

![Listado y formulario](docs/media/orderflow-desktop.png)
![Propuesta del asistente](docs/media/orderflow-assistant.png)
![Historial de un paquete](docs/media/orderflow-history.png)
![Resumen asistido](docs/media/orderflow-summary.png)
![Modo oscuro](docs/media/orderflow-dark.png)
<img src="docs/media/orderflow-mobile.png" alt="Orderflow a 375 píxeles de ancho" width="375">

</details>

## Stack

Next.js 16 (App Router), React 19, TypeScript estricto, Tailwind CSS 4, next-themes, Zod 4, TanStack Query y Form, Drizzle ORM, postgres.js, PostgreSQL, Vitest y Testing Library. Producción en **Vercel + Supabase**; IA en **Cloudflare Workers AI** mediante su endpoint compatible con OpenAI.

El paquete `openai` se usa como cliente HTTP compatible: **no requiere cuenta, API key ni créditos de OpenAI**.

## Instalación local

Requisitos: **Node.js 22.18 o superior**, Corepack y PostgreSQL. Docker es opcional si ya tienes PostgreSQL instalado. pgAdmin permite administrarlo, pero necesita un servidor PostgreSQL al cual conectarse. La versión de pnpm está fijada en `package.json`.

```bash
git clone https://github.com/hugh128/orderflow.git
cd orderflow
corepack pnpm install --frozen-lockfile
```

Copia `.env.example` a `.env`: `Copy-Item .env.example .env` en PowerShell, o `cp .env.example .env` en bash.

Para un entorno nuevo con Docker, crea dos bases separadas. Omite este paso si ya las tienes; ajusta los puertos si están ocupados:

```bash
docker run -d --name orderflow-dev -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=orders_dev -p 5434:5432 postgres:16
docker run -d --name orderflow-test -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=orders_test -p 5433:5432 postgres:16
```

Configura en `.env` las siguientes conexiones, con credenciales desechables únicamente para desarrollo local:

```dotenv
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5434/orders_dev
DATABASE_URL_DIRECT=postgres://postgres:postgres@127.0.0.1:5434/orders_dev
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/orders_test
```

Cuando PostgreSQL esté listo, aplica las migraciones y arranca la aplicación:

```bash
corepack pnpm db:migrate
corepack pnpm dev
```

Abre **http://localhost:3000**. No necesitas configurar IA para registrar pedidos manualmente.

### Variables de entorno

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Aplicación. En Supabase, Transaction pooler, puerto 6543. |
| `DATABASE_URL_DIRECT` | Migraciones. Directa o Session pooler de Supabase, puerto 5432; nunca Transaction pooler. |
| `TEST_DATABASE_URL` | PostgreSQL local separado para integración. Las pruebas borran datos de esta base. |
| `CLOUDFLARE_ACCOUNT_ID` | ID de cuenta de Cloudflare. Opcional para el flujo manual. |
| `CLOUDFLARE_API_TOKEN` | Token del servidor con acceso a Workers AI. |
| `CLOUDFLARE_MODEL` | Modelo verificado: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. |

No uses `NEXT_PUBLIC_` para credenciales. `.env` está ignorado por Git; `.env.example` contiene variables vacías.

En Vercel configura `DATABASE_URL` y las tres variables de Cloudflare en el entorno que utilizará datos reales, y vuelve a desplegar. Las migraciones se ejecutan por separado con `DATABASE_URL_DIRECT`; el build no necesita conexión a la BD. Los previews de este proyecto permanecen protegidos y sin credenciales de producción.

## Pruebas y calidad

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

La última validación funcional completa registró **414 pruebas aprobadas**. Vitest separa unitarias en Node, componentes en jsdom e integración en PostgreSQL. El setup aplica migraciones y ejecuta integración en serie; aborta si falta `TEST_DATABASE_URL`, coincide con la conexión de la aplicación o apunta a Supabase. Las pruebas de concurrencia utilizan varias conexiones reales.

Sin base de datos puedes ejecutar:

```bash
corepack pnpm test:unit
corepack pnpm exec vitest run --project components
```

Las pruebas automatizadas simulan el proveedor de IA: **no realizan llamadas reales ni requieren secretos en CI**. GitHub Actions ejecuta lint, tipos y pruebas con PostgreSQL 16; Vercel realiza el build. Las revisiones previas en navegador cubrieron el flujo completo, persistencia, conflictos, móvil a 375 px y teclado. Lighthouse de accesibilidad alcanzó **100/100** en la revisión de producción.

No se añadió una suite e2e independiente ni se repitió la prueba de humo al cerrar, por decisión del candidato. [Evidencias de cierre](docs/delivery.md).

## SDD y uso de agentes

Claude ayudó a preparar las especificaciones y guías iniciales; Codex implementó, probó y revisó los incrementos con aprobación humana mediante PR. El candidato decidió el alcance, el proveedor de IA y los ajustes de interfaz, y aprobó los merges.

| Documento | Contenido |
|---|---|
| [constitution.md](specs/constitution.md) | Principios y convenciones |
| [spec.md](specs/spec.md) | Requisitos y CA-01 a CA-40 |
| [plan.md](specs/plan.md) | Arquitectura y contratos |
| [history.md](specs/history.md) | Extra aprobado: historial y resumen, CA-41 a CA-53 |
| [theme.md](specs/theme.md) | Extra aprobado: temas claro, oscuro y del sistema, CA-54 a CA-56 |
| [tasks.md](specs/tasks.md) | Tareas y estado |
| [AGENTS.md](AGENTS.md) y [CLAUDE.md](CLAUDE.md) | Instrucciones para agentes |

El primer commit contiene documentación antes del código. El flujo fue **especificación → pruebas que fallan → implementación → verificaciones → commit → revisión por PR**. Las pruebas referencian criterios de aceptación; las comprobaciones por mutación se documentan en `docs/`.

## Decisiones técnicas

- **Un proyecto Next.js:** interfaz y Route Handlers con contratos HTTP explícitos; dominio puro en `src/lib/domain/`.
- **Integridad en PostgreSQL:** índice único sobre `lower(btrim(number))`, checks y enum. Se captura `23505` del índice correcto, sin consultar previamente si existe el número.
- **Transacciones:** pedido y paquetes se insertan juntos. Cada transición y su evento también se guardan juntos; si falla el historial, el cambio se revierte.
- **Concurrencia:** `UPDATE ... WHERE id = :id AND status = :expected` evita saltos por doble clic o dos pestañas. Un estado obsoleto devuelve 409 y la interfaz vuelve a consultar.
- **Una regla de avance:** `computeProgress` calcula por unidades en el dominio; la UI muestra el resumen del servidor. El listado usa dos consultas, sin N+1.
- **Zod compartido:** formulario, API y campos extraídos por IA reutilizan la validación. El servidor valida siempre.
- **Supabase como PostgreSQL:** las tres tablas tienen RLS sin políticas públicas. La conexión del servidor usa un rol privilegiado; RLS cierra la API pública de Supabase, pero no reemplaza autorización en la aplicación.

## IA con revisión humana

**Preparar pedido:** escribe «Pedido A-1042 para Textiles Sol, 250 unidades». Cloudflare devuelve JSON; cada campo se valida por separado. Los campos válidos se conservan aunque falte otro. La propuesta solo rellena el formulario al pulsar **Usar estos datos**; guardar requiere otra acción explícita.

**Resumir pedido:** el servidor obtiene una lectura consistente de pedido, paquetes y últimos 50 movimientos. El modelo selecciona hasta cinco IDs de eventos mediante JSON Schema. El servidor valida los IDs y construye textos, fechas, motivos y cifras con los datos originales. El modelo no genera libremente causas ni porcentajes. El resumen indica cuándo se consultó y puede regenerarse; no modifica datos.

Controles: credenciales solo en servidor, entradas limitadas, texto tratado como datos, salida validada, máximo de 300 tokens, timeout de 15 segundos, cero reintentos automáticos y límite de 10 solicitudes por minuto por IP. Ante fallos se informa sin revelar detalles internos; el formulario manual sigue disponible. Sin movimientos, el resumen devuelve hechos actuales sin llamar al modelo.

Consulta la [configuración del parser](docs/ai-parser-verification.md) y la [documentación de Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/). Revisa el plan y las cuotas de tu cuenta antes de publicar; el limitador de la aplicación no constituye un tope de gasto del proveedor.

## Un error real del agente y su corrección

**Problema:** después de un `STATUS_CONFLICT`, la interfaz decía «se actualizó la vista» aunque fallaran los GET de resincronización. El usuario seguía viendo un estado antiguo con una confirmación incorrecta.

**Detección:** la prueba `CA-33: si falla el refetch tras un conflicto informa y reintenta solo la lectura` simuló POST 409 y lecturas fallidas. Mostró el mensaje de éxito con el paquete todavía Pendiente.

**Corrección:** comprobar las consultas activas, informar que falta sincronizar y ofrecer un reintento que solo lee, sin reenviar la transición. Commit [0329966](https://github.com/hugh128/orderflow/commit/0329966).

**Lección:** que termine la invalidación de caché no significa que la lectura haya tenido éxito. Se mantiene una prueba de regresión para ese fallo de red. Ver [registro completo, error 15](docs/agent-errors.md) y [pruebas de acciones](tests/components/package-actions.test.tsx).

## Limitaciones y pendientes

- Sin autenticación ni roles: la demo pública comparte datos. No introducir información sensible. Edición, eliminación y notificaciones quedan fuera del alcance.
- Sin paginación ni filtros; expandir un pedido puede renderizar hasta 1 000 paquetes.
- Historial limitado a los últimos 50 movimientos consultados, sin reconstruir eventos anteriores a su implementación. No es una auditoría inmutable frente al administrador de la BD.
- El limitador de IA reside en memoria por instancia serverless: es de mejor esfuerzo, no un contador global. Para mayor exposición se necesitarían almacenamiento compartido y controles de abuso adicionales.
- La validación rechaza datos fuera de las reglas, pero una extracción puede ser plausible y equivocada; requiere revisión humana.
- Suite e2e independiente diferida por decisión del candidato.

## Estructura y evidencias

```text
specs/             Especificaciones, plan y tareas
docs/              Evidencias, errores y material visual
drizzle/           Migraciones SQL versionadas
src/lib/domain/    División, estados y avance: funciones puras
src/lib/schemas/   Validación Zod compartida
src/lib/db/        Esquema, conexiones y repositorio
src/lib/ai/        Parser, resumen y límites de IA
src/app/api/       Endpoints HTTP
src/components/    Interfaz y asistente
tests/             Unitarias, componentes e integración
```

[Concurrencia](docs/concurrency-testing.md) · [API](docs/endpoints-verification.md) · [Accesibilidad](docs/actions-accessibility-verification.md) · [Asistente flotante](docs/floating-assistant-verification.md) · [Historial y resumen](docs/history-verification.md) · [Temas](docs/theme-verification.md) · [Cierre](docs/delivery.md)
