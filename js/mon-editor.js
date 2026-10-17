// Eines de l'editor de mons. Torna true si el món ha canviat.

import { toggleWall, addBeepers, DIRS } from './world.js';

export function applyTool(world, hit, tool, { remove = false } = {}) {
  if (!hit) return false;
  const { x, y, side } = hit;
  if (tool === 'paret') {
    if (!side) return false;
    toggleWall(world, x, y, side);
    return true;
  }
  if (tool === 'beeper') {
    addBeepers(world, x, y, remove ? -1 : 1);
    return true;
  }
  if (tool === 'karel') {
    const k = world.karel;
    if (k.x === x && k.y === y) k.dir = DIRS[(DIRS.indexOf(k.dir) + 1) % 4];
    else world.karel = { x, y, dir: k.dir };
    return true;
  }
  return false;
}
