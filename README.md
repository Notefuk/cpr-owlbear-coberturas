# Coberturas Cyberpunk RED para Owlbear Rodeo

[Claude Code · 2026-11-21]

Extensión de [Owlbear Rodeo](https://www.owlbear.rodeo) con las coberturas del Core p.182 de Cyberpunk RED. Es un proyecto aparte del CPR Omni-Deck: no usa sus fichas, su nube ni su código, salvo una copia de la tabla y las reglas de cobertura (ver "Sincronía con el Omni-Deck").

## Qué hace

- **Paredes por tramos** (v1.1.0, plan 1) [Claude Code · 2026-11-21]: herramienta "Coberturas" (ícono de ladrillos en la barra de la derecha).
  - Modo "Trazar pared" (solo GM): el material y el grosor se eligen en el panel; se arrastra sobre la grilla y la pared queda cortada en tramos de una casilla (2 m x 2 m, Core p.182), cada uno con sus HP. Los tramos van bloqueados: los jugadores no los mueven ni borran.
  - Modo "Dañar o marcar" (todos): clic en un tramo o en una cobertura abre el formulario de daño. Un tramo destruido queda punteado y transparente: un hueco en la pared. Los tramos dañados muestran sus HP. El GM restaura el tramo o la pared entera, o la borra.
  - Una línea o trazo abierto ya dibujado se convierte en pared: modo "Dañar o marcar" (o clic derecho) sobre la línea → "Convertir en pared". Conserva su color y grosor; las líneas muy finas cuestan de clickear.
  - Diagonales: se cortan por su largo real contado en casillas (interpretación; el libro no habla de diagonales).
- **Objetos sueltos** (un auto, un contenedor): el GM selecciona el objeto → ⋮ → "Cobertura" (o clic con el modo "Dañar o marcar") → material y grosor. Es una sola cobertura con una etiqueta de HP.
- Cualquier jugador carga daño. A 0 HP queda destruida y se avisa el daño que se pierde (Core p.182).
- El ícono de arriba a la izquierda abre el panel: material de la herramienta de pared (GM), paredes con sus tramos rotos, coberturas sueltas y la tabla.
- El daño que carga un jugador lo aplica el navegador del GM, así que el GM tiene que estar en la sala.
- Los datos quedan en el mapa de Owlbear: `io.github.notefuk.cpr/cover` (HP) en cada objeto o tramo y `io.github.notefuk.cpr/wall` (pared y número de tramo) en los tramos.
- Afuera: las paredes no tapan la visión (eso es Dynamic Fog of War) y el daño de área a varios tramos se carga tramo por tramo.

## Instalar en Owlbear (una vez, el GM)

1. Perfil → Extensions → Manage → "+" → pegar la URL del manifest → Add.
2. En la sala: lápiz de la sala → Extensions → activarla. Los jugadores la reciben solos.

URLs del manifest:
- Publicada: `https://notefuk.github.io/cpr-owlbear-coberturas/manifest.json`
- Local, para probar: `http://localhost:5179/manifest.json` (con `npm run dev`). Chrome pide permiso de red local en cada navegador.

## Desarrollo

```bash
npm ci
npm run dev          # servidor local en el puerto 5179, con CORS
npm test             # tests de las reglas de cobertura
npm run build        # build local (rutas en /)
npm run build:pages  # build para GitHub Pages (rutas en /cpr-owlbear-coberturas/)
```

Owlbear no acepta rutas relativas en el manifest ("Invalid URL"). Por eso el manifest lo genera `vite.config.ts` con la carpeta donde se publica (`PAGES_DIR`). Si cambia el nombre del repo o el lugar donde se publica, se cambia ahí.

## Publicar [Claude Code · 2026-11-21]

Repo: https://github.com/Notefuk/cpr-owlbear-coberturas. GitHub Pages sirve la rama `gh-pages` (raíz), que tiene solo el build. Para publicar una versión nueva (con OK de Giuliano):

1. `npm test` y `npm run build:pages`.
2. Copiar `dist/` (más un `.nojekyll` vacío) a la rama `gh-pages`, commitear y pushear.
3. Comprobar que `https://notefuk.github.io/cpr-owlbear-coberturas/manifest.json` responde. Owlbear toma la versión nueva al recargar la sala.

## Archivos

| Archivo | Qué es |
|---|---|
| `src/coverItem.ts` | Lógica: marcar, dañar, restaurar, quitar, la etiqueta |
| `src/wall.ts` | Paredes: crear por tramos, convertir líneas, restaurar y borrar la pared |
| `src/geometry.ts` (+ test) | Cuentas puras: cortar una línea en tramos de una casilla |
| `src/background.ts` | Página de fondo: menú "Cobertura", herramienta "Coberturas" y aplicar el daño de los jugadores (solo en el navegador del GM) |
| `src/CoverMenu.tsx` | Formulario del menú "Cobertura" y del modo "Dañar o marcar" |
| `src/CoverPanel.tsx` | Panel del ícono: material de la pared, lista y tabla |
| `docs/plans/` | Planes aprobados (no se editan) |
| `src/useObr.ts`, `src/owlbear.css` | Funciones comunes y estilos |
| `src/rules/` | Copia de la tabla y las reglas de cobertura del Omni-Deck, con sus tests |
| `background.html`, `cover.html`, `index.html` | Las tres páginas que abre Owlbear |

## Sincronía con el Omni-Deck

`src/rules/` es copia de dos archivos del CPR Omni-Deck. **Si se cambia uno, se cambia el otro igual**:

| Acá | En el Omni-Deck (`cpr-omni-deck/frontend/src/`) | Qué usa la extensión |
|---|---|---|
| `src/rules/coverTable.ts` | `data/coverTable.ts` | `COVER_MATERIALS` (HP fina/gruesa por material), `COVER_PAGE_REF`, `getCoverMaterial`, tipos `CoverMaterialId` y `CoverThickness` |
| `src/rules/cover.ts` | `engine/cover.ts` | `createCover`, `coverMaxHp`, `applyCoverDamage`, `restoreCover`, tipo `CoverState` |
| `src/rules/cover.test.ts` | `engine/__tests__/cover.test.ts` | Los mismos casos |

Qué hace falta sincronizar: cualquier cambio de valores (HP, materiales), de nombres o de firmas de esas piezas. Al terminar, `npm test` en los dos proyectos.

Cuidado con los `id` de material (`steel`, `concrete`, ...): están guardados en las coberturas de los mapas de Owlbear. Si se renombra uno, las coberturas ya marcadas con el nombre viejo dejan de reconocerse.
