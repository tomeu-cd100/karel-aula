// Cada món inclòs es pot llegir i té solució.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseWorld } from '../../js/worldfile.js';
import { runProgram } from '../../js/karel/interpreter.js';
import { beepersAt } from '../../js/world.js';

const dir = new URL('../../mons/', import.meta.url);
const mons = JSON.parse(await readFile(new URL('mons.json', dir), 'utf8'));
const load = async id => parseWorld(await readFile(new URL(mons.find(m => m.id === id).fitxer, dir), 'utf8'));

const TURN_RIGHT = 'def turn_right():\n    for i in range(3):\n        turn_left()\n';
const TURN_AROUND = 'def turn_around():\n    turn_left()\n    turn_left()\n';

test('tots els mons tenen id, títol, enunciat i fitxer vàlid', async () => {
  assert.equal(new Set(mons.map(m => m.id)).size, mons.length);
  for (const m of mons) {
    assert.ok(m.titol && m.enunciat, m.id);
    const w = await load(m.id);
    assert.ok(w.cols >= 1 && w.rows >= 1, m.id);
  }
});

test('primer pas', async () => {
  const w = await load('primer-pas');
  await runProgram(`${TURN_AROUND}
move()
move()
pick_beeper()
turn_around()
move()
move()
turn_around()`, w);
  assert.equal(w.bag, 1);
  assert.deepEqual(w.karel, { x: 1, y: 1, dir: 'east' });
});

test('recull el diari', async () => {
  const w = await load('diari');
  await runProgram(`${TURN_RIGHT}${TURN_AROUND}
def main():
    move()
    move()
    turn_right()
    move()
    turn_left()
    move()
    move()
    pick_beeper()
    turn_around()
    move()
    move()
    turn_right()
    move()
    turn_left()
    move()
    move()
    turn_around()
`, w);
  assert.equal(w.bag, 1);
  assert.deepEqual(w.karel, { x: 2, y: 4, dir: 'east' });
});

test('planta una fila', async () => {
  const w = await load('fila');
  await runProgram('while front_is_clear():\n    put_beeper()\n    move()\nput_beeper()', w);
  for (let x = 1; x <= w.cols; x++) assert.equal(beepersAt(w, x, 1), 1);
});

test('puja l\'escala', async () => {
  const w = await load('escala');
  await runProgram(`${TURN_RIGHT}
while not beepers_present():
    if front_is_clear():
        move()
    else:
        turn_left()
        move()
        turn_right()
pick_beeper()`, w);
  assert.equal(w.bag, 1);
});

test('trasllada la pila', async () => {
  const w = await load('pila');
  await runProgram(`${TURN_AROUND}
move()
while beepers_present():
    pick_beeper()
    move()
    move()
    move()
    put_beeper()
    turn_around()
    move()
    move()
    move()
    turn_around()`, w);
  assert.equal(beepersAt(w, 2, 1), 0);
  assert.equal(beepersAt(w, 5, 1), 5);
});

test('surt del laberint amb la mà dreta', async () => {
  const w = await load('laberint');
  await runProgram(`${TURN_RIGHT}
while not beepers_present():
    if right_is_clear():
        turn_right()
        move()
    elif front_is_clear():
        move()
    else:
        turn_left()
pick_beeper()`, w, { maxSteps: 10_000 });
  assert.equal(w.bag, 1);
});
