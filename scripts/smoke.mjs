/**
 * Browser smoke test: plays the whole game end to end.
 *
 *   npm run build && npm run smoke
 *
 * Runs against `vite preview` (started here) in four setups:
 *   - Android-like phone with WebGL disabled   → must use the lite 2D view, never load three.js
 *   - phone and desktop with WebGL              → 3D view
 *   - manual "Usar vista ligera" toggle, ?vista=ligera, and a forced WebGL context loss
 *
 * Needs a Chromium: set CHROME_PATH, or install one with `npx playwright-core install chromium`.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const PORT = 4179;
const URL = process.env.SMOKE_URL ?? `http://localhost:${PORT}/santiago-sorpresa/`;
const launch = (args) => chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args });

function assert(cond, msg) {
  if (!cond) throw new Error('SMOKE FAIL: ' + msg);
}

async function startPreview() {
  if (process.env.SMOKE_URL) return null;
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(URL)).ok) return proc;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  proc.kill();
  throw new Error('vite preview did not start');
}

async function enterCode(page, code) {
  await page.getByRole('slider').focus();
  for (const d of code) {
    await page.keyboard.press(d);
    await page.waitForTimeout(120);
    await page.keyboard.press('Enter');
  }
  await page.waitForTimeout(200);
  return page.locator('.safe-msg').textContent();
}

async function playThrough(browser, name, ctxOpts, expectLite) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  const scripts = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('request', (r) => r.url().endsWith('.js') && scripts.push(r.url()));

  await page.goto(URL);
  assert((await page.locator('.letter-sign').textContent()).includes('Rafa, Tomás C y Tomás P'), `${name}: intro signature`);
  await page.getByRole('button', { name: 'Entrar a la habitación' }).click();
  await page.waitForTimeout(900);
  assert((await page.locator('.lite').count() > 0) === expectLite, `${name}: expected lite=${expectLite}`);
  assert((await page.getByText(/no pudo iniciar WebGL|no puede iniciar WebGL/).count()) === 0, `${name}: WebGL error text shown`);
  if (expectLite) assert(!scripts.some((s) => s.includes('SceneView')), `${name}: three.js chunk loaded in lite view`);

  // wall before clue → points to the bag
  await page.getByRole('button', { name: 'Mirar de cerca el muro de escalada' }).click();
  await page.getByRole('button', { name: 'Revisar la bolsa' }).click();
  await page.getByRole('button', { name: 'Meter la mano' }).click();
  await page.waitForTimeout(900);
  const engraving = await page.locator('.engraving').innerText();
  assert(engraving.includes('de la nieve a la laguna') && !/\d/.test(engraving), `${name}: token text`);
  await page.getByRole('button', { name: 'Ir al muro' }).click();
  assert((await page.locator('.hold-btn').count()) === 32, `${name}: every hold is tappable`);
  await page.locator('.hold-btn').first().click();
  await page.getByRole('button', { name: 'Ir a la caja' }).click();

  assert((await enterCode(page, '472')).includes('no en ese orden'), `${name}: order feedback`);
  await page.waitForTimeout(1000);
  assert((await enterCode(page, '593')).includes('color del agua'), `${name}: colour feedback`);
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Pista (1)' }).click();
  assert(!/\d/.test(await page.locator('.sheet .lead').textContent()), `${name}: hint reveals no digits`);
  await page.getByRole('button', { name: 'Gracias' }).click();
  await enterCode(page, '274');
  await page.waitForSelector('.invite', { timeout: 8000 });
  const card = await page.locator('.invite').innerText();
  assert(card.includes('Rafa · Tomás C · Tomás P'), `${name}: card signature`);
  assert(card.includes('Lo coordinamos entre todos') && !/sábado|19:30/i.test(card), `${name}: no concrete dates`);
  await page.getByRole('button', { name: 'Ver la caja abierta' }).click();
  await page.getByRole('button', { name: 'Leer la invitación' }).click();
  await page.getByRole('button', { name: 'Jugar de nuevo' }).click();
  assert((await page.locator('.progress li.done').count()) === 0, `${name}: reset clears progress`);
  assert(errors.length === 0, `${name}: page errors ${errors.join(' | ')}`);
  await ctx.close();
  console.log(`✓ ${name} (${expectLite ? 'vista ligera' : '3D'})`);
}

const phone = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36',
};
const desktop = { viewport: { width: 1440, height: 900 } };

const preview = await startPreview();
const noGL = await launch(['--disable-webgl', '--disable-webgl2', '--disable-3d-apis', '--disable-gpu']);
const withGL = await launch(['--use-angle=swiftshader', '--enable-unsafe-swiftshader']);
try {
  await playThrough(noGL, 'android sin WebGL', phone, true);
  await playThrough(noGL, 'escritorio sin WebGL', desktop, true);
  await playThrough(withGL, 'móvil con WebGL', phone, false);
  await playThrough(withGL, 'escritorio con WebGL', desktop, false);

  // manual toggle + forced lite via query + context loss
  const ctx = await withGL.newContext(phone);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.getByRole('button', { name: 'Entrar a la habitación' }).click();
  await page.getByRole('button', { name: 'Usar vista ligera' }).click();
  assert((await page.locator('.lite').count()) === 1, 'toggle → lite');
  await page.getByRole('button', { name: 'Probar vista 3D' }).click();
  await page.waitForSelector('canvas.scene-canvas');
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const c = document.querySelector('canvas.scene-canvas');
    (c.getContext('webgl2') || c.getContext('webgl')).getExtension('WEBGL_lose_context').loseContext();
  });
  await page.waitForSelector('.lite');
  assert((await page.locator('.view-note').textContent()).includes('Tu avance sigue intacto'), 'context-loss message');
  await page.goto(URL + '?vista=ligera');
  await page.getByRole('button', { name: 'Entrar a la habitación' }).click();
  assert((await page.locator('.lite').count()) === 1, '?vista=ligera');
  await ctx.close();
  console.log('✓ cambio manual de vista, ?vista=ligera y pérdida de contexto WebGL');
} finally {
  await noGL.close();
  await withGL.close();
  preview?.kill();
}
