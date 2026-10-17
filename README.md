# Karel a l'aula

Entorn web per programar el robot Karel en Python (ordres de Stanford Karel en anglès,
interfície i missatges d'error en català). Funciona al navegador: no cal instal·lar res.

## Per a l'alumnat

Obre l'enllaç que t'ha donat el docent, tria el món i escriu el programa a l'Editor.

- **▶ Executa** (o `Ctrl+Enter`) executa el programa des del principi.
- **⏭ Pas** fa una sola acció de Karel cada vegada que el prems.
- **■ Atura** para el programa; **↺ Reinicia** torna el món com estava.
- La pestanya **Manual** explica totes les ordres, amb exemples.

La feina es desa sola en aquest navegador, un programa per a cada món. Per endur-te-la
a un altre ordinador, fes servir **💾 Desa .py** i **📂 Obre .py**.

## Per al docent

### Enllaç directe a un exercici

Afegeix `?mon=ID` a l'enllaç. Exemple: `https://USUARI.github.io/karel-aula/?mon=laberint`

| ID | Exercici |
|---|---|
| `buit` | Món lliure (8 × 8, beepers infinits) |
| `primer-pas` | 1. Primer pas |
| `diari` | 2. Recull el diari |
| `fila` | 3. Planta una fila |
| `escala` | 4. Puja l'escala |
| `pila` | 5. Trasllada la pila |
| `escacs` | 6. Tauler d'escacs |
| `laberint` | 7. Surt del laberint |

### Crear mons nous

1. Obre qualsevol món, ves a la pestanya **Món** i dibuixa'l (parets, beepers, Karel, mida).
2. **💾 Desa .w** descarrega el fitxer. És el format de Stanford Karel: també serveixen els
   `.w` que ja tinguis.
3. Copia'l a la carpeta `mons/` i afegeix-ne una entrada a `mons/mons.json`
   (`id`, `titol`, `enunciat`, `fitxer`).
4. Afegeix-ne una solució a `tests/unit/mons.test.js` i executa `npm test`: així saps segur
   que l'exercici es pot resoldre.

L'alumnat també pot obrir un `.w` amb **📂 Obre .w** sense que el publiquis.

### Publicar a GitHub Pages

1. Crea un repositori a GitHub i puja-hi aquesta carpeta (`git push`).
2. Al repositori: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   branca `main`, carpeta `/ (root)`.
3. En un o dos minuts l'entorn és a `https://USUARI.github.io/REPO/`.

### Provar en local

```bash
npm install
npx playwright install chromium
npm start        # http://localhost:8124
npm test         # proves unitàries i de navegador
```
