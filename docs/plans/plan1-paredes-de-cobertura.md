# Plan 1: paredes de cobertura por tramos (extensión v1.1.0)

[Claude Code · 2026-11-21] Aprobado por Giuliano el 2026-11-21. Este archivo no se edita; si el plan cambia, se hace un plan nuevo y el avance va en el README o en el CHECKPOINT del Omni-Deck.

## Por qué

Marcar tokens como cobertura sirve para objetos puntuales (un auto, un contenedor), pero la mayoría de las coberturas de un mapa son paredes. El Core p.182 da los HP por sección de 2 m x 2 m: una pared larga tiene varias secciones y cada una se rompe por separado.

## Decisiones de Giuliano

- Las paredes se pueden armar de dos formas: con una herramienta propia y convirtiendo dibujos que ya están en el mapa.
- HP por tramo (canon): cada casilla de pared tiene sus propios HP.
- Las paredes no tapan la visión; eso sigue a cargo de Dynamic Fog of War.

## Qué se hace (resumen corto)

1. **Herramienta "Pared de cobertura"** (solo GM): botón nuevo en la barra de herramientas de Owlbear. El material y el grosor se eligen en el panel de la extensión. Se arrastra sobre la grilla (pegado a las esquinas) y la pared queda cortada en tramos de una casilla, cada uno una línea gruesa con sus HP.
2. **Convertir dibujos**: en líneas y trazos, el clic derecho ofrece "Convertir en pared"; el dibujo se reemplaza por tramos con el mismo color y grosor. Rectángulos, polígonos y tokens siguen como hoy: una sola cobertura.
3. **Daño por tramo**: clic derecho en un tramo, el mismo menú de ahora, para GM y jugadores. Tramo destruido = transparente y punteado (un hueco). "Restaurar" el tramo o la pared entera.
4. **Cómo se ve**: tramos enteros sin cartel; los dañados muestran sus HP. El panel lista cada pared con material y tramos rotos, con botón para seleccionarla.
5. **Reglas**: no cambian (`src/rules/coverTable.ts` y `src/rules/cover.ts` siguen iguales; nada que sincronizar con el Omni-Deck). Nuevo: la cuenta de cómo cortar una línea en tramos, con tests.

## Afuera o interpretado

- Visión y niebla de guerra.
- Daño de área (explosivos) a varios tramos: se carga tramo por tramo.
- Diagonales: se cortan por su largo real, contado en casillas (interpretación; el libro no lo dice).

## A verificar al programar

Los tramos van bloqueados para que los jugadores no los muevan ni borren. Si Owlbear no deja a los jugadores abrir el clic derecho sobre algo bloqueado, el jugador daña desde una herramienta "Dañar cobertura".
