import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
import fs from 'fs';
// Renders the monitor composite and pipes JPEG frames straight into ffmpeg.
const FPS = Number(process.env.FPS || 30), DPR = Number(process.env.DPR || 1), TOTAL = 30 * FPS;
const OUTFILE = process.env.OUT || 'out.mp4';
const cursor = JSON.parse(fs.readFileSync('cursor.json', 'utf8'));
const siteFrames = fs.readdirSync('frames').length;
const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null;
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: DPR });
await page.goto('file://' + process.cwd() + '/comp.html', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const render = (v) => {
  const sf = Math.min(v, siteFrames - 1);
  return page.evaluate(([v, sf, c, fps]) => window.renderFrame(v, sf, c, fps), [v, sf, cursor[sf] || { visible: 0, x: 0, y: 0 }, FPS]);
};
if (only) {
  fs.mkdirSync('out', { recursive: true });
  for (const v of only) { await render(v); await page.screenshot({ path: `out/${String(v).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 }); }
} else {
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-profile:v', 'high', '-level', '5.2', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', OUTFILE], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((r) => ff.on('close', r));
  for (let v = 0; v < TOTAL; v++) {
    await render(v);
    const buf = await page.screenshot({ type: 'jpeg', quality: 97 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (v % 150 === 0) console.log('comp', v, '/', TOTAL);
  }
  ff.stdin.end(); await done;
}
await browser.close();
