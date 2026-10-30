# Verificación de T11 y T12

## T11: consultas y DTO

- `listOrders` lee pedidos por fecha descendente, con ID descendente como desempate. Lee todos sus paquetes con un único `inArray`, los agrupa y llama al único `computeProgress` del dominio.
- El logger real de Drizzle mide dos consultas para cinco pedidos y una sola para la lista vacía. También se comprueba que los resúmenes no mezclen paquetes de diferentes pedidos.
- `getOrder` devuelve paquetes ordenados por secuencia y resumen, o `null` sin consultar paquetes cuando no existe el pedido.
- Las pruebas cubren CA-22–26 con porcentajes 40, 20, 100, 0 y 33; CA-27 con otra conexión PostgreSQL; y CA-29 con fechas explícitas distintas.
- Los mapeos puros producen `PackageDTO`, `OrderDTO` y `OrderDetailDTO`, convierten fechas a ISO y conservan el resumen sin recalcularlo. El DTO del listado no incluye paquetes ni campos internos del paquete.

Las pruebas fallaron primero por ausencia de las consultas y del módulo de DTO. Tras implementar T11, pasaron 174 pruebas, lint y typecheck.

## T12: formato y errores HTTP

`errorResponse` y `handleError` producen `{ error: { code, message, details? } }`. El manejador distingue las clases de dominio y repositorio con `instanceof`; no clasifica errores por el texto de su mensaje.

- Zod: 400 `VALIDATION_ERROR`, mensaje «Datos inválidos» y detalles por campo, además de errores generales de formulario.
- Número duplicado: 409 `DUPLICATE_ORDER_NUMBER`.
- Transición inválida: 409 `INVALID_TRANSITION`.
- Conflicto: 409 `STATUS_CONFLICT` y `details.currentStatus`.
- Inexistente: 404 `NOT_FOUND`.
- Desconocido, incluso string o null: 500 `INTERNAL` genérico; el error se registra en el servidor y no se copia a la respuesta.

Los tests de validación generan errores reales con `createOrderSchema`. Una prueba de integración comprueba el recorrido del error de unicidad envuelto por Drizzle, su conversión en el repositorio y su respuesta 409. No se añadieron endpoints ni dependencias.

Se verificó `z.flattenError` en la [documentación oficial de Zod](https://zod.dev/error-formatting) y las consultas en la [documentación de Drizzle](https://orm.drizzle.team/docs/select).

## Mutaciones detectadas y restauradas

1. Orden ascendente: CA-29 detectó la lista invertida.
2. Avance por cantidad de paquetes: CA-23 recibió 33 en vez de 20.
3. Duplicado enviado a la rama genérica: CA-09 recibió 500 en vez de 409.

Resultado final: **188 pruebas aprobadas**, lint, typecheck y build. El error real encontrado al comprobar contadores está registrado en `docs/agent-errors.md` (error 6).

## Limitación de alcance

El listado devuelve todos los pedidos sin paginar, conforme al alcance actual. Con un volumen mayor habrá que añadir paginación o un límite. La validación de UUID y el tratamiento del JSON malformado corresponden a las tareas de endpoints siguientes.
