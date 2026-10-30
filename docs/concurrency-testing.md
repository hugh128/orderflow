# Persistencia y concurrencia: T09–T10

## Implementación

- Crear un pedido y sus paquetes usa una transacción y un INSERT por tabla, incluso para 1 000 paquetes. La respuesta ordena por `sequence`.
- La unicidad depende del índice `orders_number_unique_ci`, sin SELECT previo. Solo su error `23505`, directo o envuelto por Drizzle en `cause`, se convierte en `DuplicateOrderNumberError`. Otros errores se propagan.
- Las transiciones validan primero el dominio y ejecutan `UPDATE ... WHERE id = ... AND status = expected RETURNING ...`. Si no hay resultado, una consulta distingue paquete inexistente de conflicto con `currentStatus`.
- La fábrica de conexiones acepta un tamaño de pool; producción conserva el valor por defecto de una conexión. Integración inyecta un cliente de repositorio con cinco conexiones y usa otro cliente para SQL directo, porque Drizzle modifica los parsers de fechas de su cliente.
- Ambos clientes de integración usan exclusivamente la URL validada por el guard local; no se ejecutan estas pruebas contra Supabase.

## Evidencia de pruebas

T09 empezó con pruebas fallando por ausencia del repositorio y sus errores. T10 empezó con 14 pruebas fallando porque `transitionPackage` todavía no existía.

La suite completa termina con **159 pruebas aprobadas**, además de lint, typecheck y build. Cubre CA-01–06, 09–10, 13–21 y 27, junto con las pruebas existentes.

El helper concurrente mantiene un bloqueo de tabla, inicia ambas operaciones y exige observar dos procesos distintos esperando el bloqueo en `pg_stat_activity`. Solo entonces libera la tabla. La observación ocurre fuera de la transacción que mantiene el bloqueo para evitar estadísticas antiguas. Un pool serializado no satisface esa condición.

Se ejecutó cinco veces, sin fallos:

```bash
corepack pnpm exec vitest run --project integration -t 'CA-1[08]'
```

Cada repetición aprobó cinco casos seleccionados: creación concurrente, avance concurrente, estado obsoleto, inexistencia y doble clic secuencial.

## Mutaciones temporales detectadas

1. Añadir un SELECT antes de crear el pedido hizo fallar CA-05 por la consulta previa. Un SELECT adicional, si aún se conserva el UNIQUE y su manejo correcto, no necesariamente rompe el resultado concurrente; por eso también se verifica el patrón de consultas.
2. Quitar `status = expected` del UPDATE hizo fallar CA-18: hubo dos éxitos en vez de uno y un conflicto.

Ambas mutaciones se restauraron antes de verificar y publicar. Los errores reales de infraestructura encontrados durante este trabajo se describen en `docs/agent-errors.md` (errores 4 y 5).
