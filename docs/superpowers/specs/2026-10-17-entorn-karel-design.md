# Entorn web Karel per a l'alumnat — Disseny

Data: 2026-10-17
Estat: construït directament a petició del docent (sense ronda de preguntes),
seguint el model de `logo-aula`.

## 1. Objectiu

Entorn web, accessible per un enllaç públic (GitHub Pages), on l'alumnat programa el
robot Karel des del Chromebook sense instal·lar res. Mateixa filosofia que `logo-aula`:
web estàtica, sense comptes, feina desada al navegador i en fitxers.

### Decisions (preses per Claude, seguint logo-aula)

| Tema | Decisió |
|---|---|
| Llenguatge | Karel en Python, compatible amb Stanford Karel (`stanfordkarel`): `move()`, `turn_left()`, `put_beeper()`, `pick_beeper()` i les condicions `front_is_clear()`, `beepers_present()`, `facing_north()`… |
| Intèrpret | Propi, subconjunt de Python escrit en JS (sense Pyodide: massa pesat per a Chromebooks) |
| Interfície i errors | Català (inclosos els errors de l'intèrpret, amb suggeriments «Volies dir…?») |
| Accés | GitHub Pages, sense comptes ni servidor |
| Persistència | `localStorage` (codi per a cada món) + fitxers `.py` (programa) i `.w` (món) |
| Mons | Format `.w` de Stanford Karel; mons inclosos a `mons/`, editor de mons propi |
| Enllaç del docent | `?mon=ID` obre directament un món inclòs |

### Fora d'abast (v1)

- Correcció automàtica (comparar amb un món objectiu).
- Pintar caselles (`paint_corner`, `corner_color_is`).
- Variables i funcions amb paràmetres (Karel no en fa servir).
- Comptes, núvol, panell del docent, Classroom.

## 2. Subconjunt de Python

- `def nom():` (sense paràmetres), `for i in range(n):`, `while cond:`,
  `if/elif/else`, `pass`, `return`, `break`, `continue`, comentaris `#`.
- Expressions: crides, `not`, `and`, `or`, comparacions, enters, textos, `True/False`,
  `+ - *`, parèntesis, la variable del `for`.
- `print(...)` escriu a Sortida.
- Compatibilitat Stanford: `from karel.stanfordkarel import *` s'ignora;
  `if __name__ == "__main__": run_karel_program()` executa `main()`.
  Si hi ha `main` i el programa no l'ha cridada, s'executa sola en acabar.
- Les funcions es poden cridar abans de definir-les (més amable que Python).
- Assignacions → error explicatiu («Karel no fa servir variables»).
- Límit d'1.000.000 de passos i 1.000 nivells de crida (bucles/recursió infinits).

## 3. Món

- `cols × files` (1–20), coordenades Stanford: avinguda x (1 = esquerra), carrer y
  (1 = baix). Parets entre caselles, vores sempre tancades. Beepers per casella.
  Bossa: nombre o infinit. Karel: posició i direcció (east/north/west/south).
- Format `.w`: `Dimension: (8, 8)`, `Wall: (3, 2); east`, `Beeper: (2, 1); 1`,
  `Karel: (1, 1); east`, `BeeperBag: INFINITY`. Línies desconegudes s'ignoren.

## 4. Interfície

```
┌───────────────────────────────────────┐ ┌[Editor][Món][Manual]────────────┐
│ [▶ Executa][⏭ Pas][■ Atura][↺ Reinicia]│ │ 1 │ def main():                   │
│ Món:[Primer pas ▾]  Velocitat:[━●━]    │ │ 2 │     move()                    │
│ ┌───────────────────────────────────┐ │ │ 3 │     pick_beeper()             │
│ │ quadrícula, parets, beepers, Karel│ │ ├─ Sortida ───────────────────────┤
│ └───────────────────────────────────┘ │ │ (print, errors, «Acabat»)       │
│ Karel (1, 1) mirant a l'est · Bossa ∞ │ │ [Desa .py] [Obre .py]           │
│ Enunciat del món                       │ └─────────────────────────────────┘
└───────────────────────────────────────┘
```

- **Executa** (`Ctrl+Enter`): reinicia el món i executa; ressalta la línia en curs.
- **Pas**: executa una acció de Karel cada clic (també des d'una execució en marxa).
- **Atura**, **Reinicia** (torna al món inicial).
- **Velocitat** 0 (instantani) – 5 (lent); per defecte 3.
- Error → missatge vermell a Sortida amb número de línia, i la línia marcada.
- **Món** (pestanya): mida, eina (paret / beeper / Karel), bossa, Desa .w, Obre .w,
  Restaura l'original. Clic a la vora d'una casella posa/treu paret; clic posa beeper,
  Maj+clic o clic dret en treu; eina Karel: clic el col·loca, clic sobre Karel el gira.
- **Manual**: ordres, condicions i estructures, amb «Prova-ho».
- ≥ 900 px dues columnes; < 900 px una columna.

## 5. Persistència (`karel-web:`)

| Clau | Contingut |
|---|---|
| `codi:<monId>` | Codi de l'editor per a cada món |
| `mon:<monId>` | Món modificat amb l'editor (text `.w`) |
| `prefs` | `{mon, velocitat}` |

Sense `localStorage` → avís «La feina no es desarà en tancar».

## 6. Proves

Unitàries (`node --test`): lèxic/sintaxi, intèrpret, món, format `.w`.
Navegador (Playwright): executar, aturar bucle infinit, error amb línia, persistència,
`?mon=`, editor de mons, fitxers.
