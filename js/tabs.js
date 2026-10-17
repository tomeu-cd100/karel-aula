export function setupTabs(root, onShow = () => {}) {
  const buttons = [...root.querySelectorAll('[role="tab"]')];
  for (const button of buttons) {
    button.addEventListener('click', () => {
      for (const b of buttons) {
        const active = b === button;
        b.setAttribute('aria-selected', String(active));
        document.getElementById(`pestanya-${b.dataset.pestanya}`).hidden = !active;
      }
      onShow(button.dataset.pestanya);
    });
  }
}
