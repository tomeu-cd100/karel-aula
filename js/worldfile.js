// Format de fitxer .w de Stanford Karel:
//   Dimension: (8, 8)
//   Wall: (3, 2); east
//   Beeper: (2, 1); 1
//   Karel: (1, 1); east
//   BeeperBag: INFINITY
// Les línies que no s'entenen (Speed, Color…) s'ignoren.

import { createWorld, setWall, addBeepers, inside, DIRS, MAX_SIZE } from './world.js';

const COORD = /\(\s*(\d+)\s*,\s*(\d+)\s*\)/;
const clampSize = n => Math.min(MAX_SIZE, Math.max(1, n));

export function parseWorld(text) {
  const lines = String(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const entries = lines.map(line => {
    const m = line.match(/^(\w+)\s*:\s*(.*)$/);
    return m ? { key: m[1].toLowerCase(), rest: m[2] } : null;
  }).filter(Boolean);

  const dim = entries.find(e => e.key === 'dimension')?.rest.match(COORD);
  const w = createWorld(dim ? clampSize(Number(dim[1])) : 8, dim ? clampSize(Number(dim[2])) : 8);

  for (const { key, rest } of entries) {
    const c = rest.match(COORD);
    const after = c ? rest.slice(c.index + c[0].length).replace(/^[\s;]+/, '').trim().toLowerCase() : '';
    const x = c ? Number(c[1]) : 0;
    const y = c ? Number(c[2]) : 0;
    if (key === 'wall' && c && DIRS.includes(after)) {
      setWall(w, x, y, after, true);
    } else if (key === 'beeper' && c) {
      const n = after === '' ? 1 : Number.parseInt(after, 10);
      if (Number.isFinite(n) && n > 0) addBeepers(w, x, y, n);
    } else if (key === 'karel' && c && inside(w, x, y)) {
      w.karel = { x, y, dir: DIRS.includes(after) ? after : 'east' };
    } else if (key === 'beeperbag') {
      const n = Number.parseInt(rest, 10);
      w.bag = Number.isFinite(n) && n >= 0 ? n : Infinity;
    }
  }
  return w;
}

export function serializeWorld(w) {
  const out = [`Dimension: (${w.cols}, ${w.rows})`];
  for (const key of [...w.walls].sort()) {
    const [x, y, dir] = key.split(',');
    out.push(`Wall: (${x}, ${y}); ${dir}`);
  }
  for (const [key, n] of [...w.beepers].sort()) {
    const [x, y] = key.split(',');
    out.push(`Beeper: (${x}, ${y}); ${n}`);
  }
  out.push(`Karel: (${w.karel.x}, ${w.karel.y}); ${w.karel.dir}`);
  out.push(`BeeperBag: ${w.bag === Infinity ? 'INFINITY' : w.bag}`);
  return `${out.join('\n')}\n`;
}
