import { createStore, debounce } from './store.js';
import { setupTabs } from './tabs.js';
import { isProbablyText, downloadText } from './files.js';
import { runProgram, StopSignal } from './karel/interpreter.js';
import { KarelError } from './karel/errors.js';
import { cloneWorld, createWorld, resizeWorld, DIR_NAMES, MAX_SIZE } from './world.js';
import { parseWorld, serializeWorld } from './worldfile.js';
import { layout, drawWorld, hitTest } from './render.js';
import { applyTool } from './mon-editor.js';
import { createRunner, DELAYS } from './runner.js';
import { loadPrefs } from './prefs.js';
import { writeOutput, writeError, writeOk } from './output.js';
import { filterEntries, renderManual } from './manual.js';

const STARTER = `def main():
    # Escriu aquí les ordres de Karel
    move()
`;
const $ = sel => document.querySelector(sel);

const store = createStore((() => {
  try { return window.localStorage; } catch { return null; }
})());
$('#avis-desat').hidden = store.available;

const sortida = $('#sortida');
const canvas = $('#canvas');
const ctx = canvas.getContext('2d');

let mons;
try {
  mons = await (await fetch('mons/mons.json')).json();
} catch {
  mons = [{ id: 'buit', titol: 'Món lliure', enunciat: '', fitxer: null }];
  writeError(sortida, "No s'ha pogut carregar la llista de mons.");
}
const prefs = loadPrefs(store.get('prefs', {}), location.search, mons.map(m => m.id));
const savePrefs = () => store.set('prefs', prefs);

let mon = null;      // entrada de mons.json
let initial = createWorld();
let current = cloneWorld(initial);
let lay = layout(current);

function draw() {
  lay = layout(current);
  if (canvas.width !== lay.width || canvas.height !== lay.height) {
    canvas.width = lay.width;
    canvas.height = lay.height;
  }
  drawWorld(ctx, current, lay);
  const { x, y, dir } = current.karel;
  const bag = current.bag === Infinity ? '∞' : current.bag;
  $('#estat').textContent = `Karel: (${x}, ${y}) mirant ${DIR_NAMES[dir]}  ·  Beepers a la bossa: ${bag}`;
}

// --- Editor de codi ---

const editor = CodeMirror.fromTextArea($('#editor'), {
  mode: 'python',
  lineNumbers: true,
  indentUnit: 4,
  tabSize: 4,
  matchBrackets: true,
  autoCloseBrackets: '()""\'\'',
  extraKeys: {
    'Ctrl-Enter': () => runAll(),
    'Cmd-Enter': () => runAll(),
    'Ctrl-/': 'toggleComment',
    Tab: cm => (cm.somethingSelected() ? cm.indentSelection('add') : cm.replaceSelection('    ')),
    'Shift-Tab': 'indentLess',
  },
});

let marked = null;
function clearMark() {
  if (marked) editor.removeLineClass(marked.handle, 'background', marked.cls);
  marked = null;
}
function mark(line, cls) {
  clearMark();
  const handle = editor.getLineHandle(line - 1);
  if (!handle) return;
  editor.addLineClass(handle, 'background', cls);
  marked = { handle, cls };
  if (cls === 'linia-error') editor.scrollIntoView({ line: line - 1, ch: 0 }, 60);
}

const saveCode = () => { if (mon) store.set(`codi:${mon.id}`, editor.getValue()); };
editor.on('change', debounce(saveCode, 500));
editor.on('change', () => { if (marked?.cls === 'linia-error') clearMark(); });

function replaceEditor(code) {
  const now = editor.getValue();
  if (now.trim() && now !== code && !confirm("Vols substituir el contingut de l'editor?")) return false;
  editor.setValue(code);
  return true;
}

// --- Execució ---

