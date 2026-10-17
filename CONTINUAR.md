# Com continuar la feina en un altre ordinador

Data de l'última sessió: 2026-10-17

## Estat actual

- ✅ Especificació: `docs/superpowers/specs/2026-10-17-entorn-karel-design.md`
- ✅ Entorn complet: intèrpret Python-Karel propi, 8 mons d'exercicis, editor de mons,
  manual, desat al navegador, fitxers `.py` i `.w`.
- ✅ 80 proves en verd (`npm test`): 64 unitàries + 16 de navegador.
- ✅ Publicat: **https://tomeu-cd100.github.io/karel-aula/** (repositori públic, Pages des de `main`, carpeta `/`).
- ✅ Comprovat a la web publicada: el laberint es resol sense errors.
- ⏳ Pendent: provar-ho en un Chromebook real.
- 💡 Idees per a més endavant: correcció automàtica (món objectiu), pintar caselles
  (`paint_corner`), més mons.

## Decisions preses

| Tema | Decisió |
|---|---|
| Llenguatge | Python amb les ordres de Stanford Karel (`move()`, `turn_left()`…) |
| Intèrpret | Propi (`js/karel/`), errors en català amb suggeriments |
| Mons | Format `.w` de Stanford; inclosos a `mons/` + `mons/mons.json` |
| Accés | GitHub Pages, sense comptes; enllaç amb `?mon=ID` |
| Desat | Navegador (codi per a cada món) + fitxers `.py` / `.w` |

## Com fer canvis

1. Instal·la Git, Node.js (22 o superior) i Claude Code.
2. `npm install` i `npx playwright install chromium` (només la primera vegada).
3. Obre Claude Code a la carpeta, escriu «Llegeix `CONTINUAR.md`» i explica el canvi.
4. Prova en local amb `npm start` (http://localhost:8124) i `npm test`.

## Fitxers

- `js/karel/` — intèrpret: `lexer.js` (sagnat), `parser.js`, `interpreter.js`, `suggest.js`.
- `js/world.js`, `js/worldfile.js` — món de Karel i format `.w`.
- `js/render.js` — dibuix del món; `js/mon-editor.js` — eines de l'editor de mons.
- `js/runner.js` — Executa / Pas / Atura; `js/app.js` — connecta la pàgina.
- `mons/` — exercicis; `manual/ordres.json` — pestanya Manual.
- `tests/unit/mons.test.js` — una solució per a cada exercici (garanteix que es poden fer).
