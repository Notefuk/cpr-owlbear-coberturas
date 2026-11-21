// Formulario embebido en el menú contextual "Cobertura": marcar (GM), dañar (todos), restaurar y quitar (GM). [Claude Code · 2026-11-20]
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { COVER_MATERIALS, COVER_PAGE_REF, type CoverMaterialId, type CoverThickness } from './rules/coverTable';
import { applyCoverDamage, coverMaxHp } from './rules/cover';
import { coverTitle, getCover, getWall, isStroke, markCover, removeCover, requestDamage, restoreItemCover } from './coverItem';
import { convertToWall, deleteWall, restoreWall } from './wall';
import { useObrReady, useRole, useSceneItems, useSelection } from './useObr';
import './owlbear.css';

const ITEM_FROM_URL = new URLSearchParams(window.location.search).get('item');

function MarkForm({ onMark, asWall }: { onMark: (m: CoverMaterialId, t: CoverThickness) => void; asWall?: boolean }) {
  const [material, setMaterial] = useState<CoverMaterialId>('concrete');
  return (
    <>
      <h1>{asWall ? 'Convertir en pared de cobertura' : 'Marcar como cobertura'}</h1>
      <div className="row">
        <select value={material} onChange={(e) => setMaterial(e.target.value as CoverMaterialId)} aria-label="Material">
          {COVER_MATERIALS.map((m) => (
            <option key={m.id} value={m.id}>{m.name} ({m.label})</option>
          ))}
        </select>
      </div>
      <div className="row">
        {(['thin', 'thick'] as const).map((t) => {
          const hp = coverMaxHp(material, t);
          return (
            <button key={t} type="button" className="primary" disabled={hp === null} onClick={() => onMark(material, t)}>
              {t === 'thick' ? 'Gruesa' : 'Fina'} ({hp === null ? 'no cubre' : `${hp} HP`})
            </button>
          );
        })}
      </div>
      <p className="muted">
        {asWall ? 'Se corta en tramos de una casilla (2 m), cada uno con sus HP. ' : 'Una casilla de 2 m x 2 m. '}
        HP según {COVER_PAGE_REF}.
      </p>
    </>
  );
}

function CoverMenu() {
  const ready = useObrReady();
  const role = useRole(ready);
  const items = useSceneItems(ready);
  const selection = useSelection(ready);
  const [damage, setDamage] = useState(0);
  const [busy, setBusy] = useState(false);

  if (!ready || !role) return <p className="muted">Cargando…</p>;
  // Desde la herramienta "Coberturas" el ítem llega por la URL; desde el clic derecho, es el seleccionado.
  const item = items.find((i) => i.id === (ITEM_FROM_URL ?? selection[0]));
  if (!item) return <p className="muted">Seleccioná un objeto del mapa.</p>;
  const cover = getCover(item);
  const wall = getWall(item);
  const gm = role === 'GM';

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  if (!cover) {
    if (!gm) return <p className="muted">Este objeto no es cobertura.</p>;
    return isStroke(item)
      ? <MarkForm asWall onMark={(m, t) => run(() => convertToWall(item, m, t))} />
      : <MarkForm onMark={(m, t) => run(() => markCover(item, m, t))} />;
  }

  const preview = damage > 0 ? applyCoverDamage(cover, damage) : null;
  return (
    <>
      <h1>{coverTitle(cover)}{wall && <span className="muted"> · tramo {wall.index + 1}/{wall.count}</span>}</h1>
      {cover.destroyed ? (
        <p className="bad">{wall ? 'DESTRUIDO: este tramo ya no cubre.' : 'DESTRUIDA: ya no cubre.'}</p>
      ) : (
        <>
          <p>{cover.hp} / {cover.maxHp} HP</p>
          <div className="bar"><div style={{ width: `${(cover.hp / cover.maxHp) * 100}%` }} /></div>
          <div className="row">
            <input type="number" min={0} value={damage || ''} placeholder="Daño" aria-label="Daño"
              onChange={(e) => setDamage(Math.max(0, Number(e.target.value) || 0))} />
            <button type="button" className="primary" disabled={busy || damage <= 0}
              onClick={() => run(async () => { await requestDamage(item.id, damage); setDamage(0); })}>
              Aplicar daño
            </button>
          </div>
          {preview && preview.lost > 0 && (
            <p className="warn">Se destruye y sobran {preview.lost}: se pierden, no pasan a quien está detrás (salvo explosivos).</p>
          )}
          {cover.material === 'steel' && <p className="muted">Martial Arts y Brawling no la dañan sin Cyberarm o BODY 10.</p>}
          {!gm && <p className="muted">El daño lo aplica el GM: tiene que estar en la sala.</p>}
        </>
      )}
      {gm && !wall && (
        <div className="row">
          <button type="button" disabled={busy} onClick={() => run(() => restoreItemCover(item))}>Restaurar</button>
          <button type="button" disabled={busy} onClick={() => run(() => removeCover(item))}>Quitar cobertura</button>
        </div>
      )}
      {gm && wall && (
        <div className="row">
          <button type="button" disabled={busy} onClick={() => run(() => restoreItemCover(item))}>Restaurar tramo</button>
          <button type="button" disabled={busy} onClick={() => run(() => restoreWall(wall.wallId))}>Restaurar pared</button>
          <button type="button" disabled={busy} onClick={() => run(() => deleteWall(wall.wallId))}>Borrar pared</button>
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<CoverMenu />);
