# Verificación de T23: caja de IA

La caja opcional del formulario llama a `POST /api/orders/parse`. Solo devuelve una propuesta al formulario; no usa `useCreateOrder` ni llama a `POST /api/orders`. El usuario debe revisar y guardar explícitamente.

## Comportamiento

- Textarea etiquetado, máximo de 500 caracteres y contador. Analizar queda deshabilitado con texto vacío, durante el análisis o mientras se guarda el formulario. Un guard síncrono evita el doble envío.
- La propuesta se aplica mediante callback en cada análisis: repetir la misma propuesta vuelve a rellenar los campos. Solo se cambian las claves recibidas; los otros campos conservan sus valores.
- El formulario vuelve a validar con `createOrderSchema`, elimina errores de servidor anteriores y enfoca el primer campo inválido o el botón Guardar cuando está completo.
- Resultado e issues se anuncian en una región `aria-live="polite"`. Errores 429, 503 y de red tienen mensajes en español; el formulario manual sigue disponible.
- El hook y los componentes importan los tipos de IA con `import type`. No importan el SDK ni el cliente del proveedor en tiempo de ejecución.

## Pruebas

Ocho pruebas nuevas cubren CA-34, CA-35, CA-36 y CA-38. Primero fallaron porque la caja no existía. Con fetch simulado verifican rellenado sin guardar, payload del análisis, foco, conservación de campos e issues, repetición de la propuesta, contador y límite, doble clic, carga y guardado manual tras errores 429/503/red.

Mutación temporal revertida: añadir un POST automático de creación al analizar hizo fallar CA-34 por dos llamadas en lugar de una. Las ocho pruebas volvieron a pasar después de restaurar el código.

Controles locales: lint, typecheck, 377 pruebas y build en verde. No se añadieron dependencias. La búsqueda del valor real del token en `src`, `tests` y `.next/static` devolvió cero coincidencias.

## Navegador real

Build de producción local con `orders_dev`, separado de Supabase y de `orders_test`:

1. Texto completo con «doscientas cincuenta unidades» → tres campos rellenos, foco en Guardar y aviso de revisión. La red mostró solo GET del listado y POST del análisis; ningún POST de creación.
2. «necesito 150 piezas», con cliente escrito previamente → conserva ese cliente, rellena 150 y muestra los datos no detectados. Tab y Enter activaron Analizar y el foco pasó al número obligatorio con contorno visible.
3. Solo después de completar el número y pulsar Guardar se obtuvo 201, se limpió el formulario y se anunció la creación con dos paquetes. Se eliminó únicamente este pedido sintético local y se comprobó la cascada; no se modificaron los otros ejemplos locales ni la producción.
4. A 375 px, `scrollWidth === innerWidth === 375`; botones de 44 px de alto, textos legibles y sin scroll horizontal. Consola sin errores ni advertencias.
5. Lighthouse de accesibilidad sobre el build local: 100/100, sin auditorías fallidas.

## Vercel y verificación posterior al merge

Se configuraron `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_MODEL` como secretos únicamente de Production en el proyecto `orderflow`. Los valores se enviaron por stdin, sin imprimirlos ni incluirlos en argumentos de procesos. La consulta posterior de metadata confirmó tipo `sensitive` y target `production`; no se descifraron valores.

El próximo despliegue de main incorporará esas variables. Los previews siguen sin el token y permiten verificar la degradación. No se cambiaron las protecciones de Vercel: producción pública y previews protegidos.

Pendiente tras el merge: recorrido interactivo en el dominio público y etiqueta `v0.2-ia` sobre el commit integrado, después de comprobar el flujo real. No se transfieren credenciales de protección al navegador.
