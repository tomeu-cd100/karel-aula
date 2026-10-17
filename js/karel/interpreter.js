// Executa un programa de Karel sobre un món. Totes les sentències passen per
// tick(): compta passos, cedeix el control al navegador i atura si cal.

import { parse } from './parser.js';
import { KarelError } from './errors.js';
import { unknownNameMessage } from './suggest.js';
import * as W from '../world.js';

export const ACTIONS = {
  move: W.move,
  turn_left: W.turnLeft,
  put_beeper: W.putBeeper,
  pick_beeper: W.pickBeeper,
};

const facing = dir => w => w.karel.dir === dir;
const not = f => w => !f(w);

export const CONDITIONS = {
  front_is_clear: W.frontIsClear,
  front_is_blocked: not(W.frontIsClear),
  left_is_clear: W.leftIsClear,
  left_is_blocked: not(W.leftIsClear),
  right_is_clear: W.rightIsClear,
  right_is_blocked: not(W.rightIsClear),
  beepers_present: W.beepersPresent,
  no_beepers_present: not(W.beepersPresent),
  beepers_in_bag: W.beepersInBag,
  no_beepers_in_bag: not(W.beepersInBag),
};
for (const dir of W.DIRS) {
  CONDITIONS[`facing_${dir}`] = facing(dir);
  CONDITIONS[`not_facing_${dir}`] = not(facing(dir));
}

const OTHER = ['print', 'range', 'run_karel_program'];
export const BUILTIN_NAMES = [...Object.keys(ACTIONS), ...Object.keys(CONDITIONS), ...OTHER];

export const MAX_STEPS = 1_000_000;
const MAX_DEPTH = 1000;
const YIELD_EVERY = 1000;

// L'alumne ha premut «Atura».
export class StopSignal extends Error {}

const BREAK = Symbol('break');
const CONTINUE = Symbol('continue');
const RETURN = Symbol('return');

const truthy = v => !(v === false || v === null || v === 0 || v === '');
const nextTick = () => new Promise(resolve => setTimeout(resolve, 0));

export function formatValue(v) {
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (v === null || v === undefined) return 'None';
  if (v?.range) return `range(${v.range[0]}, ${v.range[1]})`;
  return String(v);
}

