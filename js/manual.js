export function filterEntries(list, query) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(e => [e.nom, e.descripcio].some(t => t.toLowerCase().includes(q)));
}

export function renderManual(container, list, onTry) {
  container.textContent = '';
  const groups = new Map();
  for (const e of list) {
    if (!groups.has(e.categoria)) groups.set(e.categoria, []);
    groups.get(e.categoria).push(e);
  }
  for (const [categoria, items] of groups) {
    const section = document.createElement('section');
    section.className = 'manual-cat';
    const h3 = document.createElement('h3');
    h3.textContent = categoria;
    section.append(h3);
    for (const e of items) {
      const div = document.createElement('div');
      div.className = 'ordre';
      const code = document.createElement('code');
      code.textContent = e.nom;
      const desc = document.createElement('p');
      desc.textContent = e.descripcio;
      const pre = document.createElement('pre');
      pre.textContent = e.exemple;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Prova-ho';
      button.addEventListener('click', () => onTry(e.exemple));
      div.append(code, desc, pre, button);
      section.append(div);
    }
    container.append(section);
  }
}
