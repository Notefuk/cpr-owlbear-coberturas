// Extensión de Owlbear Rodeo para coberturas (plan 29, v5.47.0). Lógica compartida por las páginas. [Claude Code · 2026-11-20]
// Regla: Core p.182. Datos: data/coverTable.ts. Motor: engine/cover.ts.
import OBR, { buildLabel, isCurve, isLine, isShape, type Item } from '@owlbear-rodeo/sdk';
import { getCoverMaterial, type CoverMaterialId, type CoverThickness } from './rules/coverTable';
import { applyCoverDamage, createCover, restoreCover, type CoverState } from './rules/cover';

export const EXT_ID = 'io.github.notefuk.cpr';
/** Dato de cobertura guardado en el ítem del mapa. */
export const COVER_KEY = `${EXT_ID}/cover`;
/** Marca la etiqueta que muestra los HP; guarda el id del ítem cubierto. */
export const LABEL_KEY = `${EXT_ID}/cover-label`;
/** Canal por el que un jugador pide aplicar daño; lo aplica el cliente del GM. */
export const DAMAGE_CHANNEL = `${EXT_ID}/cover-damage`;
/** Tramo de una pared de cobertura (plan 1): a qué pared pertenece y qué número de tramo es. [Claude Code · 2026-11-21] */
export const WALL_KEY = `${EXT_ID}/wall`;

export interface StoredCover extends CoverState {
  /** Id del último pedido de daño aplicado, para no aplicarlo dos veces. */
  lastDamageId?: string;
  /** Opacidad original para restaurarla: el relleno en formas y polígonos, el trazo en líneas y trazos. */
  originalOpacity?: number;
  /** Trazo punteado original de una línea, para restaurarlo. */
  originalDash?: number[];
}

export interface WallInfo {
  wallId: string;
  index: number;
  count: number;
}

export function getWall(item: Item | undefined): WallInfo | null {
  const raw = item?.metadata?.[WALL_KEY] as WallInfo | undefined;
  return raw && typeof raw.wallId === 'string' ? raw : null;
}

/** Líneas y trazos abiertos: se pueden convertir en pared. */
export function isStroke(item: Item): boolean {
  return isLine(item) || (isCurve(item) && !item.style.closed);
}

export interface DamageMessage {
  id: string;
  itemId: string;
  damage: number;
  by: string;
}

export function getCover(item: Item | undefined): StoredCover | null {
  const raw = item?.metadata?.[COVER_KEY] as StoredCover | undefined;
  return raw && typeof raw.hp === 'number' ? raw : null;
}

export function coverTitle(c: CoverState): string {
  return `${getCoverMaterial(c.material).name} ${c.thickness === 'thick' ? 'gruesa' : 'fina'}`;
}

export function labelText(c: CoverState): string {
  return c.destroyed ? `${coverTitle(c)} · DESTRUIDA` : `${coverTitle(c)} · ${c.hp}/${c.maxHp} HP`;
}

function labelColor(c: CoverState): string {
  if (c.destroyed) return '#7f1d1d';
  return c.hp * 2 <= c.maxHp ? '#92400e' : '#164e63';
}

async function findLabels(itemId: string): Promise<Item[]> {
  return OBR.scene.items.getItems((i) => i.metadata?.[LABEL_KEY] === itemId);
}

/** Crea o actualiza la etiqueta adjunta al ítem cubierto. Los tramos de pared solo la muestran si están dañados. */
async function syncLabel(itemId: string, c: CoverState, isSection = false): Promise<void> {
  const labels = await findLabels(itemId);
  if (isSection && (c.destroyed || c.hp === c.maxHp)) {
    if (labels.length) await OBR.scene.items.deleteItems(labels.map((l) => l.id));
    return;
  }
  const text = isSection ? `${c.hp}/${c.maxHp}` : labelText(c);
  if (labels.length > 0) {
    await OBR.scene.items.updateItems(labels, (drafts) => {
      for (const d of drafts) {
        if (d.type !== 'LABEL') continue;
        const label = d as unknown as { text: { plainText: string }; style: { backgroundColor: string } };
        label.text.plainText = text;
        label.style.backgroundColor = labelColor(c);
      }
    });
    return;
  }
  const bounds = await OBR.scene.items.getItemBounds([itemId]);
  const label = buildLabel()
    .plainText(text)
    .backgroundColor(labelColor(c))
    .backgroundOpacity(0.9)
    .fontSize(isSection ? 12 : 14)
    .pointerDirection('DOWN')
    .pointerHeight(6)
    .pointerWidth(10)
    .position({ x: bounds.center.x, y: isSection ? bounds.center.y : bounds.min.y })
    .attachedTo(itemId)
    .layer('ATTACHMENT')
    .locked(true)
    .disableHit(true)
    .disableAttachmentBehavior(['ROTATION', 'SCALE'])
    .metadata({ [LABEL_KEY]: itemId })
    .build();
  await OBR.scene.items.addItems([label]);
}