const runner = createRunner({
  getDelay: () => DELAYS[prefs.velocitat] ?? 0,
  onState: state => {
    $('#executa').disabled = state === 'running';
    $('#executa').textContent = state === 'paused' ? '▶ Continua' : '▶ Executa';
    $('#atura').disabled = state === 'idle';
    for (const el of document.querySelectorAll('#pestanya-edita-mon :is(input, button)')) {
      el.disabled = state !== 'idle';
    }
    if (state === 'idle') syncWorldForm();
  },
});

function reset() {
  current = cloneWorld(initial);
  clearMark();
  draw();
}

async function startRun(step) {
  if (runner.state !== 'idle') return;
  reset();
  const code = editor.getValue();
  const task = runner.start(({ gate, shouldStop }) => runProgram(code, current, {
    onAction: async (_, line) => {
      if (runner.stepping || prefs.velocitat > 0) {
        mark(line, 'linia-actual');
        draw();
      }
      await gate();
    },
    print: text => writeOutput(sortida, text),
    shouldStop,
    pause: () => {
      draw();
      return new Promise(resolve => setTimeout(resolve, 0));
    },
  }), { step });
  try {
    await task;
    clearMark();
    writeOk(sortida, '✔ Programa acabat.');
  } catch (e) {
    if (e instanceof StopSignal) {
      clearMark();
      writeOutput(sortida, '■ Aturat.\n');
    } else if (e instanceof KarelError) {
      writeError(sortida, e.display);
      if (e.line) mark(e.line, 'linia-error');
    } else {
      writeError(sortida, `Error inesperat: ${e.message}`);
      console.error(e);
    }
  } finally {
    draw();
  }
}

function runAll() {
  if (runner.state === 'paused') runner.resume();
  else startRun(false);
}

$('#executa').addEventListener('click', runAll);
$('#pas').addEventListener('click', () => {
  if (runner.state === 'idle') startRun(true);
  else runner.step();
});
$('#atura').addEventListener('click', () => runner.stop());
$('#reinicia').addEventListener('click', async () => {
  runner.stop();
  await runner.whenIdle();
  reset();
});
$('#buida-sortida').addEventListener('click', () => { sortida.textContent = ''; });

$('#velocitat').value = String(prefs.velocitat);
$('#velocitat').addEventListener('input', e => {
  prefs.velocitat = Number(e.target.value);
  savePrefs();
});

// --- Mons ---

for (const m of mons) $('#mon').append(new Option(m.titol, m.id));

async function worldText(m) {
  const saved = store.get(`mon:${m.id}`, null);
  if (typeof saved === 'string') return saved;
  if (!m.fitxer) return serializeWorld(createWorld());
  try {
    const res = await fetch(`mons/${m.fitxer}`);
    if (!res.ok) throw new Error(res.status);
    return await res.text();
  } catch {
    writeError(sortida, `No s'ha pogut carregar el món «${m.titol}».`);
    return serializeWorld(createWorld());
  }
}

function syncWorldForm() {
  $('#mon-cols').value = initial.cols;
  $('#mon-files').value = initial.rows;
  $('#bossa-infinita').checked = initial.bag === Infinity;
  $('#bossa').value = initial.bag === Infinity ? '' : initial.bag;
  $('#bossa').disabled = initial.bag === Infinity || runner.state !== 'idle';
}

async function loadMon(id) {
  runner.stop();
  await runner.whenIdle();
  if (mon) saveCode();
  mon = mons.find(m => m.id === id) ?? mons[0];
  initial = parseWorld(await worldText(mon));
  reset();
  syncWorldForm();
  $('#mon').value = mon.id;
  $('#enunciat').textContent = mon.enunciat;
  editor.setValue(store.get(`codi:${mon.id}`, STARTER));
  editor.clearHistory();
  prefs.mon = mon.id;
  savePrefs();
}

$('#mon').addEventListener('change', e => loadMon(e.target.value));

// --- Editor de mons ---

function worldChanged() {
  store.set(`mon:${mon.id}`, serializeWorld(initial));
  reset();
  syncWorldForm();
}

