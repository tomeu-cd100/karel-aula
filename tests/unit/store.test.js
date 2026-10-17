import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, debounce } from '../../js/store.js';

function memoryStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    key: i => [...m.keys()][i] ?? null,
    get length() { return m.size; },
    _map: m,
  };
}

test('desa i llegeix JSON amb prefix', () => {
  const s = memoryStorage();
  const store = createStore(s);
  store.set('prefs', { cel: 50 });
  assert.equal(s.getItem('karel-web:prefs'), '{"cel":50}');
  assert.deepEqual(store.get('prefs', {}), { cel: 50 });
  assert.equal(store.available, true);
});

test('valor absent o JSON trencat → fallback', () => {
  const s = memoryStorage();
  s.setItem('karel-web:editor', '{no és json');
  const store = createStore(s);
  assert.equal(store.get('editor', ''), '');
  assert.deepEqual(store.get('history', []), []);
});

test('clearAll només esborra claus pròpies', () => {
  const s = memoryStorage();
  s.setItem('altra', 'x');
  const store = createStore(s);
  store.set('editor', 'move()');
  store.set('history', []);
  store.clearAll();
  assert.deepEqual([...s._map.keys()], ['altra']);
});

test('storage que llança → available false, sense excepcions', () => {
  const broken = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
    key() { throw new Error('blocked'); },
    get length() { throw new Error('blocked'); },
  };
  const store = createStore(broken);
  assert.equal(store.available, false);
  assert.equal(store.get('editor', 'x'), 'x');
  store.set('editor', 'y');
  store.clearAll();
});

test('storage null → available false', () => {
  const store = createStore(null);
  assert.equal(store.available, false);
  assert.equal(store.get('a', 1), 1);
});

test('debounce crida una vegada amb l\'últim valor', async () => {
  const calls = [];
  const f = debounce(v => calls.push(v), 20);
  f(1); f(2); f(3);
  await new Promise(r => setTimeout(r, 50));
  assert.deepEqual(calls, [3]);
});
