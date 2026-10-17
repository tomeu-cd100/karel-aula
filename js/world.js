// Món de Karel. Coordenades com Stanford Karel: avinguda x (1 = esquerra),
// carrer y (1 = baix). Les vores del món sempre fan de paret.

import { KarelError } from './karel/errors.js';

export const DIRS = ['east', 'north', 'west', 'south'];
export const DIR_NAMES = { east: "a l'est", north: 'al nord', west: "a l'oest", south: 'al sud' };
const DELTA = { east: [1, 0], north: [0, 1], west: [-1, 0], south: [0, -1] };
export const MAX_SIZE = 20;

export function createWorld(cols = 8, rows = 8) {
  return {
    cols, rows,
    karel: { x: 1, y: 1, dir: 'east' },
    beepers: new Map(), // "x,y" → quantitat
    walls: new Set(),   // "x,y,east" o "x,y,north" (forma normalitzada)
    bag: Infinity,
  };
}

export function cloneWorld(w) {
  return { ...w, karel: { ...w.karel }, beepers: new Map(w.beepers), walls: new Set(w.walls) };
}

export const inside = (w, x, y) => x >= 1 && y >= 1 && x <= w.cols && y <= w.rows;

// Cada paret es guarda una sola vegada: l'oest de (x, y) és l'est de (x-1, y).
export function wallKey(x, y, dir) {
  if (dir === 'east') return `${x},${y},east`;
  if (dir === 'north') return `${x},${y},north`;
  if (dir === 'west') return `${x - 1},${y},east`;
  return `${x},${y - 1},north`;
}

export function isBorder(w, x, y, dir) {
  const [dx, dy] = DELTA[dir];
  return !inside(w, x + dx, y + dy);
}

export function isBlocked(w, x, y, dir) {
  return isBorder(w, x, y, dir) || w.walls.has(wallKey(x, y, dir));
}

export function setWall(w, x, y, dir, on) {
  if (!inside(w, x, y) || isBorder(w, x, y, dir)) return;
  const key = wallKey(x, y, dir);
  if (on) w.walls.add(key);
  else w.walls.delete(key);
}

export function toggleWall(w, x, y, dir) {
  setWall(w, x, y, dir, !isBlocked(w, x, y, dir));
}

export const beepersAt = (w, x, y) => w.beepers.get(`${x},${y}`) ?? 0;

export function addBeepers(w, x, y, n) {
  if (!inside(w, x, y)) return;
  const count = Math.max(0, beepersAt(w, x, y) + n);
  if (count) w.beepers.set(`${x},${y}`, count);
  else w.beepers.delete(`${x},${y}`);
}

export function resizeWorld(w, cols, rows) {
  const out = createWorld(cols, rows);
  out.bag = w.bag;
  for (const [key, n] of w.beepers) {
    const [x, y] = key.split(',').map(Number);
    addBeepers(out, x, y, n);
  }
  for (const key of w.walls) {
    const [x, y, dir] = key.split(',');
    setWall(out, Number(x), Number(y), dir, true);
  }
  const { x, y, dir } = w.karel;
  out.karel = { x: Math.min(x, cols), y: Math.min(y, rows), dir };
  return out;
}

const turn = (dir, steps) => DIRS[(DIRS.indexOf(dir) + steps + 4) % 4];

// Condicions (no modifiquen el món)
export const frontIsClear = w => !isBlocked(w, w.karel.x, w.karel.y, w.karel.dir);
export const leftIsClear = w => !isBlocked(w, w.karel.x, w.karel.y, turn(w.karel.dir, 1));
export const rightIsClear = w => !isBlocked(w, w.karel.x, w.karel.y, turn(w.karel.dir, -1));
export const beepersPresent = w => beepersAt(w, w.karel.x, w.karel.y) > 0;
export const beepersInBag = w => w.bag > 0;

// Accions: llancen KarelError si Karel no pot fer-les.
export function move(w) {
  if (!frontIsClear(w)) {
    const what = isBorder(w, w.karel.x, w.karel.y, w.karel.dir) ? 'la vora del món' : 'una paret';
    throw new KarelError(`Karel ha xocat amb ${what}. Comprova abans amb front_is_clear().`);
  }
  const [dx, dy] = DELTA[w.karel.dir];
  w.karel.x += dx;
  w.karel.y += dy;
}

export function turnLeft(w) {
  w.karel.dir = turn(w.karel.dir, 1);
}

export function putBeeper(w) {
  if (!beepersInBag(w)) throw new KarelError('Karel no té beepers a la bossa.');
  w.bag -= 1;
  addBeepers(w, w.karel.x, w.karel.y, 1);
}

export function pickBeeper(w) {
  if (!beepersPresent(w)) {
    throw new KarelError('No hi ha cap beeper per recollir aquí. Comprova abans amb beepers_present().');
  }
  w.bag += 1;
  addBeepers(w, w.karel.x, w.karel.y, -1);
}
