# Verificación de endpoints: T13–T15

## Implementación

- T13: POST `/api/orders` valida un objeto JSON con el esquema compartido, crea el pedido y responde 201 con `OrderDetailDTO`. `readJson` convierte cuerpos vacíos, malformados o no objeto en 400 `INVALID_JSON`, mediante el manejador común.
- T14: GET de listado y detalle con DTO y fechas ISO. Los IDs se validan con Zod antes del repositorio; `params` usa la firma Promise de Next.js 16.4.3. La ruta temporal `/api/health` fue eliminada.
- T15: avanzar y rechazar comparten una función que valida `expectedStatus`, aplica la transición atómica y después lee el pedido para devolver el resumen actualizado.
- Todas las rutas usan runtime Node.js y `force-dynamic`. No se añadieron dependencias ni migraciones.

## Aislamiento de integración

El setup sustituye `@/lib/db/client` completo por clientes locales antes de cargar los handlers. El guard original exige PostgreSQL local en `orders_test`, rechaza coincidencias con las conexiones de la aplicación y se conserva al limpiar entre pruebas. Una prueba adicional verifica que el cliente del handler es exactamente `repoSql` y apunta a esa base local.

No se sobrescribe `DATABASE_URL` con `TEST_DATABASE_URL`: eso haría fallar el guard que detecta igualdad. El mock del módulo evita importar y abrir el cliente de producción sin debilitar esa protección. Las suites automatizadas y sus TRUNCATE no se ejecutan contra Supabase.

## Pruebas

Las tres suites empezaron fallando por ausencia de las rutas correspondientes. Resultado final: **260 pruebas aprobadas**, lint, typecheck y build correctos, incluido un build con las URL de BD vacías.

- T13 cubre CA-01, 07–09, 11 y 12 mediante Request reales, errores por campo, conteo de filas y ausencia de consultas para entradas inválidas. JSON no representa NaN ni Infinity: al serializarlos se convierten en null; la validación directa de esos valores ya está cubierta en T07.
- T14 cubre CA-29 y 30: vacío, orden con fechas explícitas, resumen, paquetes ordenados, UUID reales, ID inválido sin consultas y 404 con UUID generado.
- T15 cubre CA-13–21, 22 y 33: avances, rechazo y ciclo, transición inválida, conflicto y currentStatus, validación, inexistencia, doble clic y concurrencia. El helper exige observar dos escrituras bloqueadas antes de liberarlas. Completar un paquete de 100 sobre 250 devuelve 40 % en esa misma respuesta.

Mutaciones temporales detectadas y restauradas:

1. Enviar `InvalidJsonError` a la rama genérica: las pruebas detectaron 500 en vez de 400.
2. Leer el estado actual en lugar de usar `expectedStatus`: la prueba de conflicto detectó 200 en vez de 409.

El error real de dejar una prueba huérfana al retirar health se registró antes de corregirlo y tiene un commit `fix:` separado (error 7 de `docs/agent-errors.md`).

CI también detectó que importar las rutas requería DATABASE_URL durante el build (error 8). Se corrigió con `getDb`/`getSql`: la inicialización ocurre al utilizar la BD, conserva el pool y la caché de desarrollo, y mantiene el error explícito si falta configuración. Pruebas adicionales comprueban la importación sin secretos y el 500 genérico al consultar. Preview puede compilar sin credenciales; sus operaciones de BD requieren una conexión configurada y no reciben secretos de producción.

## HTTP real

El servidor local, conectado explícitamente a la base de pruebas, completó creación 201, duplicado 409, validación 400, avances, conflicto 409, rechazo, finalización y detalle/listado con 40 %.

También se comprobó el mismo flujo con `vercel curl` sobre el despliegue protegido `orderflow-bllfcipu7-harold128oth-gmailcoms-projects.vercel.app`, preparado con el entorno de producción y `--skip-domain`. Se verificaron además JSON malformado e ID inválido con 400. Esta comprobación HTTP creó un pedido de humo identificable en Supabase; al terminar se eliminó exclusivamente ese pedido, filtrando por su ID y número, y se comprobó la eliminación en cascada de sus paquetes. Las suites automatizadas permanecieron locales.

El dominio público principal sigue ligado a `main`: recibirá las rutas al fusionar el PR y completar el despliegue automático.
