// Àrea de Sortida: text de print(), errors (vermell) i avisos d'estat (verd).

export function writeOutput(el, text, cls) {
  const node = cls ? document.createElement('span') : document.createTextNode(text);
  if (cls) {
    node.className = cls;
    node.textContent = text;
  }
  el.append(node);
  el.scrollTop = el.scrollHeight;
}

export const writeError = (el, message) => writeOutput(el, `${message}\n`, 'error');
export const writeOk = (el, message) => writeOutput(el, `${message}\n`, 'ok');
