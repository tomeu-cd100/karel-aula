// Suggeriments per a noms mal escrits: «moev» → «move», «turnLeft» → «turn_left».

const HINTS = {
  turn_right: 'turn_right no és una ordre de Karel: defineix-la tu amb «def turn_right():» i tres turn_left().',
  turn_around: 'turn_around no és una ordre de Karel: defineix-la tu amb «def turn_around():» i dos turn_left().',
};

export function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      // dues lletres girades («moev») compten com una sola errada
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

const snake = name => name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

export function unknownNameMessage(name, candidates) {
  if (HINTS[name] && !candidates.includes(name)) return HINTS[name];
  const base = `«${name}» no existeix.`;
  const exact = candidates.find(c => c === snake(name) || c.toLowerCase() === name.toLowerCase());
  if (exact) return `${base} Volies dir «${exact}»? A Python les majúscules compten i les paraules se separen amb «_».`;
  const limit = name.length <= 4 ? 1 : 2;
  let best = null;
  let bestD = Infinity;
  for (const c of candidates) {
    const dist = distance(name.toLowerCase(), c.toLowerCase());
    if (dist < bestD) { best = c; bestD = dist; }
  }
  return bestD <= limit ? `${base} Volies dir «${best}»?` : base;
}
