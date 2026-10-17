import { test, expect } from '@playwright/test';
import { obre, escriu, karel, velocitat, acabat, clicCasella } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await obre(page, '/?mon=buit');
  await velocitat(page, 0);
});

test('Executa mou Karel i escriu «Programa acabat»', async ({ page }) => {
  await escriu(page, 'def main():\n    move()\n    move()\n    turn_left()\n    put_beeper()\n');
  await page.locator('#executa').click();
  await expect(page.locator('#sortida')).toContainText('Programa acabat');
  expect(await karel(page)).toEqual({ x: 3, y: 1, dir: 'north' });
  await expect(page.locator('#estat')).toHaveText(/Karel: \(3, 1\) mirant al nord/);
});

test('Ctrl+Enter executa des de l\'editor', async ({ page }) => {
  await escriu(page, 'move()');
  await page.locator('.CodeMirror textarea').focus();
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('#sortida')).toContainText('Programa acabat');
  expect((await karel(page)).x).toBe(2);
});

test('error: missatge vermell amb línia i línia marcada', async ({ page }) => {
  await escriu(page, 'move()\nmoev()\n');
  await page.locator('#executa').click();
  await expect(page.locator('#sortida .error')).toHaveText('Línia 2: «moev» no existeix. Volies dir «move»?');
  await expect(page.locator('.CodeMirror .linia-error')).toHaveCount(1);
});

test('xoc amb la paret: error i Karel es queda a la vora', async ({ page }) => {
  await escriu(page, 'for i in range(10):\n    move()\n');
  await page.locator('#executa').click();
  await expect(page.locator('#sortida .error')).toContainText('Línia 2: Karel ha xocat');
  expect((await karel(page)).x).toBe(8);
});

test('Atura interromp un bucle infinit', async ({ page }) => {
  await velocitat(page, 1);
  await escriu(page, 'while True:\n    turn_left()\n');
  await page.locator('#executa').click();
  await expect(page.locator('#atura')).toBeEnabled();
  await page.locator('#atura').click();
  await expect(page.locator('#sortida')).toContainText('Aturat');
  await expect(page.locator('#executa')).toBeEnabled();
});

test('Pas a pas: una acció per clic, després Continua', async ({ page }) => {
  await escriu(page, 'move()\nmove()\nmove()\n');
  await page.locator('#pas').click();
  await expect(page.locator('#executa')).toHaveText('▶ Continua');
  expect((await karel(page)).x).toBe(2);
  await expect(page.locator('.CodeMirror .linia-actual')).toHaveCount(1);
  await page.locator('#pas').click();
  await expect.poll(async () => (await karel(page)).x).toBe(3);
  await page.locator('#executa').click();
  await acabat(page);
  expect((await karel(page)).x).toBe(4);
});

test('Reinicia torna al món inicial', async ({ page }) => {
  await escriu(page, 'move()\nput_beeper()');
  await page.locator('#executa').click();
  await acabat(page);
  await page.locator('#reinicia').click();
  expect(await karel(page)).toEqual({ x: 1, y: 1, dir: 'east' });
  expect(await page.evaluate(() => window.karelApp.world.beepers.size)).toBe(0);
});

test('print escriu a Sortida', async ({ page }) => {
  await escriu(page, 'print("Hola", 2 + 3)');
  await page.locator('#executa').click();
  await expect(page.locator('#sortida')).toContainText('Hola 5');
});

test('el codi es desa per a cada món', async ({ page }) => {
  await escriu(page, '# codi del món lliure\nmove()');
  await page.locator('#mon').selectOption('fila');
  await expect(page.locator('#enunciat')).toContainText('carrer 1'); // loadMon() ha acabat
  await escriu(page, '# codi de la fila');
  await page.waitForTimeout(700);
  await obre(page, '/'); // sense ?mon=: es recorda l'últim món
  await expect(page.locator('#mon')).toHaveValue('fila');
  expect(await page.evaluate(() => window.karelApp.editor.getValue())).toBe('# codi de la fila');
  await page.locator('#mon').selectOption('buit');
  await expect.poll(() => page.evaluate(() => window.karelApp.editor.getValue())).toBe('# codi del món lliure\nmove()');
});

