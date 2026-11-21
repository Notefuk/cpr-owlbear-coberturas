// Panel de la acción de la extensión: herramienta de pared, coberturas de la escena y tabla del Core p.182. [Claude Code · 2026-11-20]
// [Claude Code · 2026-11-21] Plan 1: material de la herramienta de pared y paredes agrupadas por tramos.
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import OBR, { type Item } from '@owlbear-rodeo/sdk';
import { COVER_MATERIALS, COVER_PAGE_REF, type CoverMaterialId, type CoverThickness } from './rules/coverTable';
import { coverMaxHp } from './rules/cover';
import { coverTitle, getCover, getWall, labelText, type StoredCover } from './coverItem';
import { DEFAULT_WALL_SETTINGS, WALL_MODE, WALL_TOOL, type WallToolSettings } from './wall';
import { useObrReady, useRole, useSceneItems } from './useObr';
import './owlbear.css';

function WallToolSettingsForm({ ready }: { ready: boolean }) {
  const [settings, setSettings] = useState<WallToolSettings>(DEFAULT_WALL_SETTINGS);
  useEffect(() => {
    if (!ready) return;
    OBR.tool.getMetadata(WALL_TOOL).then((m) => setSettings({ ...DEFAULT_WALL_SETTINGS, ...(m as Partial<WallToolSettings> | undefined) }));
  }, [ready]);
  const save = (next: WallToolSettings) => {
    setSettings(next);
    OBR.tool.setMetadata(WALL_TOOL, { ...next });
  };
  return (
    <>
      <h1>Herramienta de pared</h1>
      <div className="row">
        <select value={settings.material} aria-label="Material de la pared"
          onChange={(e) => {
            const material = e.target.value as CoverMaterialId;
            const thickness = coverMaxHp(material, settings.thickness) === null ? 'thick' : settings.thickness;
            save({ material, thickness });
          }}>
          {COVER_MATERIALS.map((m) => (
            <option key={m.id} value={m.id}>{m.name} ({m.label})</option>
          ))}
        </select>
      </div>
      <div className="row">
        {(['thin', 'thick'] as CoverThickness[]).map((t) => {
          const hp = coverMaxHp(settings.material, t);
          return (
            <button key={t} type="button" className={settings.thickness === t ? 'primary' : undefined} disabled={hp === null}
              onClick={() => save({ ...settings, thickness: t })}>
              {t === 'thick' ? 'Gruesa' : 'Fina'} ({hp === null ? 'no cubre' : `${hp} HP`})
            </button>
          );
        })}
      </div>
      <p className="muted">
        <button type="button" onClick={async () => { await OBR.tool.activateTool(WALL_TOOL); await OBR.tool.activateMode(WALL_TOOL, WALL_MODE); }}>Trazar pared</button>{' '}
        Arrastrá sobre la grilla: la pared se corta en tramos de una casilla. Para dañar o restaurar, modo "Dañar o marcar" de la misma herramienta y clic en el tramo.
      </p>
    </>
  );
}

interface WallGroup {
  wallId: string;
  sections: { item: Item; cover: StoredCover }[];
}

function CoverPanel() {
  const ready = useObrReady();
  const role = useRole(ready);
  const items = useSceneItems(ready);

  const walls = new Map<string, WallGroup>();
  const loose: { item: Item; cover: StoredCover }[] = [];
  for (const item of items) {
    const cover = getCover(item);
    if (!cover) continue;
    const wall = getWall(item);
    if (!wall) {
      loose.push({ item, cover });
      continue;
    }
    const g = walls.get(wall.wallId) ?? { wallId: wall.wallId, sections: [] };
    g.sections.push({ item, cover });
    walls.set(wall.wallId, g);
  }
  const empty = walls.size === 0 && loose.length === 0;

  return (
    <>
      {ready && role === 'GM' && <WallToolSettingsForm ready={ready} />}

      <h1 style={{ marginTop: 12 }}>Coberturas de la escena</h1>
      {!ready ? (
        <p className="muted">Abrí una escena.</p>
      ) : empty ? (
        <p className="muted">Ninguna todavía. El GM traza una pared con la herramienta, o marca un objeto: clic derecho → Cobertura.</p>
      ) : (
        <ul>
          {[...walls.values()].map((g) => {
            const broken = g.sections.filter((s) => s.cover.destroyed).length;
            const damaged = g.sections.filter((s) => !s.cover.destroyed && s.cover.hp < s.cover.maxHp).length;
            return (
              <li key={g.wallId} className="row">
                <span className={broken ? 'bad' : undefined}>
                  Pared {coverTitle(g.sections[0].cover)} · {g.sections.length} tramos
                  {broken ? ` · ${broken} roto${broken > 1 ? 's' : ''}` : ''}
                  {damaged ? ` · ${damaged} dañado${damaged > 1 ? 's' : ''}` : ''}
                </span>
                <button type="button" onClick={() => OBR.player.select(g.sections.map((s) => s.item.id), false)}>Seleccionar</button>
              </li>
            );
          })}
          {loose.map(({ item, cover }) => (
            <li key={item.id} className="row">
              <span className={cover.destroyed ? 'bad' : undefined}>{item.name ? `${item.name}: ` : ''}{labelText(cover)}</span>
              <button type="button" onClick={() => OBR.player.select([item.id], true)}>Seleccionar</button>
            </li>
          ))}
        </ul>
      )}

      <h1 style={{ marginTop: 12 }}>HP de cobertura ({COVER_PAGE_REF})</h1>
      <table>
        <thead><tr><th>Material</th><th className="n">Gruesa</th><th className="n">Fina</th></tr></thead>
        <tbody>
          {COVER_MATERIALS.map((m) => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td className="n">{m.thickHp}</td>
              <td className="n">{m.thinHp || 'no cubre'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">HP por sección de 2 m x 2 m (una casilla). Sin línea de visión no hay cobertura parcial. A 0 HP se destruye y el daño que sobra se pierde, salvo explosivos (Core p.174). El acero no lo dañan Martial Arts ni Brawling sin Cyberarm o BODY 10.</p>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<CoverPanel />);
