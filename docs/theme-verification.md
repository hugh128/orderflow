# T28: temas claro, oscuro y del sistema

Alcance aprobado en [specs/theme.md](../specs/theme.md), CA-54 a CA-56.

Se añade `next-themes` 0.4.6. `ThemeProvider` aplica `data-theme` al HTML y guarda la preferencia local bajo `orderflow-theme`. El valor inicial es Sistema. El layout sigue siendo de servidor; únicamente `<html>` lleva `suppressHydrationWarning`, según la [documentación de next-themes](https://github.com/pacocoursey/next-themes#with-app).

El selector «Tema» es un control nativo etiquetado con Sistema, Claro y Oscuro. Durante SSR y la primera hidratación permanece deshabilitado con Sistema; `useSyncExternalStore` permite mostrar la preferencia real tras montar. No se consulta almacenamiento del navegador desde el servidor. El script del proveedor aplica la paleta antes de hidratar y desactiva transiciones durante el cambio.

Las variables CSS separan texto de acento y fondo de botones para conservar contraste. Formularios, selectores, badges, historial, propuestas y diálogo comparten las superficies semánticas; no se cambian reglas de negocio ni endpoints.

## Evidencia

- Fallo inicial: el archivo `theme-switch` todavía no existía; después de implementarlo, las tres pruebas pasan con el proveedor real, incluyendo restauración de preferencia y renderizado de servidor.
- Suite completa: 38 archivos, **414 pruebas** aprobadas. Lint, TypeScript y build aprobados.
- Navegador local sobre build de producción y BD de ejemplos: selección Oscuro conservada al recargar aunque el sistema prefiera Claro. Sistema responde a cambios emulados Claro/Oscuro.
- Consola sin errores ni advertencias, incluidos avisos de hidratación.
- Selector operable con teclado, foco visible y altura de 44 px.
- Móvil a 375 px: página y diálogo de 375 px, sin desbordamiento horizontal. Selector del resumen con superficie oscura.
- Contraste calculado con los colores efectivos del navegador: doce pares de texto/fondo por tema, incluidos mensajes, etiquetas y botones normales/hover. Mínimo claro **5.24:1**; mínimo oscuro **5.88:1**, superiores a 4.5:1. Los controles deshabilitados no se incluyen en estos mínimos.
- Captura real en [modo oscuro](media/orderflow-dark.png). Se revisó el resultado visual; no se modificaron datos de producción ni se llamó al proveedor de IA durante esta revisión.

Los errores de edición de tokens y de preparación de matchMedia en jsdom se registraron antes de corregirlos en `docs/agent-errors.md`, entradas 21 y 22. El sustituto de matchMedia solo pertenece al entorno de pruebas.
