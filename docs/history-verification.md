# Historial de paquetes y resumen asistido por IA

Alcance aprobado y CA-41 a CA-53: [specs/history.md](../specs/history.md). Se implementó por incrementos, con pruebas antes del código.

## Persistencia y contratos

`package_events` contiene ID serial para orden estable, FK al paquete con cascada, estado anterior/nuevo, operación, motivo y fecha. El ID establece el orden de registro, incluso si dos fechas coinciden. No hay autores identificados porque no existe autenticación.

El UPDATE conserva `WHERE id = :id AND status = :expected`. La actualización y el evento se guardan en la misma transacción: si falla el evento, se revierten también el estado y la fecha del paquete. Conflictos y transiciones inválidas no generan eventos. La BD comprueba las cuatro transiciones permitidas, la coherencia del motivo y las claves foráneas.

El rechazo requiere `{ expectedStatus, reason }`, con motivo recortado de 1 a 300 caracteres. La interfaz pide confirmación y valida con el mismo esquema Zod que el servidor. Avanzar conserva su contrato.

`GET /api/packages/:id/history` devuelve hasta los últimos 50 eventos en orden de registro ascendente. Se carga solo al expandir Historial y comparte la raíz de claves `orders`, por lo que una transición invalida la vista. Hay estados de carga, vacío, error y reintento.

No se inventan eventos para paquetes anteriores ni para el estado inicial Pendiente. El historial describe únicamente movimientos registrados desde que esta función está desplegada. No se ofrecen endpoints para editarlo ni borrarlo; no es una auditoría resistente a modificaciones por el administrador de la BD.

## Resumen con Cloudflare

El asistente conserva «Preparar pedido» e incorpora «Resumir pedido». Se elige un pedido y se llama a `POST /api/orders/:id/summary`, sin enviar hechos desde el navegador.

El servidor lee el pedido, sus paquetes y los últimos 50 eventos en una transacción repeatable read de solo lectura. La conexión se libera antes de llamar al modelo. El avance se calcula con el dominio existente.

La IA selecciona de uno a cinco IDs relevantes; prioriza rechazos y finalizaciones. La respuesta solo admite `eventIds`: no acepta narraciones, cifras o causas generadas por el modelo. Cada ID debe pertenecer al snapshot y no puede repetirse. El texto final, las fechas y los motivos se construyen con los datos originales del servidor. Los motivos se muestran como texto escapado y se tratan como datos en el prompt.

Se usa Chat Completions con JSON Schema, verificado con `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, timeout de 15 segundos, cero reintentos y máximo de 300 tokens. Un paquete sin historia no requiere llamar al proveedor: devuelve hechos actuales y un aviso explícito. Los dos endpoints de IA comparten el limitador dentro del mismo runtime; en serverless sigue siendo un control de mejor esfuerzo por instancia, no un presupuesto global distribuido.

El resumen indica cuándo se consultó y permite regenerar; no es una vista en vivo. Los rechazos contados corresponden a los movimientos consultados, no a una historia ilimitada. Nunca modifica datos.

## Evidencia

- H01: siete pruebas nuevas de eventos y tres de API; fallo inicial observado. Incluyen rollback mediante un CHECK temporal que fuerza el fallo del INSERT, concurrencia real con dos conexiones, motivos inválidos, RLS, FK, checks y cascada.
- H02: pruebas de endpoint y componente con fallo inicial; carga bajo demanda, motivo, vacío, error/reintento, UUID y orden estable. Una prueba adicional verifica el límite de 50 con 55 eventos de la misma fecha.
- H03: pruebas con cliente simulado y sin secretos; selección válida, IDs extraños/repetidos, JSON inválido, claves adicionales, fallo del proveedor, prompt separado del motivo, ejemplo JSON válido y caso sin eventos. API probada contra PostgreSQL local; modo de resumen y error/reintento probados con fetch simulado. El límite compartido se verifica sin esperar tiempo real.
- Verificación final: 411 pruebas, lint, tipos y build en verde.
- Navegador real con BD `orders_dev`: pedido de 250, avances, motivo obligatorio, rechazo y nuevo avance hasta Listo. El historial muestra el motivo y el resumen real muestra 40 %, un rechazo y cinco movimientos; Cloudflare seleccionó el rechazo y la finalización.
- A 375 px, página y diálogo miden 375 px sin desbordamiento. Lighthouse de accesibilidad de la página: 100/100 sin fallos.
- Token ausente de `src`, `tests` y `.next/static`. El pedido sintético local fue eliminado; sus paquetes y cinco eventos se borraron en cascada. No se generaron pedidos de prueba en producción.

Durante la verificación real, JSON Object devolvió comillas mal formadas. Se corrigieron el ejemplo del prompt y el transporte a JSON Schema; no se reparan ni aceptan respuestas inválidas. Los errores reales y sus correcciones están en `docs/agent-errors.md`, entradas 18 a 20.

## Migración y publicación

`drizzle/0001_package_events.sql` es aditiva: crea tabla, checks, FK, índice y RLS; no altera datos existentes. Se probó en orders_test y orders_dev y se aplicó con `corepack pnpm db:migrate` a Supabase. Consulta posterior: RLS activo, cero políticas públicas y constraints esperados. No hay backfill.

PR #18 fue aprobado y mergeado. La revisión pública posterior comprobó historial, rechazo con motivo, concurrencia y resumen con Cloudflare; sus resultados y limpieza se recopilan en [el cierre de entrega](delivery.md). Los previews mantienen la separación de credenciales.

Referencias: [transacciones de Drizzle](https://orm.drizzle.team/docs/transactions), [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security) y [JSON Mode de Workers AI](https://developers.cloudflare.com/workers-ai/features/json-mode/).
