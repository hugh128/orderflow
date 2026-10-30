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