export async function runProgram(source, world, hooks = {}) {
  const {
    onAction = async () => {},
    print = () => {},
    shouldStop = () => false,
    pause = nextTick,
    maxSteps = MAX_STEPS,
  } = hooks;
  const { defs, body } = parse(source);

  for (const [name, node] of defs) {
    if (BUILTIN_NAMES.includes(name)) {
      throw new KarelError(`«${name}» ja és una ordre de Karel: tria un altre nom per a la teva funció.`, node.line);
    }
  }
  const candidates = [...BUILTIN_NAMES, ...defs.keys()];

  let steps = 0;
  let depth = 0;
  let mainCalled = false;

  async function tick(line) {
    steps++;
    if (steps > maxSteps) {
      throw new KarelError("massa passos: potser hi ha un bucle que no s'acaba mai.", line);
    }
    if (steps % YIELD_EVERY === 0) await pause();
    if (shouldStop()) throw new StopSignal();
  }

  async function execBlock(stmts, scope) {
    for (const s of stmts) await exec(s, scope);
  }

  // Executa el cos d'un bucle; torna false si s'ha fet «break».
  async function loopBody(stmts, scope) {
    try {
      await execBlock(stmts, scope);
    } catch (e) {
      if (e === BREAK) return false;
      if (e !== CONTINUE) throw e;
    }
    return true;
  }

  async function exec(s, scope) {
    await tick(s.line);
    switch (s.type) {
      case 'expr':
        await evaluate(s.expr, scope);
        return;
      case 'if':
        for (const { test, body: b } of s.branches) {
          if (truthy(await evaluate(test, scope))) {
            await execBlock(b, scope);
            return;
          }
        }
        await execBlock(s.orelse, scope);
        return;
      case 'while':
        while (truthy(await evaluate(s.test, scope))) {
          if (!await loopBody(s.body, scope)) break;
          await tick(s.line);
        }
        return;
      case 'for': {
        const it = await evaluate(s.iter, scope);
        if (!it?.range) throw new KarelError('«for» només funciona amb range(): for i in range(4):', s.line);
        const [start, stop, step] = it.range;
        for (let k = start; step > 0 ? k < stop : k > stop; k += step) {
          scope.set(s.name, k);
          if (!await loopBody(s.body, scope)) break;
        }
        return;
      }
      case 'pass':
        return;
      case 'break':
        throw BREAK;
      case 'continue':
        throw CONTINUE;
      case 'return':
        throw RETURN;
      default:
        throw new KarelError(`sentència desconeguda (${s.type}).`, s.line);
    }
  }

  async function callUser(name, line) {
    if (++depth > MAX_DEPTH) {
      throw new KarelError(`massa crides de funcions una dins de l'altra: «${name}» potser es crida a si mateixa sense parar.`, line);
    }
    if (name === 'main') mainCalled = true;
    try {
      await execBlock(defs.get(name).body, new Map());
    } catch (e) {
      if (e !== RETURN) throw e;
    } finally {
      depth--;
    }
    return null;
  }

  async function call(e, scope) {
    const { name, line } = e;
    const noArgs = () => {
      if (e.args.length) throw new KarelError(`«${name}()» no necessita res dins dels parèntesis.`, line);
    };
    if (defs.has(name)) {
      noArgs();
      return callUser(name, line);
    }
    if (ACTIONS[name]) {
      noArgs();
      try {
        ACTIONS[name](world);
      } catch (err) {
        if (err instanceof KarelError && !err.line) err.line = line;
        throw err;
      }
      await onAction(world, line, name);
      return null;
    }
    if (CONDITIONS[name]) {
      noArgs();
      return CONDITIONS[name](world);
    }
    const args = [];
    for (const a of e.args) args.push(await evaluate(a, scope));
    if (name === 'print') {
      print(`${args.map(formatValue).join(' ')}\n`);
      return null;
    }
    if (name === 'range') {
      if (!args.length || args.length > 3 || !args.every(Number.isInteger)) {
        throw new KarelError('range() necessita un nombre enter: range(4).', line);
      }
      const [start, stop, step = 1] = args.length === 1 ? [0, args[0]] : args;
      if (step === 0) throw new KarelError('el pas de range() no pot ser 0.', line);
      return { range: [start, stop, step] };
    }
    if (name === 'run_karel_program') {
      if (!defs.has('main')) throw new KarelError('falta definir la funció main().', line);
      return callUser('main', line);
    }
    throw new KarelError(unknownNameMessage(name, candidates), line);
  }

  async function evaluate(e, scope) {
    switch (e.type) {
      case 'const':
        return e.value;
      case 'name':
        if (scope.has(e.name)) return scope.get(e.name);
        if (e.name === '__name__') return '__main__';
        if (defs.has(e.name) || BUILTIN_NAMES.includes(e.name)) {
          throw new KarelError(`falten els parèntesis: escriu «${e.name}()».`, e.line);
        }
        throw new KarelError(unknownNameMessage(e.name, candidates), e.line);
      case 'call':
        return call(e, scope);
      case 'not':
        return !truthy(await evaluate(e.operand, scope));
      case 'logic': {
        const left = await evaluate(e.left, scope);
        if (e.op === 'and' ? !truthy(left) : truthy(left)) return left;
        return evaluate(e.right, scope);
      }
      case 'compare': {
        const a = await evaluate(e.left, scope);
        const b = await evaluate(e.right, scope);
        if (e.op === '==') return a === b;
        if (e.op === '!=') return a !== b;
        if (typeof a !== typeof b || (typeof a !== 'number' && typeof a !== 'string')) {
          throw new KarelError(`no es pot comparar ${formatValue(a)} amb ${formatValue(b)}.`, e.line);
        }
        return { '<': a < b, '>': a > b, '<=': a <= b, '>=': a >= b }[e.op];
      }
      case 'binop': {
        const a = await evaluate(e.left, scope);
        const b = await evaluate(e.right, scope);
        if (e.op === '+' && typeof a === 'string' && typeof b === 'string') return a + b;
        if (typeof a !== 'number' || typeof b !== 'number') {
          throw new KarelError(`no es pot calcular ${formatValue(a)} ${e.op} ${formatValue(b)}.`, e.line);
        }
        if ((e.op === '/' || e.op === '%') && b === 0) throw new KarelError('no es pot dividir per zero.', e.line);
        if (e.op === '+') return a + b;
        if (e.op === '-') return a - b;
        if (e.op === '*') return a * b;
        if (e.op === '/') return a / b;
        return ((a % b) + b) % b;
      }
      case 'neg': {
        const v = await evaluate(e.operand, scope);
        if (typeof v !== 'number') throw new KarelError(`no es pot fer -${formatValue(v)}.`, e.line);
        return -v;
      }
      default:
        throw new KarelError(`expressió desconeguda (${e.type}).`, e.line);
    }
  }

  await execBlock(body, new Map());
  // Estil Stanford: si hi ha main() i ningú no l'ha cridada, s'executa sola.
  if (defs.has('main') && !mainCalled) await callUser('main', defs.get('main').line);
  return { steps };
}
