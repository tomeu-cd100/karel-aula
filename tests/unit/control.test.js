import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRunner } from '../../js/runner.js';
import { applyTool } from '../../js/mon-editor.js';
import { loadPrefs, DEFAULT_SPEED } from '../../js/prefs.js';
import { createWorld, beepersAt } from '../../js/world.js';

const tick = () => new Promise(r => setTimeout(r, 5));

test('runner: estats idle → running → idle', async () => {
  const states = [];
  const r = createRunner({ getDelay: () => 0, onState: s => states.push(s) });
  await r.start(async ({ gate }) => { await gate(); await gate(); });
  assert.deepEqual(states, ['running', 'idle']);
});

test('runner: pas a pas es para després de cada acció', async () => {
  const r = createRunner({ getDelay: () => 0 });
  let actions = 0;
  const done = r.start(async ({ gate }) => {
    for (let i = 0; i < 3; i++) { actions++; await gate(); }
  }, { step: true });
  await tick();
  assert.equal(r.state, 'paused');
  assert.equal(actions, 1);
  r.step();
  await tick();
  assert.equal(actions, 2);
  r.resume();
  await done;
  assert.equal(actions, 3);
  assert.equal(r.state, 'idle');
});

test('runner: stop desperta una pausa i shouldStop es torna cert', async () => {
  const r = createRunner({ getDelay: () => 10_000 });
  let stopped = null;
  const done = r.start(async ({ gate, shouldStop }) => {
    await gate();
    stopped = shouldStop();
  });
  await tick();
  r.stop();
  await done;
  assert.equal(stopped, true);
});

test('runner: start mentre s\'executa no en llança un altre', async () => {
  const r = createRunner({ getDelay: () => 0 });
  let runs = 0;
  const first = r.start(async ({ gate }) => { runs++; await gate(); await tick(); });
  r.start(async () => { runs++; });
  await first;
  assert.equal(runs, 1);
});

test('eina paret: només amb vora', () => {
  const w = createWorld(3, 3);
  assert.equal(applyTool(w, { x: 1, y: 1, side: null }, 'paret'), false);
  assert.equal(applyTool(w, { x: 1, y: 1, side: 'north' }, 'paret'), true);
  assert.deepEqual([...w.walls], ['1,1,north']);
});

test('eina beeper: posa i treu', () => {
  const w = createWorld(3, 3);
  applyTool(w, { x: 2, y: 2 }, 'beeper');
  applyTool(w, { x: 2, y: 2 }, 'beeper');
  applyTool(w, { x: 2, y: 2 }, 'beeper', { remove: true });
  assert.equal(beepersAt(w, 2, 2), 1);
});

test('eina Karel: posa i gira', () => {
  const w = createWorld(3, 3);
  applyTool(w, { x: 3, y: 2 }, 'karel');
  assert.deepEqual(w.karel, { x: 3, y: 2, dir: 'east' });
  applyTool(w, { x: 3, y: 2 }, 'karel');
  assert.equal(w.karel.dir, 'north');
});

test('prefs: URL mana, valors no vàlids tornen al defecte', () => {
  const ids = ['buit', 'fila'];
  assert.deepEqual(loadPrefs({ mon: 'fila', velocitat: 1 }, '', ids), { mon: 'fila', velocitat: 1 });
  assert.equal(loadPrefs({ mon: 'fila' }, '?mon=buit', ids).mon, 'buit');
  assert.equal(loadPrefs({ mon: 'x' }, '?mon=y', ids).mon, 'buit');
  assert.equal(loadPrefs({ velocitat: 99 }, '', ids).velocitat, DEFAULT_SPEED);
  assert.equal(loadPrefs(null, '', ids).velocitat, DEFAULT_SPEED);
});