test('?mon= obre el món indicat amb el seu enunciat', async ({ page }) => {
  await obre(page, '/?mon=laberint');
  await expect(page.locator('#mon')).toHaveValue('laberint');
  await expect(page.locator('#enunciat')).toContainText('laberint');
  expect(await page.evaluate(() => window.karelApp.world.cols)).toBe(5);
});

test('editor de mons: paret, beeper i Karel', async ({ page }) => {
  await page.locator('[data-pestanya="edita-mon"]').click();
  // paret a l'est de (1, 1): clic a prop de la vora dreta
  await clicCasella(page, 1, 1, { dx: 0.45 });
  expect(await page.evaluate(() => [...window.karelApp.initial.walls])).toEqual(['1,1,east']);
  await page.locator('input[value="beeper"]').check();
  await clicCasella(page, 3, 2);
  await clicCasella(page, 3, 2);
  await clicCasella(page, 3, 2, { modifiers: ['Shift'] });
  expect(await page.evaluate(() => [...window.karelApp.initial.beepers])).toEqual([['3,2', 1]]);
  await page.locator('input[value="karel"]').check();
  await clicCasella(page, 4, 4);
  await clicCasella(page, 4, 4);
  expect(await page.evaluate(() => window.karelApp.initial.karel)).toEqual({ x: 4, y: 4, dir: 'north' });
  // es manté després de recarregar
  await page.reload();
  await page.waitForFunction(() => window.karelApp?.ready === true);
  expect(await page.evaluate(() => window.karelApp.initial.karel)).toEqual({ x: 4, y: 4, dir: 'north' });
  // Restaura l'original
  page.on('dialog', d => d.accept());
  await page.locator('[data-pestanya="edita-mon"]').click();
  await page.locator('#mon-restaura').click();
  await expect.poll(() => page.evaluate(() => window.karelApp.initial.walls.size)).toBe(0);
});

test('editor de mons: canviar la mida', async ({ page }) => {
  await page.locator('[data-pestanya="edita-mon"]').click();
  await page.locator('#mon-cols').fill('12');
  await page.locator('#mon-files').fill('3');
  await page.locator('#mon-mida').click();
  expect(await page.evaluate(() => [window.karelApp.initial.cols, window.karelApp.initial.rows])).toEqual([12, 3]);
});

test('Desa .py i Obre .py', async ({ page }, testInfo) => {
  await escriu(page, 'move()\nturn_left()\n');
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#desa-py').click()]);
  expect(download.suggestedFilename()).toBe('buit.py');
  const path = testInfo.outputPath('programa.py');
  await download.saveAs(path);
  await escriu(page, '');
  await page.locator('#fitxer-py').setInputFiles(path);
  await expect.poll(() => page.evaluate(() => window.karelApp.editor.getValue())).toBe('move()\nturn_left()\n');
});

test('Obre .w carrega un món de Stanford', async ({ page }) => {
  await page.locator('#fitxer-w').setInputFiles({
    name: 'prova.w', mimeType: 'text/plain',
    buffer: Buffer.from('Dimension: (4, 3)\nBeeper: (2, 2); 3\nKarel: (4, 3); west\nBeeperBag: 2\n'),
  });
  await expect.poll(() => page.evaluate(() => window.karelApp.world.karel)).toEqual({ x: 4, y: 3, dir: 'west' });
  await expect(page.locator('#estat')).toContainText('Beepers a la bossa: 2');
});

test('Prova-ho del manual copia l\'exemple a l\'editor', async ({ page }) => {
  await escriu(page, '');
  await page.locator('[data-pestanya="manual"]').click();
  await page.locator('#cerca-manual').fill('turn_left');
  await page.locator('#manual .ordre button').first().click();
  await expect(page.locator('#pestanya-editor')).toBeVisible();
  expect(await page.evaluate(() => window.karelApp.editor.getValue())).toBe('turn_left()\nmove()');
});

test('pantalla estreta: una sola columna, sense desplaçament horitzontal', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 800 });
  await obre(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
