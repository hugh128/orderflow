# Verificación de dominio: T03–T06

Las funciones de `src/lib/domain/` no dependen de BD, red ni framework. Estas pruebas cubren la lógica de los CA; la persistencia, los estados iniciales guardados y las respuestas HTTP se comprobarán en sus tareas de integración.

| Tarea | Verificación | Resultado |
|---|---|---|
| T03 | Estados en el orden del plan y límites 100 / 100 000; lint, tipos y suite existente | Correcto |
| T04 | 14 pruebas: CA-01–05, múltiplos exactos, máximo, rangos, sumas y entradas inválidas, incluidos NaN e infinitos | Correcto |
| T05 | 27 pruebas: ocho combinaciones estado/operación, nextStatus, trece destinos inválidos de avance, error tipado y ciclo de rechazo | Correcto |
| T06 | 7 pruebas: CA-22–26, 99 999/100 000 unidades listas y lista vacía | Correcto |

## Evidencia de pruebas primero

Antes de crear cada módulo de T04, T05 y T06, su suite falló porque el módulo correspondiente todavía no existía. Tras implementar, las suites pasaron. No se usaron errores de sintaxis como evidencia del fallo inicial.

## Mutaciones comprobadas

Se aplicaron temporalmente y se restauraron antes de los commits:

| Mutación | Pruebas que fallaron |
|---|---|
| T04: `Math.ceil` → `Math.floor` al calcular cantidad de paquetes | CA-01, CA-03, CA-04 y la prueba de invariantes CA-05 |
| T05: rechazo devuelve `pending` | CA-19 y CA-21 |
| T06: `Math.floor` → `Math.round` en el porcentaje | Caso 99 999/100 000 de CA-24 |
| T06: porcentaje por cantidad de paquetes | CA-22 y CA-23 |

Las mutaciones son comprobaciones deliberadas, no errores reales del agente. El timeout real encontrado al diseñar T04 está documentado en `docs/agent-errors.md`.

## Resultado final local

`pnpm lint`, `pnpm typecheck` y `pnpm test` correctos: **53 pruebas**, de las cuales 48 pertenecen al dominio y 5 al esqueleto y diagnóstico temporal de T02. Sin dependencias nuevas. T07 y las integraciones quedan pendientes.
