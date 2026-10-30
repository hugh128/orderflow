# Acciones y accesibilidad: T19–T20

## T19

Las acciones usan `nextStatus` del dominio y el estado que muestra la fila como `expectedStatus`. Listo no tiene acciones; Rechazar solo aparece en Revisión. Cada fila tiene su mutación, guard de envío y mensajes en español en una región aria-live.

El hook devuelve la promesa de invalidación de `orders` tanto en éxito como en error. Esto resincroniza listado y detalle, sin actualizaciones optimistas. Los errores ofrecen reintentar la sincronización, sin repetir automáticamente la transición.

Las diez pruebas iniciales fallaron por ausencia de acciones. Cubren CA-19, 21 y 31–33: tabla de botones, payload, doble clic, pendiente por paquete, éxito, conflicto con estado real y porcentaje actualizado, error de transición y red. Dos respuestas controladas verifican que el listado puede actualizarse mientras los controles siguen bloqueados hasta terminar el detalle.

Mutaciones detectadas y restauradas:

1. Quitar expectedStatus: CA-32 detectó el cuerpo vacío.
2. No devolver la invalidación de éxito: los controles se habilitaron antes del refetch.
3. No devolver la invalidación de error: el mismo fallo fue detectado en el caso de conflicto.

La [documentación de TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations) confirma que se debe esperar esa promesa.

## T20

- Controles de al menos 44×44 px, foco visible y contenedores que permiten partir textos largos.
- Al completar un paquete, el foco pasa a la fila si desaparecen sus acciones; se conserva la intención hasta renderizar el estado nuevo. No se recupera si el usuario se ha movido fuera.
- Tras crear, se anuncia el número del pedido y la cantidad de paquetes, y se devuelve el foco al número cuando corresponde.
- Regiones de anuncio persistentes, estados con texto y nombres de detalle que incluyen su contador visible.
- La barra solo anima cuando no está activado prefers-reduced-motion.

Resultado: **306 pruebas**, lint, typecheck y build aprobados. No se añadieron dependencias. Los errores reales 11–15 están registrados; las correcciones de foco, nombre accesible y sincronización tienen commits fix separados.

Una prueba adicional simula POST 409 seguido de GET fallidos: la interfaz informa que no pudo actualizarse y, al recuperar la red, el reintento sincroniza sin repetir el POST. Se consulta el resultado real de las lecturas, porque invalidateQueries no rechaza esos errores por defecto.

## Revisión real con Chrome DevTools

Se usó el build de producción local, conectado a `orders_dev`, separada de Supabase y de `orders_test`.

- Teclado: crear 250, expandir con Espacio, avanzar con Enter hasta Listo, comprobar 40 %, pasar al segundo paquete, llevarlo a Revisión y rechazarlo. Tab y Shift+Tab conservaron el recorrido y foco visible.
- Recargar conservó 40 % y los estados Listo / En proceso / Pendiente.
- Se creó por la interfaz un pedido de 100 000 unidades, número de 30 caracteres y cliente de 100 caracteres sin espacios. Se renderizaron las 1 000 filas y la última correspondía al paquete 1 000.
- A 375 px: ancho de contenido 375, sin desbordamiento; ningún botón inferior a 44×44 px; transición de barra 0s con movimiento reducido.
- Reflow equivalente a zoom 200 %: viewport de 720 píxeles CSS con escala de dispositivo 2, sobre 1440 físicos; una columna y sin desbordamiento. Los atajos de zoom no cambiaban las métricas bajo emulación, por eso se comprobó explícitamente este equivalente de reflow.
- Contrastes calculados: badges entre 6.18:1 y 7.09:1; texto secundario 5.73:1; mensajes de error 7.12:1 y éxito 7.22:1; barra sobre su fondo 6.14:1.
- Consola sin errores ni avisos en la versión final revisada.

Lighthouse final sobre la nueva versión, con los 1 000 paquetes expandidos: accesibilidad **100/100**, **37 auditorías aprobadas y cero fallidas**, tanto a 375 px como en el reflow equivalente a 200 %. La primera auditoría descubrió el nombre de detalle incompleto pese a mostrar una puntuación de 100; se corrigió y se repitió.

Lighthouse sobre el dominio público antes del merge: accesibilidad 100/100 y cero fallos; corresponde a la versión T18 y se conserva como línea base, no como validación de las nuevas acciones.

## Publicación y punto de retorno

La verificación interactiva completa en el dominio público y la etiqueta anotada `v0.1-minimo` se completarán después del merge y del despliegue de su commit, conforme al flujo de aprobación del repositorio. No se transfieren credenciales a Chrome DevTools ni se cambia la protección de Vercel.

El detalle muestra hasta 1 000 paquetes a la vez, sin paginación ni virtualización. No se añadió una solución fuera del alcance de la prueba.
