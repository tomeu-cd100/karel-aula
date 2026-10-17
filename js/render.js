// Dibuix del món en un canvas i conversió de clics en caselles i parets.

import { beepersAt, isBorder } from './world.js';

const MARGIN = 26; // espai per als números d'avingudes i carrers
const PAD = 8;
const ANGLE = { east: 0, north: -Math.PI / 2, west: Math.PI, south: Math.PI / 2 };

export function layout(world, maxSize = 600) {
  const free = maxSize - MARGIN - PAD;
  const cell = Math.max(12, Math.min(72, Math.floor(Math.min(free / world.cols, free / world.rows))));
  return {
    cell,
    left: MARGIN,
    top: PAD,
    width: MARGIN + world.cols * cell + PAD,
    height: PAD + world.rows * cell + MARGIN,
  };
}

// Centre de la casella (x, y) en píxels.
export function cellCenter(world, lay, x, y) {
  return {
    px: lay.left + (x - 0.5) * lay.cell,
    py: lay.top + (world.rows - y + 0.5) * lay.cell,
  };
}

// Casella sota el punt i, si el punt és a prop d'una vora interior, quina vora.
export function hitTest(world, lay, px, py) {
  const fx = (px - lay.left) / lay.cell;
  const fy = (py - lay.top) / lay.cell;
  const x = Math.floor(fx) + 1;
  const y = world.rows - Math.floor(fy);
  if (x < 1 || y < 1 || x > world.cols || y > world.rows) return null;
  const ox = fx - Math.floor(fx);
  const oy = fy - Math.floor(fy);
  const near = 0.22;
  const sides = [
    ['west', ox], ['east', 1 - ox], ['north', oy], ['south', 1 - oy],
  ].filter(([dir, d]) => d < near && !isBorder(world, x, y, dir)).sort((a, b) => a[1] - b[1]);
  return { x, y, side: sides[0]?.[0] ?? null };
}

export function drawWorld(ctx, world, lay) {
  const { cell, left, top } = lay;
  const w = world.cols * cell;
  const h = world.rows * cell;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, lay.width, lay.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(left, top, w, h);

  // números
  ctx.fillStyle = '#667';
  ctx.font = `${Math.min(13, Math.max(9, cell / 3))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let x = 1; x <= world.cols; x++) ctx.fillText(String(x), left + (x - 0.5) * cell, top + h + MARGIN / 2);
  for (let y = 1; y <= world.rows; y++) ctx.fillText(String(y), MARGIN / 2, top + (world.rows - y + 0.5) * cell);

  // cruïlles: una creueta petita al centre de cada casella
  ctx.strokeStyle = '#c3c9d6';
  ctx.lineWidth = 1;
  const arm = Math.max(2, cell * 0.08);
  ctx.beginPath();
  for (let x = 1; x <= world.cols; x++) {
    for (let y = 1; y <= world.rows; y++) {
      const { px, py } = cellCenter(world, lay, x, y);
      ctx.moveTo(px - arm, py); ctx.lineTo(px + arm, py);
      ctx.moveTo(px, py - arm); ctx.lineTo(px, py + arm);
    }
  }
  ctx.stroke();

  // beepers
  for (const [key, n] of world.beepers) {
    const [x, y] = key.split(',').map(Number);
    drawBeeper(ctx, cellCenter(world, lay, x, y), cell, n);
  }

  // parets i vora
  ctx.strokeStyle = '#1f2a44';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(3, cell * 0.08);
  ctx.beginPath();
  for (const key of world.walls) {
    const [xs, ys, dir] = key.split(',');
    const x = Number(xs);
    const y = Number(ys);
    const x0 = left + (x - 1) * cell;
    const y0 = top + (world.rows - y) * cell;
    if (dir === 'east') { ctx.moveTo(x0 + cell, y0); ctx.lineTo(x0 + cell, y0 + cell); }
    else { ctx.moveTo(x0, y0); ctx.lineTo(x0 + cell, y0); }
  }
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeRect(left, top, w, h);

  drawKarel(ctx, cellCenter(world, lay, world.karel.x, world.karel.y), cell, world.karel.dir,
    beepersAt(world, world.karel.x, world.karel.y) > 0);
  ctx.restore();
}

function drawBeeper(ctx, { px, py }, cell, n) {
  const r = cell * 0.32;
  ctx.fillStyle = '#9aa3b5';
  ctx.strokeStyle = '#4b5568';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px, py - r); ctx.lineTo(px + r, py); ctx.lineTo(px, py + r); ctx.lineTo(px - r, py);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (n > 1) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(9, cell * 0.28)}px system-ui, sans-serif`;
    ctx.fillText(String(n), px, py + 1);
  }
}

// Karel dibuixat mirant a l'est i girat segons la direcció.
function drawKarel(ctx, { px, py }, cell, dir, overBeeper) {
  const s = cell * 0.74;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(ANGLE[dir]);
  if (overBeeper) ctx.globalAlpha = 0.85;
  // cos
  ctx.fillStyle = '#2f6fb0';
  ctx.strokeStyle = '#173a63';
  ctx.lineWidth = 1.5;
  roundRect(ctx, -s / 2, -s / 2, s * 0.86, s, s * 0.14);
  ctx.fill();
  ctx.stroke();
  // pantalla (cap a davant)
  ctx.fillStyle = '#e8f1fb';
  roundRect(ctx, -s * 0.12, -s * 0.3, s * 0.36, s * 0.6, s * 0.06);
  ctx.fill();
  // ulls
  ctx.fillStyle = '#173a63';
  for (const oy of [-0.13, 0.13]) {
    ctx.beginPath();
    ctx.arc(s * 0.1, oy * s, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  // morro que indica la direcció
  ctx.fillStyle = '#f2a33a';
  ctx.beginPath();
  ctx.moveTo(s * 0.36, -s * 0.16);
  ctx.lineTo(s * 0.56, 0);
  ctx.lineTo(s * 0.36, s * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
