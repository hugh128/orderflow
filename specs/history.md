# Historial de paquetes y resumen asistido por IA

Extra aprobado por el usuario: historial de cambios, motivo obligatorio al rechazar y resumen de avance/rechazos por pedido. Se conservan la constitución y los comandos de verificación del proyecto.

## Alcance y límites

Tres capacidades, en orden: persistencia de eventos → consulta e interfaz de historial/rechazo → resumen asistido por IA. No hay autores identificados porque la aplicación no tiene autenticación. No se reconstruyen movimientos anteriores ni se permite editar el historial desde la aplicación. La IA no cambia pedidos ni estados.

## Criterios de aceptación

- **CA-41:** cada transición exitosa registra exactamente un evento con paquete, estado anterior/nuevo, operación y fecha; el rechazo incluye motivo recortado de 1 a 300 caracteres. Avanzar no registra motivo.
- **CA-42:** cambio y evento ocurren en una transacción. Un fallo al insertar el evento revierte estado y fecha del paquete. Un conflicto, transición inválida o paquete inexistente no crea eventos. Dos peticiones concurrentes producen un cambio y un evento.
- **CA-43:** la BD comprueba operación, transición válida, motivo coherente y FK. La nueva tabla tiene RLS y borrado en cascada con el paquete. Un identificador secuencial establece orden estable incluso con fechas iguales.
- **CA-44:** `POST .../reject` requiere `{ expectedStatus, reason }`; motivo ausente, vacío o de más de 300 caracteres devuelve 400 sin modificar datos. Avanzar conserva su contrato.
- **CA-45:** `GET /api/packages/:id/history` valida UUID, devuelve 404 si no existe y hasta los últimos 50 eventos en orden de registro ascendente. Un paquete sin eventos devuelve lista vacía, sin inventar historia previa.
- **CA-46:** Rechazar abre un campo etiquetado y confirmación explícita, con cancelar y errores accesibles. Solo confirmar envía la petición; conserva el motivo ante fallos.
- **CA-47:** cada paquete permite abrir su historial bajo demanda, con fecha, estados y motivo; incluye carga, error/reintento y vacío. La clave depende de `orders`, de modo que las transiciones lo invalidan.
- **CA-48:** el asistente permite elegir «Preparar pedido» o «Resumir pedido» y seleccionar un pedido existente. Analizar el resumen no modifica ni crea datos. El formulario manual sigue disponible.
- **CA-49:** `POST /api/orders/:id/summary` valida UUID y existencia antes del modelo. El servidor lee estado actual y los últimos 50 eventos. Porcentaje/conteos se calculan con el dominio existente; el cliente no los recalcula.
- **CA-50:** la IA solo devuelve hasta cinco identificadores de eventos relevantes del conjunto enviado. Identificadores ajenos/repetidos, JSON inválido, rechazo, truncamiento o fallo del proveedor generan 503 seguro. La presentación de hechos se construye exclusivamente desde el snapshot del servidor; no acepta cifras, causas o motivos generados por el modelo.
- **CA-51:** sin eventos no se llama al modelo: se muestra estado actual y aviso de que no hay movimientos registrados. Se aclara que el historial empieza al habilitar esta función y que el resumen considera como máximo los últimos 50 movimientos.
- **CA-52:** el resumen comparte el límite básico de 10 llamadas/minuto/IP con el parser; timeout 15 s, cero reintentos y salida máxima de 300 tokens. Motivos tratados como datos, sin logs del texto ni secretos; pruebas con cliente simulado.
- **CA-53:** el resumen es una fotografía, no una suscripción: muestra cuándo se consultó y permite regenerar. No atribuye responsables ni causas no registradas. Los errores 429/503/red son amables y permiten reintentar.

## Diseño y tareas

- [x] **H01 Persistencia y rechazo coherente:** tabla `package_events`, migración aditiva con RLS/checks/índice, transición transaccional y motivo obligatorio en repositorio/API/formulario para que el nuevo contrato sea usable de extremo a extremo. Pruebas de integridad, rollback y concurrencia. Verificado: 390 pruebas, lint y tipos. Commit `feat(db): record package transitions atomically`.
- [x] **H02 Consulta de historial:** endpoint e interfaz de historial bajo demanda, DTO y estados de carga/error/vacío. Commit `feat(ui): rejection reasons and package history`.
- [ ] **H03 Resumen IA:** snapshot del pedido, selección de eventos con Cloudflare, endpoint con límite compartido y modo de resumen en asistente. Pruebas unitarias/API/componentes, build y navegador real. Commit `feat(ai): summarize order progress from recorded events`.

Verificar en cada paso `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test`; build antes del PR. Mantener migraciones en `drizzle/`, esquema en `src/lib/db`, validación en `src/lib/schemas`, integración en `src/lib/ai` y pruebas en las carpetas existentes. Sin dependencias nuevas previstas. Probar primero en PostgreSQL local y aplicar solo la migración aditiva verificada a Supabase antes del despliegue.
