// Página de fondo de la extensión: menú contextual, herramienta de pared y aplicación del daño (solo en el cliente del GM). [Claude Code · 2026-11-20]
import OBR, { buildLine, type Item, type Vector2 } from '@owlbear-rodeo/sdk';
import { applyDamageMessage, COVER_KEY, DAMAGE_CHANNEL, EXT_ID, getCover, LABEL_KEY, type DamageMessage } from './coverItem';
import { createWall, DAMAGE_MODE, DEFAULT_WALL_SETTINGS, WALL_MODE, WALL_TOOL, type WallToolSettings } from './wall';

const pageUrl = (path: string) => new URL(path, window.location.href).href;
const POPOVER_ID = `${EXT_ID}/cover-popover`;

/** El ítem cubierto al que apunta un clic: el ítem mismo o, si es la etiqueta de HP, el ítem al que está pegada. */
async function coverTarget(target: Item | undefined): Promise<Item | undefined> {
  if (!target) return undefined;
  const parentId = target.metadata?.[LABEL_KEY] as string | undefined;
  if (!parentId) return target;
  const [parent] = await OBR.scene.items.getItems([parentId]);
  return parent;
}

/**
 * Herramienta "Coberturas" (plan 1). Modo "Dañar o marcar" para todos: un clic en una cobertura abre el formulario
 * (las paredes van bloqueadas y Owlbear no deja abrirles el clic derecho con la herramienta de mover).
 * Modo "Trazar pared" solo para el GM: se arrastra sobre la grilla y crea una pared por tramos. [Claude Code · 2026-11-21]
 */
async function createWallTool(): Promise<void> {
  const wallIcon = pageUrl('wall.svg');
  const icon = pageUrl('icon.svg');
  await OBR.tool.create({
    id: WALL_TOOL,
    icons: [{ icon: wallIcon, label: 'Coberturas' }],
    defaultMode: DAMAGE_MODE,
    defaultMetadata: { ...DEFAULT_WALL_SETTINGS },
  });

  await OBR.tool.createMode({
    id: DAMAGE_MODE,
    icons: [{ icon, label: 'Dañar o marcar cobertura', filter: { activeTools: [WALL_TOOL] } }],
    cursors: [{ cursor: 'pointer', filter: { target: [{ key: ['metadata', COVER_KEY], value: undefined, operator: '!=' }] } }, { cursor: 'default' }],
    preventDrag: { dragging: false },
    async onToolClick(_context, event) {
      const item = await coverTarget(event.target);
      // El fondo del mapa no es cobertura: un clic en el vacío no abre nada.
      if (!item || item.layer === 'MAP') return;
      const gm = (await OBR.player.getRole()) === 'GM';
      if (!gm && !getCover(item)) return;
      // Punto de la escena a la pantalla: escala del zoom más el corrimiento de la vista.
      const [vp, zoom] = await Promise.all([OBR.viewport.getPosition(), OBR.viewport.getScale()]);
      const screen = { x: event.pointerPosition.x * zoom + vp.x, y: event.pointerPosition.y * zoom + vp.y };
      await OBR.popover.open({
        id: POPOVER_ID,
        url: pageUrl(`cover.html?item=${encodeURIComponent(item.id)}`),
        width: 280,
        height: 190,
        anchorReference: 'POSITION',
        anchorPosition: { left: screen.x, top: screen.y },
        anchorOrigin: { horizontal: 'CENTER', vertical: 'BOTTOM' },
        transformOrigin: { horizontal: 'CENTER', vertical: 'TOP' },
      });
    },
  });

  let start: Vector2 | null = null;
  let previewId: string | null = null;
  const snap = (p: Vector2) => OBR.scene.grid.snapPosition(p, 1, true, false);
  const clearPreview = async () => {
    if (previewId) await OBR.scene.local.deleteItems([previewId]);
    previewId = null;
    start = null;
  };

  await OBR.tool.createMode({
    id: WALL_MODE,
    icons: [{ icon: wallIcon, label: 'Trazar pared', filter: { activeTools: [WALL_TOOL], roles: ['GM'] } }],
    cursors: [{ cursor: 'crosshair' }],
    async onToolDragStart(_context, event) {
      start = await snap(event.pointerPosition);
      const dpi = await OBR.scene.grid.getDpi();
      const preview = buildLine()
        .startPosition(start)
        .endPosition(start)
        .strokeColor('#facc15')
        .strokeWidth(Math.max(4, dpi / 8))
        .strokeDash([dpi / 4, dpi / 8])
        .layer('DRAWING')
        .build();
      previewId = preview.id;
      await OBR.scene.local.addItems([preview]);
    },
    async onToolDragMove(_context, event) {
      if (!start || !previewId) return;
      const end = await snap(event.pointerPosition);
      await OBR.scene.local.updateItems([previewId], (drafts) => {
        for (const d of drafts) (d as unknown as { endPosition: Vector2 }).endPosition = end;
      });
    },
    async onToolDragEnd(context, event) {
      const from = start;
      await clearPreview();
      if (!from) return;
      const end = await snap(event.pointerPosition);
      const settings = { ...DEFAULT_WALL_SETTINGS, ...(context.metadata as Partial<WallToolSettings>) };
      const n = await createWall([from, end], settings.material, settings.thickness);
      if (n === 0 && (from.x !== end.x || from.y !== end.y)) {
        await OBR.notification.show('Ese material con ese grosor no es cobertura (Core p.182).', 'WARNING');
      }
    },
    async onToolDragCancel() {
      await clearPreview();
    },
  });

  await OBR.tool.createAction({
    id: `${EXT_ID}/wall-settings`,
    icons: [{ icon, label: 'Material de la pared', filter: { activeTools: [WALL_TOOL], roles: ['GM'] } }],
    onClick() {
      OBR.action.open();
    },
  });
}

OBR.onReady(() => {
  const icon = pageUrl('icon.svg');
  OBR.contextMenu.create({
    id: `${EXT_ID}/cover-menu`,
    icons: [
      // El GM ve la entrada en cualquier ítem (para marcarlo); el jugador, solo en coberturas.
      { icon, label: 'Cobertura', filter: { roles: ['GM'], max: 1, every: [{ key: 'layer', value: 'MAP', operator: '!=' }] } },
      { icon, label: 'Cobertura', filter: { roles: ['PLAYER'], max: 1, every: [{ key: ['metadata', COVER_KEY], value: undefined, operator: '!=' }] } },
    ],
    embed: { url: pageUrl('cover.html'), height: 230 },
    onClick() {},
  });

  createWallTool();

  OBR.broadcast.onMessage(DAMAGE_CHANNEL, async (event) => {
    if ((await OBR.player.getRole()) !== 'GM') return;
    await applyDamageMessage(event.data as DamageMessage);
  });

  OBR.broadcast.onMessage(`${EXT_ID}/cover-log`, (event) => {
    OBR.notification.show(String(event.data), 'INFO');
  });
});
