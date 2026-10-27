// Frame-stepped capture of the site: rAF, performance.now and Date run on a virtual clock
// so every 3D frame lands exactly 1/30 s apart regardless of how slow the capture is.
import { chromium } from 'playwright-core';
import fs from 'fs';

const FPS = Number(process.env.FPS || 30), DT = 1000 / FPS;
const DPR = Number(process.env.DPR || 1);
const W = 1600, H = 924;
const OUT = 'frames';
const LIMIT = Number(process.argv[2] || 1e9); // optional frame cap for tests
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT);

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.addInitScript(() => {
  const realRAF = window.requestAnimationFrame.bind(window);
  const realNow = performance.now.bind(performance);
  const RealDate = Date;
  let vt = realNow(); const t0 = vt; const d0 = RealDate.now();
  let queue = new Map(), id = 0, manual = false;
  performance.now = () => vt;
  window.requestAnimationFrame = (cb) => { queue.set(++id, cb); return id; };
  window.cancelAnimationFrame = (i) => queue.delete(i);
  const flush = () => { const q = queue; queue = new Map(); for (const cb of q.values()) { try { cb(vt); } catch (e) { console.error(e); } } };
  const auto = () => { if (manual) return; vt = Math.max(vt, realNow()); flush(); realRAF(auto); };
  realRAF(auto);
  class VDate extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(d0 + (vt - t0)); }
    static now() { return d0 + (vt - t0); }
  }
  window.Date = VDate;
  window.__manual = () => { manual = true; };
  window.__step = (ms) => { vt += ms; flush(); };
});
const cdp = await page.context().newCDPSession(page);
await cdp.send('Animation.enable');

await page.goto('http://localhost:5173/', { waitUntil: 'load' });
// Let the scene load on the real clock, then freeze time the moment it's ready.
await page.waitForFunction(() => document.querySelector('#loader-bar').style.transform === 'scaleX(1)', null, { timeout: 90000, polling: 'raf' });
await page.evaluate(() => window.__manual());

const geo = await page.evaluate(() => {
  const top = (s) => document.querySelector(s).getBoundingClientRect().top + scrollY;
  const cards = [...document.querySelectorAll('.card')].map((c) => {
    const r = c.getBoundingClientRect(); return r.top + scrollY + r.height / 2 - innerHeight / 2;
  });
  return { anatomy: top('#anatomy'), specs: top('#specifications'), explore: top('#explore'), cards };
});
const btn = async (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

// Storyboard (seconds of site footage).
const S = 27.5;
const scrollAt = (t) => {
  const seg = (t0, t1, a, b) => (t >= t0 && t < t1 ? lerp(a, b, ease((t - t0) / (t1 - t0))) : null);
  const c = geo.cards;
  return (
    (t < 7.6 ? 0 : null) ??
    seg(7.6, 9.4, 0, c[0]) ??
    seg(9.4, 17.0, c[0], c[c.length - 1]) ??
    seg(17.0, 18.6, c[c.length - 1], geo.specs + 40) ??
    (t < 20.4 ? geo.specs + 40 : null) ??
    seg(20.4, 21.8, geo.specs + 40, geo.explore) ??
    geo.explore
  );
};

const cursorLog = [];
let cursor = { x: W * 0.78, y: H * 0.72, down: false, visible: 0 };
let explodeBtn, zoomBtn;
const moveCursor = async (x, y) => { cursor.x = x; cursor.y = y; await page.mouse.move(x, y); };
const click = async () => { cursor.down = true; await page.mouse.down(); await page.mouse.up(); };

const total = Math.min(LIMIT, Math.round(S * FPS));
const t0 = Date.now(); let rateSet = false;
for (let f = 0; f < total; f++) {
  const t = f / FPS;
  cursor.down = false;
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), scrollAt(t));

  // Explore interactions, driven with real pointer events.
  if (t >= 21.8) {
    if (!explodeBtn) { explodeBtn = await btn('#explode-btn'); zoomBtn = await btn('[data-action="zoom-in"]'); }
    cursor.visible = Math.min(1, (t - 21.8) / 0.4);
    const path = (t0, t1, a, b) => { if (t >= t0 && t < t1) { const k = ease((t - t0) / (t1 - t0)); return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) }; } return null; };
    const rest = { x: W * 0.78, y: H * 0.72 };
    const dragA = { x: W * 0.42, y: H * 0.42 }, dragB = { x: W * 0.42 + 85, y: H * 0.42 - 4 };
    const p =
      path(21.8, 22.7, rest, explodeBtn) ??
      (t < 23.0 ? explodeBtn : null) ??
      path(23.0, 23.7, explodeBtn, dragA) ??
      (t < 23.8 ? dragA : null) ??
      path(23.8, 25.0, dragA, dragB) ??
      path(25.0, 25.6, dragB, zoomBtn) ??
      (t < 26.3 ? zoomBtn : null) ??
      path(26.5, 27.3, zoomBtn, { x: zoomBtn.x + 260, y: zoomBtn.y - 180 }) ??
      (t < 26.5 ? zoomBtn : { x: zoomBtn.x + 260, y: zoomBtn.y - 180 });
    await moveCursor(p.x, p.y);
    const at = (s) => f === Math.round(s * FPS);
    if (at(22.75)) await click();
    if (at(25.75) || at(26.1)) await click();
    if (at(23.8)) { await page.mouse.down(); cursor.down = true; }
    if (t > 23.8 && t < 25.0) cursor.down = true;
    if (at(25.0)) await page.mouse.up();
  }
  cursorLog.push({ ...cursor });

  await page.evaluate((ms) => window.__step(ms), DT);
  await page.screenshot({ path: `${OUT}/${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 95 });

  // Slow CSS transitions to match the capture speed, so fades look natural in the video.
  if (f === 15 && !rateSet) {
    const per = (Date.now() - t0) / 16;
    await cdp.send('Animation.setPlaybackRate', { playbackRate: Math.min(1, DT / per) });
    rateSet = true;
    console.log(`capture ${per.toFixed(0)} ms/frame`);
  }
  if (f % 60 === 0) console.log(`frame ${f}/${total}`);
}
fs.writeFileSync('cursor.json', JSON.stringify(cursorLog));
fs.writeFileSync('geo.json', JSON.stringify(geo));
console.log('done in', ((Date.now() - t0) / 1000).toFixed(0), 's');
await browser.close();
