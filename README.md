# Coberturas Cyberpunk RED para Owlbear Rodeo

[Claude Code · 2026-11-21]

Extensión de [Owlbear Rodeo](https://www.owlbear.rodeo) con las coberturas del Core p.182 de Cyberpunk RED. Es un proyecto aparte del CPR Omni-Deck: no usa sus fichas, su nube ni su código, salvo una copia de la tabla y las reglas de cobertura (ver "Sincronía con el Omni-Deck").

## Qué hace

- El GM selecciona un objeto del mapa → ⋮ → "Cobertura" → elige material y grosor. Aparece una etiqueta con los HP.
- Cualquier jugador le carga daño. A 0 HP queda DESTRUIDA y se avisa el daño que se pierde (Core p.182). El GM puede restaurarla o quitarla.
- El ícono de arriba a la izquierda abre la lista de coberturas de la escena y la tabla.
- El daño que carga un jugador lo aplica el navegador del GM, así que el GM tiene que estar en la sala.
- Los datos quedan en el mapa de Owlbear (clave `io.github.notefuk.cpr/cover` en cada objeto).

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

## Archivos

| Archivo | Qué es |
|---|---|
| `src/coverItem.ts` | Lógica: marcar, dañar, restaurar, quitar, la etiqueta |
| `src/background.ts` | Página de fondo: menú "Cobertura" y aplicar el daño de los jugadores (solo en el navegador del GM) |
| `src/CoverMenu.tsx` | Formulario dentro del menú "Cobertura" |
| `src/CoverPanel.tsx` | Panel del ícono: lista y tabla |
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
