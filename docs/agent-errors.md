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

## Error 6: sumar los datos esperados en vez del resumen real
- Qué pasó: añadí una comprobación de suma de contadores sobre la tabla de valores esperados, en vez del resultado del repositorio.
- Cómo se detectó: typecheck rechazó el acumulador de `reduce`, porque la tabla `as const` limitaba el tipo a los literales 0, 1, 2 y 3. Revisar esa línea también mostró que la comprobación no verificaba el resultado real.
- Cómo se corrigió: la suma se verifica sobre `detail.summary.counts`, manteniendo además la comparación exacta del resumen completo.
- Lección / regla añadida: las aserciones deben comprobar la salida del sistema, no propiedades de los propios datos esperados.

## Error 7: prueba huérfana de la ruta temporal eliminada
- Qué pasó: eliminé `/api/health` al cerrar T14, pero conservé su prueba unitaria, que importaba el archivo borrado.
- Cómo se detectó: el siguiente typecheck falló con TS2307 en `tests/unit/health.test.ts`.
- Cómo se corrigió: se retiró la prueba de la funcionalidad temporal eliminada; la conexión de BD queda cubierta por las pruebas de integración de los endpoints reales.
- Lección / regla añadida: al retirar una ruta temporal, buscar referencias tanto en `src` como en `tests` y verificar el cambio completo antes del commit.

## Error 8: las rutas exigían la conexión de BD durante el build
- Qué pasó: los endpoints importaron el cliente de BD que validaba DATABASE_URL al cargar el módulo. El build local pasó con `.env`, pero CI y Preview no tienen esa variable.
- Cómo se detectó: las pruebas y tipos de CI pasaron, pero el build falló por ausencia de DATABASE_URL; el preview también falló.
- Cómo se corrigió: el repositorio obtiene el cliente mediante inicialización diferida. Importar las rutas no requiere secretos; utilizar la BD sin configuración sigue lanzando un error explícito, que el handler convierte en 500 genérico.
- Lección / regla añadida: verificar que el build no depende de secretos locales; las conexiones y su validación deben iniciarse cuando se utilizan, no al importar las rutas.

## Error 9: incompatibilidad entre el input de Zod y el estado del formulario
- Qué pasó: pasé directamente a TanStack Form el esquema con preprocess, cuyo input de units es unknown, mientras el formulario conserva strings.
- Cómo se detectó: los 13 casos de componente pasaron, pero typecheck rechazó la asignación Standard Schema y la inferencia de mensajes de campo.
- Cómo se corrigió: un adaptador tipado ejecuta safeParse sobre el mismo createOrderSchema y devuelve sus mensajes por campo; el envío sigue usando parse para obtener unidades numéricas y textos recortados.
- Lección / regla añadida: verificar el contrato de tipos de los validadores con transformaciones; adaptar la interfaz sin duplicar reglas ni usar casts para ocultar incompatibilidades.

## Error 10: la prueba inicial montaba la página sin sus proveedores
- Qué pasó: al reemplazar la página inicial por formulario y lista, mantuve el montaje aislado de Home en la prueba de T01, sin el Providers del layout.
- Cómo se detectó: la suite completa falló con «No QueryClient set»; las pruebas de los componentes nuevos sí tenían su proveedor.
- Cómo se corrigió: la prueba de página monta Providers y simula una lista vacía mediante fetch, conservando su comprobación del título.
- Lección / regla añadida: al integrar componentes en una página, actualizar también su prueba de composición para reflejar los proveedores que aporta el layout real.

## Error 11: comprobar el refetch antes de la notificación de React Query
- Qué pasó: la prueba de transición resolvía la respuesta del listado y comprobaba inmediatamente el DOM, sin esperar la notificación asíncrona de React Query.
- Cómo se detectó: los dos casos de éxito y conflicto todavía observaban 0 % cuando esperaban 40 %, aunque la respuesta controlada ya estaba resuelta.
- Cómo se corrigió: se espera con waitFor al porcentaje del listado y luego se comprueba que los botones siguen bloqueados mientras el detalle continúa pendiente.
- Lección / regla añadida: resolver una promesa de fetch no equivale a que el observador haya renderizado sus datos; esperar señales visibles sin eliminar las comprobaciones del intervalo pendiente.

## Error 12: restaurar el foco antes del render del nuevo estado
- Qué pasó: al añadir recuperación de foco, consumí la intención cuando terminó la mutación, antes de que React Query renderizara el paquete actualizado. Si el nuevo estado era Listo, el botón enfocado desaparecía después y el foco acababa en body.
- Cómo se detectó: las pruebas de éxito y conflicto completaban la sincronización, pero la fila Listo no conservaba el foco. La traza mostró primero review con pending=false y después done.
- Cómo se corrigió: la intención se mantiene hasta observar el cambio de estado en el DOM, sin recuperar foco si el usuario ya se movió fuera de la fila.
- Lección / regla añadida: la finalización de una promesa de datos y el render de sus consumidores son momentos distintos; verificar el foco después de retirar controles, no solo al resolver la petición.

## Error 13: pérdida de foco al terminar la creación
- Qué pasó: el botón Guardar se deshabilitaba durante el envío y el foco no volvía a un control al finalizar.
- Cómo se detectó: en el recorrido real solo con teclado, se creó el pedido correctamente, pero document.activeElement terminó en body.
- Cómo se corrigió: después del éxito se enfoca Número de pedido, siempre que el usuario no se haya movido fuera del formulario durante la petición. Se añadió una aserción de foco a la prueba del envío.
- Lección / regla añadida: verificar también el foco tras deshabilitar y rehabilitar controles, no solo tras eliminarlos del DOM.

## Error 14: nombre accesible del detalle sin el contador visible
- Qué pasó: el botón mostraba «Ver paquetes» y su cantidad, pero aria-label incluía el número del pedido sin esa cantidad.
- Cómo se detectó: Lighthouse con tarjetas y 1 000 paquetes expandidos reportó label-content-name-mismatch en los tres botones de detalle, aunque la puntuación de categoría era 100.
- Cómo se corrigió: el texto visible lleva un espacio antes del contador y el nombre accesible incluye ese mismo texto y el identificador del pedido.
- Lección / regla añadida: revisar los hallazgos individuales de la auditoría y auditar estados con datos; una puntuación alta en una página vacía no cubre sus controles dinámicos.

## Error 15: confirmar sincronización aunque el refetch había fallado
- Qué pasó: tras STATUS_CONFLICT mostraba «se actualizó la vista» aunque los GET posteriores fallaran por red. invalidateQueries no rechaza por defecto esos fallos de lectura.
- Cómo se detectó: una prueba con POST 409 y ambos GET fallidos conservó el estado Pendiente, pero recibió el mensaje de actualización exitosa.
- Cómo se corrigió: se comprueba si las consultas activas de pedidos terminaron en error. Se informa de la vista pendiente de sincronizar y el reintento vuelve a leer sin reenviar el POST; al recuperar la red confirma Vista actualizada.
- Lección / regla añadida: no confundir la finalización de la invalidación con una lectura exitosa; probar también el fallo de red después de un conflicto.
