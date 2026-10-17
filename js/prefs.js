// Preferències desades, validades: un valor no vàlid torna al valor per defecte.
// ?mon=ID a l'enllaç (el que dona el docent) mana sobre el món desat.

import { DELAYS } from './runner.js';

export const DEFAULT_SPEED = 3;

export function loadPrefs(saved, search, monIds) {
  const s = saved && typeof saved === 'object' ? saved : {};
  const fromUrl = new URLSearchParams(search).get('mon');
  return {
    mon: monIds.includes(fromUrl) ? fromUrl : monIds.includes(s.mon) ? s.mon : monIds[0],
    velocitat: Number.isInteger(s.velocitat) && s.velocitat >= 0 && s.velocitat < DELAYS.length
      ? s.velocitat : DEFAULT_SPEED,
  };
}