/** Trazo punteado de un tramo destruido: se ve como un hueco en la pared. */
const DESTROYED_DASH = [12, 12];

/** Guarda el estado en el ítem; a 0 HP baja la opacidad (relleno en formas, trazo punteado en líneas). */
async function writeCover(item: Item, next: StoredCover): Promise<void> {
  await OBR.scene.items.updateItems([item.id], (drafts) => {
    for (const d of drafts) {
      if (isShape(d) || (isCurve(d) && d.style.closed)) {
        if (next.originalOpacity === undefined) next.originalOpacity = d.style.fillOpacity;
        d.style.fillOpacity = next.destroyed ? Math.min(0.2, next.originalOpacity) : next.originalOpacity;
      } else if (isLine(d) || isCurve(d)) {
        if (next.originalOpacity === undefined) next.originalOpacity = d.style.strokeOpacity;
        if (next.originalDash === undefined) next.originalDash = d.style.strokeDash;
        d.style.strokeOpacity = next.destroyed ? Math.min(0.25, next.originalOpacity) : next.originalOpacity;
        d.style.strokeDash = next.destroyed ? DESTROYED_DASH : next.originalDash;
      }
      d.metadata[COVER_KEY] = next;
    }
  });
  await syncLabel(item.id, next, getWall(item) !== null);
}

/** GM: convierte el ítem en cobertura. Devuelve false si el material/grosor no es cobertura. */
export async function markCover(item: Item, material: CoverMaterialId, thickness: CoverThickness): Promise<boolean> {
  const cover = createCover(material, thickness);
  if (!cover) return false;
  await writeCover(item, { ...cover });
  return true;
}

/** GM: aplica un pedido de daño (de cualquier jugador). Ignora pedidos repetidos. */
export async function applyDamageMessage(msg: DamageMessage): Promise<void> {
  const [item] = await OBR.scene.items.getItems([msg.itemId]);
  const cover = getCover(item);
  if (!item || !cover || cover.lastDamageId === msg.id) return;
  const result = applyCoverDamage(cover, msg.damage);
  await writeCover(item, { ...cover, ...result.cover, lastDamageId: msg.id });
  const lost = result.lost > 0 ? ` Sobran ${result.lost}: se pierden (Core p.182).` : '';
  const wall = getWall(item);
  const what = wall ? `${coverTitle(cover)}, tramo ${wall.index + 1}/${wall.count}` : coverTitle(cover);
  const text = result.cover.destroyed
    ? `${what}: DESTRUIDO por ${msg.by}.${lost}`
    : `${what}: ${msg.by} le hizo ${result.absorbed}, quedan ${result.cover.hp}/${cover.maxHp} HP.`;
  await OBR.broadcast.sendMessage(`${EXT_ID}/cover-log`, text, { destination: 'ALL' });
}

/** Cualquier jugador: pide aplicar daño. Lo aplica el cliente del GM. */
export async function requestDamage(itemId: string, damage: number): Promise<void> {
  const by = await OBR.player.getName();
  const msg: DamageMessage = { id: crypto.randomUUID(), itemId, damage, by };
  await OBR.broadcast.sendMessage(DAMAGE_CHANNEL, msg, { destination: 'ALL' });
}

/** GM: vuelve la cobertura a sus HP máximos. */
export async function restoreItemCover(item: Item): Promise<void> {
  const cover = getCover(item);
  if (!cover) return;
  await writeCover(item, { ...cover, ...restoreCover(cover) });
}

/** GM: deja de ser cobertura (borra el dato, la etiqueta y devuelve la opacidad). */
export async function removeCover(item: Item): Promise<void> {
  const cover = getCover(item);
  await OBR.scene.items.updateItems([item.id], (drafts) => {
    for (const d of drafts) {
      if ((isShape(d) || (isCurve(d) && d.style.closed)) && cover?.originalOpacity !== undefined) d.style.fillOpacity = cover.originalOpacity;
      delete d.metadata[COVER_KEY];
    }
  });
  const labels = await findLabels(item.id);
  if (labels.length) await OBR.scene.items.deleteItems(labels.map((l) => l.id));
}