function editAt(e, remove) {
  if (!document.body.classList.contains('editant') || runner.state !== 'idle') return;
  const rect = canvas.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (canvas.width / rect.width);
  const py = (e.clientY - rect.top) * (canvas.height / rect.height);
  const tool = document.querySelector('input[name="eina"]:checked').value;
  if (applyTool(initial, hitTest(initial, lay, px, py), tool, { remove })) worldChanged();
}
canvas.addEventListener('click', e => editAt(e, e.shiftKey));
canvas.addEventListener('contextmenu', e => {
  if (!document.body.classList.contains('editant')) return;
  e.preventDefault();
  editAt(e, true);
});

const clampSize = v => Math.min(MAX_SIZE, Math.max(1, Math.round(Number(v)) || 1));
$('#mon-mida').addEventListener('click', () => {
  initial = resizeWorld(initial, clampSize($('#mon-cols').value), clampSize($('#mon-files').value));
  worldChanged();
});
$('#bossa-infinita').addEventListener('change', e => {
  initial.bag = e.target.checked ? Infinity : Math.max(0, Number($('#bossa').value) || 0);
  worldChanged();
});
$('#bossa').addEventListener('change', e => {
  initial.bag = Math.max(0, Math.round(Number(e.target.value)) || 0);
  worldChanged();
});
$('#mon-buida').addEventListener('click', () => {
  if (!confirm("S'esborraran totes les parets i els beepers d'aquest món. Vols continuar?")) return;
  const empty = createWorld(initial.cols, initial.rows);
  empty.bag = initial.bag;
  initial = empty;
  worldChanged();
});
$('#mon-restaura').addEventListener('click', async () => {
  if (!confirm("Es perdran els canvis que has fet en aquest món. Vols continuar?")) return;
  store.remove(`mon:${mon.id}`);
  initial = parseWorld(await worldText(mon));
  reset();
  syncWorldForm();
});

$('#desa-w').addEventListener('click', () => downloadText(`${mon.id}.w`, serializeWorld(initial)));
$('#obre-w').addEventListener('click', () => $('#fitxer-w').click());
$('#fitxer-w').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const text = await file.text();
  if (!isProbablyText(text) || !/dimension\s*:/i.test(text)) {
    writeError(sortida, `No s'ha pogut obrir «${file.name}»: no és un món de Karel (.w).`);
    return;
  }
  initial = parseWorld(text);
  worldChanged();
});

// --- Fitxers .py ---

$('#desa-py').addEventListener('click', () => downloadText(`${mon.id}.py`, editor.getValue()));
$('#obre-py').addEventListener('click', () => $('#fitxer-py').click());
$('#fitxer-py').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = ''; // permet tornar a obrir el mateix fitxer
  if (!file) return;
  const text = await file.text();
  if (!isProbablyText(text)) {
    writeError(sortida, `No s'ha pogut obrir «${file.name}»: no és un fitxer de text.`);
    return;
  }
  replaceEditor(text);
});

// --- Pestanyes i manual ---

setupTabs($('.pestanyes'), name => {
  document.body.classList.toggle('editant', name === 'edita-mon');
  if (name === 'editor') editor.refresh();
  if (name === 'edita-mon' && runner.state === 'idle') reset();
});

function tryExample(code) {
  if (!replaceEditor(code)) return;
  $('[data-pestanya="editor"]').click();
}

try {
  const entries = await (await fetch('manual/ordres.json')).json();
  const showManual = () => renderManual($('#manual'), filterEntries(entries, $('#cerca-manual').value), tryExample);
  $('#cerca-manual').addEventListener('input', showManual);
  showManual();
} catch {
  $('#manual').textContent = "No s'ha pogut carregar el manual.";
}

await loadMon(prefs.mon);

window.karelApp = {
  editor, runner, loadMon,
  get world() { return current; },
  get initial() { return initial; },
  get layout() { return lay; },
};
window.karelApp.ready = true;
