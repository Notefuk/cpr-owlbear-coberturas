// Paredes de cobertura por tramos (plan 1, v1.1.0). Cada tramo es una línea con sus propios HP (Core p.182). [Claude Code · 2026-11-21]
import OBR, { buildLine, isCurve, isLine, type Item } from '@owlbear-rodeo/sdk';
import { type CoverMaterialId, type CoverThickness } from './rules/coverTable';
import { createCover, restoreCover } from './rules/cover';
import { COVER_KEY, coverTitle, EXT_ID, getCover, getWall, LABEL_KEY, restoreItemCover, WALL_KEY, type StoredCover, type WallInfo } from './coverItem';
import { splitIntoSections, toWorld, type Vec } from './geometry';

export const WALL_TOOL = `${EXT_ID}/wall-tool`;
export const WALL_MODE = `${EXT_ID}/wall-mode`;
export const DAMAGE_MODE = `${EXT_ID}/damage-mode`;

export interface WallToolSettings {
  material: CoverMaterialId;
  thickness: CoverThickness;
}

export const DEFAULT_WALL_SETTINGS: WallToolSettings = { material: 'concrete', thickness: 'thick' };

/** Color por material para las paredes nuevas. */
const MATERIAL_COLOR: Record<CoverMaterialId, string> = {
  steel: '#94a3b8',
  stone: '#a8a29e',
  bulletproof_glass: '#7dd3fc',
  concrete: '#d6d3d1',
  wood: '#b45309',
  plaster_foam_plastic: '#f5f5f4',
};

interface StrokeStyle {
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  strokeDash: number[];
}

/** GM: crea una pared cortada en tramos de una casilla. Devuelve cuántos tramos hizo (0 si el material no cubre). */
export async function createWall(points: Vec[], material: CoverMaterialId, thickness: CoverThickness, style?: StrokeStyle): Promise<number> {
  const cover = createCover(material, thickness);
  if (!cover) return 0;
  const dpi = await OBR.scene.grid.getDpi();
  const segments = splitIntoSections(points, dpi);
  if (segments.length === 0) return 0;
  const s: StrokeStyle = style ?? { strokeColor: MATERIAL_COLOR[material], strokeWidth: Math.max(4, dpi / 8), strokeOpacity: 1, strokeDash: [] };
  const wallId = crypto.randomUUID();
  const title = coverTitle(cover);
  const items = segments.map(([a, b], index) => {
    const stored: StoredCover = { ...cover, originalOpacity: s.strokeOpacity, originalDash: s.strokeDash };
    const wall: WallInfo = { wallId, index, count: segments.length };
    return buildLine()
      .startPosition(a)
      .endPosition(b)
      .strokeColor(s.strokeColor)
      .strokeWidth(s.strokeWidth)
      .strokeOpacity(s.strokeOpacity)
      .strokeDash(s.strokeDash)
      .layer('DRAWING')
      .locked(true)
      .name(`Pared ${title} ${index + 1}/${segments.length}`)
      .metadata({ [COVER_KEY]: stored, [WALL_KEY]: wall })
      .build();
  });
  await OBR.scene.items.addItems(items);
  return segments.length;
}

/** Puntos de una línea o trazo abierto, en coordenadas de la escena. */
function strokePoints(item: Item): Vec[] | null {
  if (isLine(item)) return [item.startPosition, item.endPosition].map((p) => toWorld(p, item.position, item.rotation, item.scale));
  if (isCurve(item) && !item.style.closed) return item.points.map((p) => toWorld(p, item.position, item.rotation, item.scale));
  return null;
}

/** GM: reemplaza una línea o trazo por una pared con el mismo trazo. Devuelve cuántos tramos hizo. */
export async function convertToWall(item: Item, material: CoverMaterialId, thickness: CoverThickness): Promise<number> {
  const points = strokePoints(item);
  if (!points || (!isLine(item) && !isCurve(item))) return 0;
  const { strokeColor, strokeWidth, strokeOpacity, strokeDash } = item.style;
  const n = await createWall(points, material, thickness, { strokeColor, strokeWidth, strokeOpacity, strokeDash });
  if (n > 0) await OBR.scene.items.deleteItems([item.id]);
  return n;
}

export async function getWallSections(wallId: string): Promise<Item[]> {
  return OBR.scene.items.getItems((i) => getWall(i)?.wallId === wallId);
}

/** GM: devuelve todos los tramos de la pared a sus HP máximos. */
export async function restoreWall(wallId: string): Promise<void> {
  for (const s of await getWallSections(wallId)) {
    const c = getCover(s);
    if (c && (c.destroyed || c.hp !== restoreCover(c).hp)) await restoreItemCover(s);
  }
}

/** GM: borra la pared entera (tramos y etiquetas). */
export async function deleteWall(wallId: string): Promise<void> {
  const sections = await getWallSections(wallId);
  const ids = new Set(sections.map((s) => s.id));
  const labels = await OBR.scene.items.getItems((i) => ids.has(i.metadata?.[LABEL_KEY] as string));
  await OBR.scene.items.deleteItems([...ids, ...labels.map((l) => l.id)]);
}
