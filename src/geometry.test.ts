// Tramos de pared: una sección por casilla (Core p.182). [Claude Code · 2026-11-21]
import { describe, expect, it } from 'vitest';
import { distance, splitIntoSections, toWorld } from './geometry';

const CELL = 150;

describe('cortar una pared en tramos de una casilla', () => {
  it('una pared recta de 5 casillas da 5 tramos de una casilla', () => {
    const s = splitIntoSections([{ x: 0, y: 0 }, { x: 750, y: 0 }], CELL);
    expect(s).toHaveLength(5);
    for (const [a, b] of s) expect(distance(a, b)).toBeCloseTo(CELL);
    expect(s[0][0]).toEqual({ x: 0, y: 0 });
    expect(s[4][1]).toEqual({ x: 750, y: 0 });
  });

  it('los tramos quedan pegados, sin huecos', () => {
    const s = splitIntoSections([{ x: 0, y: 0 }, { x: 0, y: 450 }], CELL);
    for (let i = 1; i < s.length; i++) expect(s[i][0]).toEqual(s[i - 1][1]);
  });

  it('una diagonal de 3 casillas mide 4,24 y se corta en 4 tramos', () => {
    const s = splitIntoSections([{ x: 0, y: 0 }, { x: 450, y: 450 }], CELL);
    expect(s).toHaveLength(4);
  });

  it('un tramo más corto que una casilla sigue siendo un tramo', () => {
    expect(splitIntoSections([{ x: 0, y: 0 }, { x: 40, y: 0 }], CELL)).toHaveLength(1);
  });

  it('una pared en L corta cada lado por separado', () => {
    const s = splitIntoSections([{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 450 }], CELL);
    expect(s).toHaveLength(5);
  });

  it('ignora puntos repetidos y casillas inválidas', () => {
    expect(splitIntoSections([{ x: 5, y: 5 }, { x: 5, y: 5 }], CELL)).toHaveLength(0);
    expect(splitIntoSections([{ x: 0, y: 0 }, { x: 300, y: 0 }], 0)).toHaveLength(0);
  });
});

describe('coordenadas de un dibujo', () => {
  it('aplica escala, rotación y posición', () => {
    const p = toWorld({ x: 10, y: 0 }, { x: 100, y: 100 }, 90, { x: 2, y: 2 });
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(120);
  });
});
