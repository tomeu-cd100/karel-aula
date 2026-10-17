import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as W from '../../js/world.js';
import { parseWorld, serializeWorld } from '../../js/worldfile.js';

test('move avança i xoca amb la vora', () => {
  const w = W.createWorld(2, 1);
  W.move(w);
  assert.deepEqual(w.karel, { x: 2, y: 1, dir: 'east' });
  assert.throws(() => W.move(w), /vora del món/);
});

test('turn_left gira en sentit antihorari', () => {
  const w = W.createWorld();
  const dirs = [];
  for (let i = 0; i < 4; i++) { W.turnLeft(w); dirs.push(w.karel.dir); }
  assert.deepEqual(dirs, ['north', 'west', 'south', 'east']);
});

test('una paret es veu des de les dues caselles', () => {
  const w = W.createWorld(3, 3);
  W.setWall(w, 2, 2, 'west', true);
  assert.equal(W.isBlocked(w, 1, 2, 'east'), true);
  assert.equal(W.isBlocked(w, 2, 2, 'west'), true);
  assert.equal(w.walls.size, 1);
  W.toggleWall(w, 1, 2, 'east');
  assert.equal(w.walls.size, 0);
});

test('les parets de la vora no es guarden', () => {
  const w = W.createWorld(3, 3);
  W.setWall(w, 1, 1, 'west', true);
  assert.equal(w.walls.size, 0);
  assert.equal(W.isBlocked(w, 1, 1, 'west'), true);
});

test('posar i recollir beepers amb la bossa', () => {
  const w = W.createWorld();
  w.bag = 1;
  W.putBeeper(w);
  assert.equal(W.beepersAt(w, 1, 1), 1);
  assert.throws(() => W.putBeeper(w), /bossa/);
  W.pickBeeper(w);
  assert.equal(w.bag, 1);
  assert.throws(() => W.pickBeeper(w), /cap beeper/);
});

test('condicions relatives a la direcció de Karel', () => {
  const w = W.createWorld(3, 3);
  w.karel = { x: 1, y: 1, dir: 'north' };
  assert.equal(W.frontIsClear(w), true);
  assert.equal(W.leftIsClear(w), false);  // oest = vora
  assert.equal(W.rightIsClear(w), true);
});

test('resizeWorld descarta el que queda fora', () => {
  const w = W.createWorld(5, 5);
  W.addBeepers(w, 5, 5, 2);
  W.addBeepers(w, 1, 1, 1);
  W.setWall(w, 4, 4, 'east', true);
  w.karel = { x: 5, y: 5, dir: 'south' };
  const r = W.resizeWorld(w, 3, 3);
  assert.deepEqual([...r.beepers], [['1,1', 1]]);
  assert.equal(r.walls.size, 0);
  assert.deepEqual(r.karel, { x: 3, y: 3, dir: 'south' });
});

test('format .w: anada i tornada', () => {
  const text = 'Dimension: (6, 4)\nWall: (2, 1); west\nBeeper: (3, 2); 4\nKarel: (2, 3); north\nBeeperBag: 7\n';
  const w = parseWorld(text);
  assert.equal(w.cols, 6);
  assert.equal(w.rows, 4);
  assert.equal(W.isBlocked(w, 1, 1, 'east'), true);
  assert.equal(W.beepersAt(w, 3, 2), 4);
  assert.deepEqual(w.karel, { x: 2, y: 3, dir: 'north' });
  assert.equal(w.bag, 7);
  assert.deepEqual(parseWorld(serializeWorld(w)), w);
});

test('format .w: variants i línies desconegudes', () => {
  const w = parseWorld('dimension: (3,3)\nBeeper: (1, 1) 2\nSpeed: 0.5\nColor: (1,1); Red\nBeeperBag: INFINITE\nKarel: (9, 9); east');
  assert.equal(W.beepersAt(w, 1, 1), 2);
  assert.equal(w.bag, Infinity);
  assert.deepEqual(w.karel, { x: 1, y: 1, dir: 'east' }); // fora del món: s'ignora
});
