# Cierre de la entrega

## Alcance

T25 completa el README con instalación, variables, pruebas, decisiones, uso de IA, error real y limitaciones. Se usa la plantilla proporcionada como guía y se elimina `README-template.md`; no forma parte de la entrega.

Por decisión explícita del candidato, no se añade T24 (suite e2e opcional) ni se repite la prueba de humo T26 al cerrar. Se conservan las evidencias existentes; no se afirma haber realizado una instalación desde un clon limpio en esta fase.

T27 queda pendiente del envío por el candidato.

## Verificaciones ya realizadas

La revisión posterior al merge de PR #18 se hizo sobre `main`, commit `278f30d`, con GitHub Actions aprobado y el despliegue de producción Ready en Vercel.

- Suite completa previa: 411 pruebas aprobadas; lint, tipos y build en verde.
- Pedido sintético de 250 unidades en producción: tres paquetes, avances, motivo obligatorio, rechazo y nuevo avance hasta Listo; avance final 40 %.
- Dos avances simultáneos desde Revisión: un 200 y un 409; un solo evento de finalización.
- Historial persistente con cinco eventos y el motivo real. UUID inválidos y recursos inexistentes con 400/404.
- Resumen real con Cloudflare: 100 de 250 unidades listas, 40 %, un rechazo en cinco movimientos; datos conservados después de recargar.
- Revisión móvil a 375 px sin desbordamiento y Lighthouse de accesibilidad 100/100.
- Limpieza limitada al pedido creado por la verificación; eliminación en cascada de paquetes y eventos comprobada.
- Migraciones aplicadas y RLS activo en las tres tablas, sin políticas públicas.

Las verificaciones anteriores, incluidos duplicados, entradas inválidas y preparación con IA, están en los documentos enlazados desde el README. Son evidencias puntuales, no una garantía continua del estado de servicios externos.

## Material visual

`docs/media/` contiene capturas reales del build local y un GIF formado por sus pasos: abrir el asistente, analizar una frase, revisar la propuesta, aplicarla al formulario y consultar paquetes, historial y resumen. La extracción y el resumen utilizaron Cloudflare real. Los datos son ejemplos en una base PostgreSQL local separada; esta captura no modifica producción.

Los PNG conservan la interfaz completa. El GIF reduce resolución y colores para mantener un tamaño adecuado al README; no altera datos ni presenta la propuesta como un pedido guardado.

## Pendientes

- Aprobación y merge del PR de documentación por el candidato.
- Responder al correo original con los enlaces públicos. El agente no envía correos ni afirma cumplimiento del plazo de 24 horas sin conocer la hora de recepción.
