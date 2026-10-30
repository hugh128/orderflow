# Verificación de T22: endpoint de análisis

`POST /api/orders/parse` recibe `{ text }` y devuelve `{ draft, issues }`. Reutiliza el parser de T21, `readJson` y `handleError`; no importa el repositorio ni el cliente de BD. No crea pedidos.

Orden de ejecución:

1. Leer un objeto JSON válido.
2. Validar y recortar `text` con Zod: de 1 a 500 caracteres después de recortar.
3. Consumir una solicitud del límite por IP.
4. Llamar al parser y devolver su propuesta.

Errores: `400 INVALID_JSON`, `400 VALIDATION_ERROR`, `429 AI_RATE_LIMITED` con `Retry-After` en segundos y `503 AI_UNAVAILABLE`. Los fallos previstos de IA no registran datos del usuario ni detalles del proveedor.

## Limitador

Ventana deslizante de 60 segundos, diez solicitudes válidas por clave. Las rechazadas por validación no consumen cuota; los intentos que llegan al parser sí, aunque la IA esté indisponible. La solicitud bloqueada tampoco prolonga la ventana. `Retry-After` indica los segundos restantes hasta liberar el primer lugar, redondeados hacia arriba.

La clave toma `x-real-ip`; en su ausencia o si está vacío, la primera entrada de `x-forwarded-for`; si ambas faltan, `unknown`. Vercel documenta estas cabeceras en [Request headers](https://vercel.com/docs/headers/request-headers). Un despliegue detrás de otro proxy debe sanitizarlas: fuera de un proxy confiable son valores manipulables por el cliente.

Cada solicitud limpia las claves cuya última marca ya expiró; las listas por IP conservan como máximo diez marcas. Si no llegan solicitudes, el mapa no crece. El reloj es inyectable y las pruebas no esperan tiempo real.

Limitación: el mapa pertenece a cada instancia serverless y se pierde al reiniciarla. Es un control básico, no un límite global ni una protección contra ataques distribuidos. La cuota de Workers Free sigue siendo un control independiente; Workers Paid puede cobrar excedentes. No se añade almacenamiento externo para este alcance.

## Evidencia automatizada

29 pruebas nuevas, con parser simulado y sin credenciales reales ni BD. Primero fallaron por ausencia de ruta/limitador y por los mapeos 503/429 aún no implementados.

- CA-36: texto ausente, nulo, no string, vacío, espacios y 501 caracteres → 400 sin llamar al parser. Exactamente 500 caracteres y recorte de espacios aceptados. JSON malformado, vacío y cuerpos no objeto → `INVALID_JSON`.
- CA-38: error de IA → 503 amable sin datos internos ni registro en consola.
- CA-40: diez solicitudes permitidas, undécima bloqueada antes del parser; otra IP independiente y recuperación al expirar la ventana. Incluye once solicitudes simultáneas, prioridad de cabeceras, fallback compartido, limpieza de entradas y ventana verdaderamente deslizante.
- CA-34/35: propuesta completa o parcial conservada sin cambios.
- Mapeo común: 503 y 429 con su cabecera y cuerpo de error.

Mutaciones temporales, revertidas:

1. Mover el límite después del parser hizo fallar la prueba de la undécima solicitud: llamó once veces al parser en lugar de diez.
2. Eliminar el máximo de longitud hizo fallar el caso de 501 caracteres: respondió 200 en lugar de 400.

Verificación final local: lint, typecheck, 369 pruebas y build correctos. El build registra `/api/orders/parse` como ruta dinámica. Sin dependencias nuevas. Audit conserva únicamente el aviso moderado de esbuild transitivo de Drizzle Kit documentado en T21.

## Verificación HTTP local

Se inició el build de producción en `127.0.0.1:3003` con las variables de IA y BD desactivadas para ese proceso. Se comprobó:

- Texto vacío → 400 `VALIDATION_ERROR`.
- Diez solicitudes válidas sin token → 503 `AI_UNAVAILABLE`.
- Solicitud once → 429 `AI_RATE_LIMITED`, `Retry-After: 60`.

No se llamó al proveedor ni se usó la BD. Se detuvo el proceso temporal al terminar. La propuesta real con Cloudflare ya se verificó en T21; el recorrido de interfaz y las variables de Vercel siguen para T23.
