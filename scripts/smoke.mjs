/**
 * Browser smoke test: plays the whole game end to end.
 *
 *   npm run build && npm run smoke
 *
 * Runs against `vite preview` (started here):
 *   - desktop with WebGL2, Android-like phone with WebGL2, and the same phone with only WebGL1
 *     (Chromium --disable-webgl2) → the full game in 3D, and the right context version
 *   - WebGL context lost + restored, and lost without restore (canvas is rebuilt, progress kept)
 *   - no WebGL at all → honest, actionable message instead of a broken page
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

async function playThrough(browser, name, ctxOpts, expectGL) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto(URL);
  assert((await page.locator('.letter-sign').textContent()).includes('Rafa, Tomás C y Tomás P'), `${name}: intro signature`);
  await page.getByRole('button', { name: 'Entrar a la habitación' }).click();
  const canvas = page.locator('canvas.scene-canvas[data-webgl]');
  await canvas.waitFor({ timeout: 15000 });
  assert((await canvas.getAttribute('data-webgl')) === String(expectGL), `${name}: expected WebGL${expectGL}`);
  const ratio = await page.evaluate(() => {
    const c = document.querySelector('canvas.scene-canvas');
    return c.width / c.clientWidth;
  });
  if (ctxOpts.isMobile) assert(ratio <= 1.5 + 0.01, `${name}: phone pixel ratio ${ratio}`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${process.env.SMOKE_SHOTS ?? '.'}/smoke-${name.replace(/\W+/g, '-')}.png` }).catch(() => {});

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
  console.log(`✓ ${name} (3D, WebGL${expectGL}, pixel ratio ${ratio})`);
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
const gl2 = await launch(['--use-angle=swiftshader', '--enable-unsafe-swiftshader']);
const gl1 = await launch(['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-webgl2']);
const noGL = await launch(['--disable-webgl', '--disable-webgl2', '--disable-3d-apis', '--disable-gpu']);
try {
  await playThrough(gl2, 'escritorio', desktop, 2);
  await playThrough(gl2, 'android', phone, 2);
  await playThrough(gl1, 'android solo WebGL1', phone, 1);

  // context lost → restored, then lost for good → canvas rebuilt; progress survives both
  {
    const ctx = await gl2.newContext(phone);
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.getByRole('button', { name: 'Entrar a la habitación' }).click();
    await page.getByRole('button', { name: 'Inspeccionar la bolsa de magnesio' }).click();
    await page.getByRole('button', { name: 'Meter la mano' }).click();
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await page.locator('canvas.scene-canvas[data-webgl]').waitFor();
    await page.evaluate(() => {
      const c = document.querySelector('canvas.scene-canvas');
      const ext = (c.getContext('webgl2') || c.getContext('webgl')).getExtension('WEBGL_lose_context');
      window.__ext = ext;
      ext.loseContext();
    });
    await page.getByText('Recuperando los gráficos 3D').waitFor();
    await page.evaluate(() => window.__ext.restoreContext());
    await page.getByRole('button', { name: 'Acercarse a la caja fuerte' }).waitFor();
    assert((await page.getByText('Recuperando los gráficos 3D').count()) === 0, 'context restored');
    await page.evaluate(() => {
      const c = document.querySelector('canvas.scene-canvas');
      (c.getContext('webgl2') || c.getContext('webgl')).getExtension('WEBGL_lose_context').loseContext();
    });
    await page.getByText('Recuperando los gráficos 3D').waitFor();
    await page.getByRole('button', { name: 'Acercarse a la caja fuerte' }).waitFor({ timeout: 8000 });
    assert((await page.locator('canvas.scene-canvas[data-webgl]').count()) === 1, 'canvas rebuilt after giving up');
    assert((await page.locator('.progress li.done').count()) === 1, 'progress kept across context loss');
    await ctx.close();
    console.log('✓ contexto WebGL perdido → restaurado, y perdido sin restaurar → canvas recreado, avance intacto');
  }

  // no WebGL at all → honest message, no 2D replacement
  {
    const ctx = await noGL.newContext(phone);
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.getByRole('button', { name: 'Entrar a la habitación' }).click();
    const alert = page.getByRole('alert');
    await alert.waitFor();
    const text = await alert.innerText();
    assert(/aceleración gráfica/.test(text) && /Chrome o Firefox/.test(text), 'actionable no-WebGL message');
    assert((await page.getByRole('button', { name: 'Reintentar' }).count()) === 1, 'retry button');
    await ctx.close();
    console.log('✓ sin WebGL: mensaje claro con “Reintentar”, sin vista alternativa');
  }
} finally {
  await gl2.close();
  await gl1.close();
  await noGL.close();
  preview?.kill();
}
