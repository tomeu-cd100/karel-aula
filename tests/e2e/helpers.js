export async function obre(page, url = '/') {
  await page.goto(url);
  await page.waitForFunction(() => window.karelApp?.ready === true);
}

export const escriu = (page, code) =>
  page.evaluate(c => window.karelApp.editor.setValue(c), code);

export const karel = page => page.evaluate(() => ({ ...window.karelApp.world.karel }));

export const velocitat = (page, v) => page.locator('#velocitat').fill(String(v));

export const acabat = page => page.waitForFunction(() => window.karelApp.runner.state === 'idle');

// Clic dins la casella (x, y) del món; dx, dy en fraccions de casella des del centre.
export async function clicCasella(page, x, y, { dx = 0, dy = 0, ...opts } = {}) {
  const pos = await page.evaluate(([x, y, dx, dy]) => {
    const { layout: l, initial: w } = window.karelApp;
    const canvas = document.getElementById('canvas');
    const r = canvas.getBoundingClientRect();
    const k = r.width / canvas.width;
    return {
      x: (l.left + (x - 0.5 + dx) * l.cell) * k,
      y: (l.top + (w.rows - y + 0.5 - dy) * l.cell) * k,
    };
  }, [x, y, dx, dy]);
  await page.locator('#canvas').click({ position: pos, ...opts });
}
