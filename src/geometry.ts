// Cuentas puras para cortar paredes en tramos (plan 1). Core p.182: los HP de cobertura son por sección de 2 m x 2 m (una casilla). [Claude Code · 2026-11-21]

export interface Vec {
  x: number;
  y: number;
}

export type Segment = [Vec, Vec];

export function distance(a: Vec, b: Vec): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Corta una polilínea en tramos de una casilla. Cada lado se corta por separado en partes iguales,
 * tantas como casillas mide redondeado (mínimo 1). Así una pared en diagonal se cuenta por su largo real
 * (interpretación del plan 1; el libro no habla de diagonales).
 */
export function splitIntoSections(points: Vec[], cell: number): Segment[] {
  if (!(cell > 0)) return [];
  const out: Segment[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = distance(a, b);
    if (len === 0) continue;
    const n = Math.max(1, Math.round(len / cell));
    for (let k = 0; k < n; k++) {
      out.push([lerp(a, b, k / n), lerp(a, b, (k + 1) / n)]);
    }
  }
  return out;
}

function lerp(a: Vec, b: Vec, t: number): Vec {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Pasa un punto local de un ítem a coordenadas de la escena (escala, rotación en grados y posición). */
export function toWorld(p: Vec, position: Vec, rotation: number, scale: Vec): Vec {
  const r = (rotation * Math.PI) / 180;
  const x = p.x * scale.x;
  const y = p.y * scale.y;
  return {
    x: position.x + x * Math.cos(r) - y * Math.sin(r),
    y: position.y + x * Math.sin(r) + y * Math.cos(r),
  };
}
