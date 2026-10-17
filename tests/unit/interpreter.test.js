import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runProgram, StopSignal } from '../../js/karel/interpreter.js';
import { createWorld, beepersAt } from '../../js/world.js';

const run = (code, world = createWorld(), hooks) => runProgram(code, world, hooks).then(() => world);

async function errorOf(code, world = createWorld()) {
  try {
    await runProgram(code, world);
  } catch (e) {
    return e;
  }
  assert.fail('havia de donar error');
}

test('ordres bàsiques', async () => {
  const w = await run('move()\nmove()\nturn_left()\nput_beeper()');
  assert.deepEqual(w.karel, { x: 3, y: 1, dir: 'north' });
  assert.equal(beepersAt(w, 3, 1), 1);
});

test('def, for i while', async () => {
  const w = await run(`
def turn_right():
    for i in range(3):
        turn_left()

def main():
    while front_is_clear():
        move()
    turn_right()
`);
  assert.deepEqual(w.karel, { x: 8, y: 1, dir: 'south' });
});

test('if / elif / else i operadors lògics', async () => {
  const code = `
if beepers_present() and not front_is_blocked():
    move()
elif facing_east() or False:
    turn_left()
else:
    pass
`;
  const w = await run(code);
  assert.equal(w.karel.dir, 'north');
});

test('estil Stanford: import i __name__', async () => {
  const w = await run(`from karel.stanfordkarel import *

def main():
    move()

if __name__ == "__main__":
    run_karel_program()
`);
  assert.equal(w.karel.x, 2); // main només s'executa una vegada
});

test('main s\'executa sola si no es crida', async () => {
  const w = await run('def main():\n    move()\n');
  assert.equal(w.karel.x, 2);
});

test('funcions cridades abans de definir-les', async () => {
  const w = await run('salta()\ndef salta():\n    move()\n    move()\n');
  assert.equal(w.karel.x, 3);
});

test('break, continue i return', async () => {
  const w = await run(`
def f():
    for i in range(10):
        if i == 1:
            continue
        if i == 4:
            break
        put_beeper()
        move()
    return
    move()
f()
`);
  // i = 0, 2, 3 posen beeper (1 se salta, 4 surt); el move() després de return no s'executa
  assert.equal(w.karel.x, 4);
  assert.deepEqual([1, 2, 3, 4].map(x => beepersAt(w, x, 1)), [1, 1, 1, 0]);
});

test('una sola línia: if x: ordre; ordre', async () => {
  const w = await run('if front_is_clear(): move(); move()');
  assert.equal(w.karel.x, 3);
});

test('print escriu els valors', async () => {
  const out = [];
  await run('print("Hola", 3, front_is_clear())', createWorld(), { print: t => out.push(t) });
  assert.deepEqual(out, ['Hola 3 True\n']);
});

test('onAction rep la línia de cada acció', async () => {
  const lines = [];
  await run('move()\n\nturn_left()', createWorld(), { onAction: (_, line) => lines.push(line) });
  assert.deepEqual(lines, [1, 3]);
});

test('Atura: shouldStop llança StopSignal', async () => {
  let n = 0;
  await assert.rejects(
    runProgram('while True:\n    turn_left()', createWorld(), { shouldStop: () => ++n > 50 }),
    StopSignal,
  );
});

test('bucle infinit sense accions → error de massa passos', async () => {
  const e = await errorOf('while True:\n    pass');
  assert.match(e.message, /massa passos/);
});

test('recursió infinita → error', async () => {
  const e = await errorOf('def f():\n    f()\nf()');
  assert.match(e.message, /massa crides/);
});

const errors = [
  ['moev()', 1, /«moev» no existeix\. Volies dir «move»\?/],
  ['move()\nturnLeft()', 2, /Volies dir «turn_left»/],
  ['turn_right()', 1, /defineix-la tu/],
  ['move', 1, /falten els parèntesis: escriu «move\(\)»/],
  ['while front_is_clear:\n    move()', 1, /falten els parèntesis/],
  ['if front_is_clear()\n    move()', 1, /dos punts/],
  ['def main():\nmove()', 2, /cal sagnar/],
  ['move()\n    move()', 2, /sagnat inesperat/],
  ['def a():\n        move()\n    move()', 3, /no coincideix/],
  ['x = 3', 1, /no fa servir variables/],
  ['def move():\n    pass', 1, /ja és una ordre de Karel/],
  ['def f(n):\n    pass', 1, /no tenen paràmetres/],
  ['def main:\n    pass', 1, /parèntesis/],
  ['while (front_is_clear()) {', 1, /claus/],
  ['break', 1, /dins d'un bucle/],
  ['else:\n    move()', 1, /sense un «if»/],
  ['move(3)', 1, /no necessita res/],
  ['move(\n', 1, /tancar el parèntesi/],
  ['print("hola)', 1, /cometes/],
  ['while true:\n    move()', 1, /majúscula/],
];

for (const [code, line, re] of errors) {
  test(`error: ${JSON.stringify(code)}`, async () => {
    const e = await errorOf(code);
    assert.equal(e.name, 'KarelError', e.stack);
    assert.match(e.message, re);
    assert.equal(e.line, line);
  });
}

test('error de Karel amb la línia de l\'acció', async () => {
  const e = await errorOf('move()\nmove()\nmove()', createWorld(2, 1));
  assert.equal(e.line, 2);
  assert.match(e.display, /^Línia 2: Karel ha xocat amb la vora del món/);
});
