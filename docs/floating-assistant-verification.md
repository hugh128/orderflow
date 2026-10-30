# Asistente flotante: ajuste de UX autorizado

El usuario pidió una entrada reconocible para la IA, separada de los campos del formulario. Se especificó T23.1 antes de modificar el código y se conservan los endpoints, el parser y las reglas de negocio.

## Flujo

1. Botón flotante «Asistente IA» con texto visible e icono decorativo.
2. Panel lateral en escritorio o panel inferior en móvil. Explica que prepara pedidos, sin prometer consultas ni cambios sobre los existentes.
3. Analizar muestra la propuesta dentro del panel. El formulario permanece intacto.
4. «Usar estos datos» cierra el diálogo y aplica los campos detectados. El foco pasa al primer campo inválido o a Guardar.
5. Solo Guardar crea el pedido. Cerrar conserva texto y propuesta, incluso si el análisis termina mientras el panel está cerrado.

Se utiliza [`dialog.showModal()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal), sin dependencias nuevas. El navegador aporta modalidad y Escape. Al abrir se enfoca el textarea; al cerrar normalmente se vuelve al botón de apertura. El contenido del panel tiene desplazamiento propio y respeta el espacio seguro en móvil.

## Pruebas y verificación

- Fase roja: nueve pruebas fallaron porque faltaban el botón y la aplicación explícita.
- Diez pruebas de componente verifican apertura/cierre, foco, borrador conservado, análisis sin aplicación automática, propuestas parciales, repetición, doble envío, cierre durante una petición y creación manual tras 429/503/red. La API de dialog se simula en jsdom; su comportamiento nativo se verifica además en Chrome.
- Mutación temporal: aplicar automáticamente el resultado al analizar hizo fallar CA-34. Se restauró el código y las diez pruebas volvieron a pasar.
- Suite completa: 379 pruebas, lint, typecheck y build correctos.
- Chrome a 1440 px: panel lateral, propuesta visible y formulario aún vacío. «Usar estos datos» rellena los campos y enfoca Guardar. Escape cierra y devuelve el foco al botón; al reabrir conserva la propuesta.
- Chrome a 375×812: panel de ancho 375, anclado abajo y limitado al 92 % de la altura. El resultado se desplaza dentro del panel, sin desbordamiento horizontal. Consola sin errores ni advertencias.
- Lighthouse de la página con el botón flotante: accesibilidad 100/100, sin auditorías fallidas.

La comprobación con Cloudflare real usó frases sintéticas y la BD local `orders_dev`; no se guardaron pedidos ni se modificó producción. La revisión interactiva del dominio público se realiza después del merge, conservando la protección de los previews.

## Ajuste T23.2 solicitado después de la revisión visual

- Botón de una línea, sin subtítulo, icono de 20 px y área de toque de 48 px. Medición real: aproximadamente 127×48 px tanto en escritorio como a 375 px de ancho.
- Un clic iniciado y terminado fuera de los límites del diálogo cierra el panel y devuelve el foco al botón. Comprobar las coordenadas evita cerrar al pulsar el borde interior; comprobar dónde empezó evita cerrar al arrastrar desde dentro.
- La nueva prueba falló antes de la implementación. Después pasan las once pruebas del asistente y las 380 de la suite, además de lint, tipos y build.
- Navegador real: clic interior conserva el panel abierto, clic exterior lo cierra, foco restaurado y borrador conservado al reabrir. Cierre exterior verificado también a 375×812. No se llamó a la IA ni se guardaron pedidos durante esta comprobación.
