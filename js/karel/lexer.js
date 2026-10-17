// Converteix el codi en fitxes (tokens), amb INDENT/DEDENT com Python.

import { KarelError } from './errors.js';

const OPS = ['==', '!=', '<=', '>=', '(', ')', ':', ',', ';', '<', '>', '=', '+', '-', '*', '/', '%', '.', '[', ']'];
const TAB = 4;
const BRACES = 'a Python no es fan servir claus { }: acaba la línia amb «:» i sagna les línies de dins.';
const HINTS = {
  '{': BRACES,
  '}': BRACES,
  '!': "a Python «no» s'escriu «not».",
  '&': "a Python «i» s'escriu «and».",
  '|': "a Python «o» s'escriu «or».",
};

export function tokenize(source) {
  const tokens = [];
  const indents = [0];
  let depth = 0; // parèntesis oberts: la línia continua a la següent
  let openLine = 0;
  const lines = String(source).replace(/\r\n?/g, '\n').split('\n');

  lines.forEach((text, i) => {
    const line = i + 1;
    let pos = 0;

    if (depth === 0) {
      let width = 0;
      while (pos < text.length && (text[pos] === ' ' || text[pos] === '\t')) {
        width = text[pos] === '\t' ? width + TAB - (width % TAB) : width + 1;
        pos++;
      }
      if (pos === text.length || text[pos] === '#') return; // línia buida o comentari
      if (width > indents.at(-1)) {
        indents.push(width);
        tokens.push({ type: 'INDENT', line });
      } else {
        while (width < indents.at(-1)) {
          indents.pop();
          tokens.push({ type: 'DEDENT', line });
        }
        if (width !== indents.at(-1)) {
          throw new KarelError("el sagnat (espais a l'inici) no coincideix amb cap línia anterior.", line);
        }
      }
    }

    while (pos < text.length) {
      const ch = text[pos];
      if (ch === ' ' || ch === '\t') { pos++; continue; }
      if (ch === '#') break;
      const col = pos + 1;

      if (/[A-Za-z_À-ÿ]/.test(ch)) {
        let end = pos;
        while (end < text.length && /[\wÀ-ÿ]/.test(text[end])) end++;
        tokens.push({ type: 'NAME', value: text.slice(pos, end), line, col });
        pos = end;
        continue;
      }
      if (/\d/.test(ch)) {
        let end = pos;
        while (end < text.length && /\d/.test(text[end])) end++;
        tokens.push({ type: 'NUMBER', value: Number(text.slice(pos, end)), line, col });
        pos = end;
        continue;
      }
      if (ch === '"' || ch === "'") {
        let end = pos + 1;
        let value = '';
        while (end < text.length && text[end] !== ch) {
          if (text[end] === '\\' && end + 1 < text.length) {
            const next = text[end + 1];
            value += next === 'n' ? '\n' : next === 't' ? '\t' : next;
            end += 2;
          } else {
            value += text[end++];
          }
        }
        if (end >= text.length) throw new KarelError('falta tancar les cometes del text.', line);
        tokens.push({ type: 'STRING', value, line, col });
        pos = end + 1;
        continue;
      }
      const op = OPS.find(o => text.startsWith(o, pos));
      if (!op) throw new KarelError(HINTS[ch] ?? `no s'entén el caràcter «${ch}».`, line);
      if (op === '(' || op === '[') {
        if (depth === 0) openLine = line;
        depth++;
      }
      if (op === ')' || op === ']') depth = Math.max(0, depth - 1);
      tokens.push({ type: 'OP', value: op, line, col });
      pos += op.length;
    }

    if (depth === 0 && tokens.length && tokens.at(-1).type !== 'NEWLINE') {
      tokens.push({ type: 'NEWLINE', line });
    }
  });

  const last = lines.length;
  if (depth > 0) throw new KarelError('falta tancar el parèntesi.', openLine);
  if (tokens.length && tokens.at(-1).type !== 'NEWLINE') tokens.push({ type: 'NEWLINE', line: last });
  while (indents.length > 1) {
    indents.pop();
    tokens.push({ type: 'DEDENT', line: last });
  }
  tokens.push({ type: 'EOF', line: last });
  return tokens;
}
