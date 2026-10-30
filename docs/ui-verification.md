# Interfaz: T16–T18

## Implementación

- T16: cliente HTTP con ApiError y mensajes en español, Providers con QueryClient por instancia, clave raíz `orders` y layout de servidor en español.
- Pruebas de componentes en un proyecto jsdom independiente de la BD. Jest DOM y cleanup ya existían; se añadió únicamente `@vitejs/plugin-react` para transformar JSX.
- T17: TanStack Form conserva los tres campos como strings y valida con el único esquema Zod mediante un adaptador tipado. Antes de enviar se aplica parse: unidades numéricas y textos recortados. Los errores de servidor se asocian a sus campos y desaparecen al editar; el formulario bloquea envíos simultáneos y se limpia tras crear e invalidar pedidos.
- T18: listado con carga, vacío y error con reintento, tarjetas con progreso y cuatro conteos del servidor, estados en español y detalle bajo demanda. No se recalcula el avance en el cliente. Las acciones sobre paquetes corresponden a T19.
- Los DTO se importan como tipos. Los componentes no importan módulos de BD ni el manejador de errores del servidor.

## Evidencia automatizada

Cada tarea comenzó con pruebas que fallaban por ausencia de sus módulos. Resultado final: **293 pruebas aprobadas**, lint, typecheck y build correctos.

T17 cubre CA-07, 08, 09 y 11: cantidades inválidas, campos vacíos, error de duplicado, fieldErrors, asociación accesible, payload, estado pendiente, doble envío, limpieza e invalidación. T18 cubre CA-22–26, 29 y 30: porcentajes recibidos, ceros, orden, detalle diferido y estados de consulta.

Se detectaron y restauraron estas mutaciones:

1. Enviar units como string: la prueba del payload esperaba 250 y recibió "250".
2. Ocultar los estados con conteo cero: CA-25 detectó la ausencia de En proceso, Revisión y Listo.

Los errores reales de integración de tipos y de la prueba de composición se registraron en `docs/agent-errors.md` (9 y 10).

## Revisión en navegador local

Se creó `orders_dev` en el contenedor PostgreSQL local, separado de `orders_test` y de Supabase. Se aplicaron las migraciones y el servidor se lanzó con esa URL explícita, sin cambiar `.env`.

En Chrome DevTools, con contexto aislado, se verificó:

- Crear 250 unidades: mensaje de éxito, campos vacíos y tarjeta actualizada con tres paquetes.
- Repetir el número con otra capitalización: 409 mostrado bajo Número de pedido; editarlo elimina el error.
- Escribir 10.5: error asociado a la cantidad, sin envío adicional.
- Expandir: paquetes 100/100/50 con sus secuencias y estados.
- Tab llega al botón de detalle y Enter permite abrir y cerrar; foco visible.
- Sin desbordamiento horizontal a 320, 768, 1024 y 1440 px. Para 320 se usó emulación móvil, porque redimensionar la ventana tenía un mínimo de 500 px.
- Sin errores de React ni hidratación. Se observó únicamente el error de red 409 esperado al probar el duplicado.

## Vercel

El despliegue protegido `orderflow-la9dq7pgm-harold128oth-gmailcoms-projects.vercel.app` se preparó con `--prod --skip-domain`, sin mover el dominio público de main. La comprobación HTTP usa la autenticación existente de Vercel CLI.

La verificación interactiva de esa URL queda pendiente: la revisión automática rechazó transmitir una credencial temporal a Chrome DevTools sin autorización explícita. El enlace temporal creado para esa prueba fue revocado. Puede completarse con autorización específica o después del merge en el dominio público, sin transferir credenciales al navegador.
