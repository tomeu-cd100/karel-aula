// Analitzador del subconjunt de Python que fa servir Karel.
// Resultat: { defs: Map(nom → node def), body: [sentències] }.

import { tokenize } from './lexer.js';
import { KarelError } from './errors.js';

const KEYWORDS = new Set([
  'def', 'if', 'elif', 'else', 'while', 'for', 'in', 'not', 'and', 'or', 'pass', 'break',
  'continue', 'return', 'True', 'False', 'None', 'from', 'import', 'class', 'lambda',
  'global', 'try', 'except', 'with', 'is',
]);
const COMPARE = ['==', '!=', '<', '>', '<=', '>='];

export function parse(source) {
  const tokens = tokenize(source);
  let i = 0;
  let loops = 0;
  let inDef = false;
  const defs = new Map();

  const peek = (o = 0) => tokens[i + o];
  const next = () => tokens[i++];
  const isOp = (v, t = peek()) => t.type === 'OP' && t.value === v;
  const isKw = (v, t = peek()) => t.type === 'NAME' && t.value === v;
  const show = t => (t.type === 'NEWLINE' ? 'el final de la línia'
    : t.type === 'EOF' ? 'el final del programa'
    : t.type === 'INDENT' || t.type === 'DEDENT' ? 'un canvi de sagnat'
    : `«${t.value}»`);
  const fail = (msg, t = peek()) => { throw new KarelError(msg, t.line); };

  function expectOp(v, msg) {
    if (!isOp(v)) fail(msg ?? `s'esperava «${v}» però hi ha ${show(peek())}.`);
    return next();
  }

  function expectColon() {
    if (!isOp(':')) fail('falten els dos punts «:» al final de la línia.', tokens[i - 1]);
    next();
  }

  function expectName(what) {
    const t = peek();
    if (t.type !== 'NAME' || KEYWORDS.has(t.value)) fail(`s'esperava ${what} però hi ha ${show(t)}.`);
    return next();
  }

  function block(header) {
    expectColon();
    if (peek().type !== 'NEWLINE') return simpleLine();
    next();
    if (peek().type !== 'INDENT') {
      fail(`cal sagnar (deixar espais a l'inici) les línies de dins del «${header}».`);
    }
    next();
    const body = [];
    while (peek().type !== 'DEDENT' && peek().type !== 'EOF') body.push(...statement());
    if (peek().type === 'DEDENT') next();
    return body;
  }

  function statement() {
    const t = peek();
    if (t.type === 'INDENT') fail("sagnat inesperat: aquesta línia té més espais a l'inici que l'anterior.");
    if (t.type === 'NAME') {
      switch (t.value) {
        case 'def': return [defStatement()];
        case 'if': return [ifStatement()];
        case 'while': {
          next();
          const test = expression();
          loops++;
          const body = block('while');
          loops--;
          return [{ type: 'while', test, body, line: t.line }];
        }
        case 'for': {
          next();
          const name = expectName('el nom d\'una variable').value;
          if (!isKw('in')) fail('s\'esperava «in»: for i in range(4):');
          next();
          const iter = expression();
          loops++;
          const body = block('for');
          loops--;
          return [{ type: 'for', name, iter, body, line: t.line }];
        }
        case 'elif':
        case 'else':
          fail(`«${t.value}» sense un «if» al davant (o amb un sagnat diferent del seu «if»).`);
          break;
        case 'from':
        case 'import':
          // from karel.stanfordkarel import * → no cal: s'ignora.
          while (peek().type !== 'NEWLINE' && peek().type !== 'EOF') next();
          if (peek().type === 'NEWLINE') next();
          return [];
        default:
      }
    }
    return simpleLine();
  }

  function defStatement() {
    const t = next();
    if (inDef) fail('defineix les funcions fora de les altres funcions.', t);
    const name = expectName('el nom de la funció');
    if (!isOp('(')) fail(`després del nom cal posar parèntesis: def ${name.value}():`);
    next();
    if (!isOp(')')) fail('les funcions de Karel no tenen paràmetres: deixa els parèntesis buits.');
    next();
    inDef = true;
    const saved = loops;
    loops = 0;
    const body = block('def');
    loops = saved;
    inDef = false;
    const node = { type: 'def', name: name.value, body, line: t.line };
    defs.set(name.value, node);
    return node;
  }

  function ifStatement() {
    const t = next();
    const branches = [{ test: expression(), body: block('if') }];
    let orelse = [];
    while (isKw('elif')) {
      next();
      branches.push({ test: expression(), body: block('elif') });
    }
    if (isKw('else')) {
      next();
      orelse = block('else');
    }
    return { type: 'if', branches, orelse, line: t.line };
  }

  // Una o més sentències simples a la mateixa línia, separades per «;».
  function simpleLine() {
    const out = [simpleStatement()];
    while (isOp(';')) {
      next();
      if (peek().type === 'NEWLINE') break;
      out.push(simpleStatement());
    }
    if (peek().type === 'NEWLINE') next();
    else if (peek().type !== 'EOF' && peek().type !== 'DEDENT') {
      fail(`no s'entén ${show(peek())} aquí. Posa cada ordre en una línia.`);
    }
    return out;
  }

  function simpleStatement() {
    const t = peek();
    if (t.type === 'NAME') {
      if (t.value === 'pass') { next(); return { type: 'pass', line: t.line }; }
      if (t.value === 'break' || t.value === 'continue') {
        next();
        if (!loops) fail(`«${t.value}» només es pot fer servir dins d'un bucle (while o for).`, t);
        return { type: t.value, line: t.line };
      }
      if (t.value === 'return') {
        next();
        if (!inDef) fail('«return» només es pot fer servir dins d\'una funció.', t);
        if (peek().type !== 'NEWLINE' && !isOp(';')) expression(); // el valor no s'usa
        return { type: 'return', line: t.line };
      }
      if (['def', 'if', 'while', 'for'].includes(t.value)) {
        fail(`«${t.value}» ha d'anar al principi d'una línia nova.`);
      }
    }
    const expr = expression();
    if (isOp('=')) {
      const target = expr.type === 'name' ? `«${expr.name} = …»` : 'el signe «=»';
      fail(`Karel no fa servir variables (${target}). Per comparar, fes servir «==».`);
    }
    if (expr.type === 'name') fail(`falten els parèntesis: escriu «${expr.name}()».`, t);
    return { type: 'expr', expr, line: t.line };
  }

  // Expressions, de menys a més prioritat.
  function expression() {
    let left = andExpr();
    while (isKw('or')) {
      const t = next();
      left = { type: 'logic', op: 'or', left, right: andExpr(), line: t.line };
    }
    return left;
  }

  function andExpr() {
    let left = notExpr();
    while (isKw('and')) {
      const t = next();
      left = { type: 'logic', op: 'and', left, right: notExpr(), line: t.line };
    }
    return left;
  }

  function notExpr() {
    if (isKw('not')) {
      const t = next();
      return { type: 'not', operand: notExpr(), line: t.line };
    }
    return comparison();
  }

  function comparison() {
    let left = additive();
    while (peek().type === 'OP' && COMPARE.includes(peek().value)) {
      const t = next();
      left = { type: 'compare', op: t.value, left, right: additive(), line: t.line };
    }
    return left;
  }

  function additive() {
    let left = term();
    while (isOp('+') || isOp('-')) {
      const t = next();
      left = { type: 'binop', op: t.value, left, right: term(), line: t.line };
    }
    return left;
  }

  function term() {
    let left = unary();
    while (isOp('*') || isOp('/') || isOp('%')) {
      const t = next();
      left = { type: 'binop', op: t.value, left, right: unary(), line: t.line };
    }
    return left;
  }

  function unary() {
    if (isOp('-')) {
      const t = next();
      return { type: 'neg', operand: unary(), line: t.line };
    }
    return primary();
  }

  function primary() {
    const t = peek();
    if (t.type === 'NUMBER' || t.type === 'STRING') {
      next();
      return { type: 'const', value: t.value, line: t.line };
    }
    if (isOp('(')) {
      next();
      const e = expression();
      expectOp(')', 'falta tancar el parèntesi.');
      return e;
    }
    if (t.type === 'NAME') {
      if (t.value === 'True' || t.value === 'False' || t.value === 'None') {
        next();
        return { type: 'const', value: t.value === 'None' ? null : t.value === 'True', line: t.line };
      }
      if (t.value === 'true' || t.value === 'false') {
        fail(`a Python s'escriu amb majúscula: «${t.value === 'true' ? 'True' : 'False'}».`);
      }
      if (KEYWORDS.has(t.value)) fail(`no s'entén «${t.value}» aquí.`);
      next();
      if (!isOp('(')) return { type: 'name', name: t.value, line: t.line };
      next();
      const args = [];
      while (!isOp(')')) {
        if (peek().type === 'NEWLINE' || peek().type === 'EOF') fail('falta tancar el parèntesi.');
        args.push(expression());
        if (!isOp(',')) break;
        next();
      }
      expectOp(')', 'falta tancar el parèntesi.');
      return { type: 'call', name: t.value, args, line: t.line };
    }
    fail(`no s'entén ${show(t)} aquí.`);
  }

  const body = [];
  while (peek().type !== 'EOF') {
    if (peek().type === 'DEDENT' || peek().type === 'NEWLINE') { next(); continue; }
    body.push(...statement());
  }
  return { defs, body: body.filter(s => s.type !== 'def') };
}
