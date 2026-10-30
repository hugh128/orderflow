# Registro de errores del agente

Añadir los errores relevantes con esta plantilla:

```markdown
## Error N: título corto
- Qué pasó:
- Cómo se detectó (idealmente, qué prueba falló):
- Cómo se corrigió:
- Lección / regla añadida:
```

## Error 1: tipos de Node incompatibles con Vitest
- Qué pasó: al instalar Vitest 5 se conservaron los tipos de Node 20 de la plantilla de Next.js, aunque Vitest requiere tipos de Node 22 o superiores.
- Cómo se detectó: `pnpm peers check` informó el peer incompatible `@types/node`.
- Cómo se corrigió: se instaló `@types/node` 22 y se declaró Node.js 22.18 o superior como requisito del proyecto.
- Lección / regla añadida: comprobar los peer dependencies al combinar la plantilla del framework con las herramientas de pruebas.

## Error 2: prueba de dominio demasiado costosa
- Qué pasó: en T04 añadí una prueba que dividía todos los totales de 1 a 100 000, generando aproximadamente 50 millones de paquetes.
- Cómo se detectó: `CA-05: conserva la suma y los rangos para todo total válido` excedió el timeout de cinco segundos; los otros 13 casos pasaron.
- Cómo se corrigió: se mantuvieron las mismas verificaciones de suma, cantidad y tamaños sobre casos deterministas que cubren todos los restos y los límites de cada cantidad de paquetes, sin aumentar el timeout.
- Lección / regla añadida: elegir clases de equivalencia y límites para mantener rápidas las pruebas unitarias; un barrido completo no siempre aporta valor proporcional a su costo.

## Error 3: helper de pruebas acoplado a ProcessEnv de Next.js
- Qué pasó: tipé el entorno inyectable del guard de BD como `NodeJS.ProcessEnv`. Next.js exige `NODE_ENV` en ese tipo, aunque el guard solo necesita tres URL.
- Cómo se detectó: `pnpm typecheck` rechazó los objetos de prueba con TS2345 por ausencia de `NODE_ENV`; la ejecución de las pruebas sí pasaba.
- Cómo se corrigió: el helper recibió un tipo explícito con las tres variables opcionales que realmente consulta, compatible con `process.env` y los casos de prueba.
- Lección / regla añadida: tipar las dependencias inyectadas por su contrato mínimo, sin acoplar utilidades de pruebas a tipos globales del framework.

## Error 4: observación de concurrencia con estadísticas antiguas
- Qué pasó: consulté `pg_stat_activity` dentro de la misma transacción que bloqueaba la tabla; PostgreSQL conservó la instantánea de estadísticas y el observador no vio las dos escrituras.
- Cómo se detectó: CA-10 falló; la consulta interna informó cero conexiones esperando y una consulta independiente mostró dos.
- Cómo se corrigió: el observador consulta desde otra conexión, fuera de la transacción que mantiene el bloqueo.
- Lección / regla añadida: observar concurrencia desde una conexión independiente y exigir evidencia de dos escrituras simultáneas antes de liberar el bloqueo.

## Error 5: compartir el cliente SQL crudo con Drizzle
- Qué pasó: reutilicé el cliente de las pruebas SQL para Drizzle, que sustituye sus parsers de fechas.
- Cómo se detectó: CA-28 recibió `updated_at` como texto en vez de Date al ejecutar la suite completa.
- Cómo se corrigió: clientes separados para consultas SQL directas y repositorio, ambos limitados a la base local protegida.
- Lección / regla añadida: comprobar los efectos del adaptador sobre el cliente y ejecutar también las pruebas existentes al cambiar la infraestructura.
