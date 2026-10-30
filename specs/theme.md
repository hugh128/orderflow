# Extra aprobado: modo oscuro

Solicitud del candidato: añadir modo oscuro con `next-themes` y `useTheme`, conservando la interfaz y reglas existentes.

## Criterios de aceptación

- **CA-54:** selector accesible «Tema» en la cabecera con Sistema, Claro y Oscuro. Sistema es el valor inicial; las selecciones manuales prevalecen sobre el sistema, se conservan al recargar y se pueden restablecer a Sistema.
- **CA-55:** ambos temas cubren página, formularios, controles, tarjetas, estados, historial y diálogo de IA. Textos normales con contraste mínimo 4.5:1, foco visible y sin desbordamiento a 375 px.
- **CA-56:** el tema se aplica antes de la hidratación mediante el script de next-themes. El selector espera al montaje para mostrar el valor guardado; el HTML de servidor y la primera renderización coinciden. No se ocultan avisos de hidratación fuera del atributo de tema de `<html>`.

## Tarea T28

Pruebas del selector con proveedor real y renderizado de servidor antes de la implementación. Integrar ThemeProvider en Providers; conservar layout como componente de servidor; colores mediante variables semánticas. Revisar ambos temas en navegador local y ejecutar lint, tipos, pruebas y build. Sin cambios de API, BD o IA.
