// Lay the film's 2D layer (type, tracked callouts, letterbox, flares, grain) over the graded Cycles plates,
// render the score, and encode the 1080p24 master.
//   node cycles/composite.mjs                    -> dist/goalzero-skylight-sizzle-60s-cycles.mp4
//   node cycles/composite.mjs --stills 9.2,31.5  -> dist/stills-cycles/
//   node cycles/composite.mjs --workers 2        parallel browser workers (default 3)
// Needs Playwright (global install), ffmpeg with libx264, and cycles/plates/ from render_all.sh.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const DIST = path.join(ROOT, 'dist');
const PLATES = process.env.PLATES || path.join(HERE, 'plates');
const FPS = 24;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const OUT = 'goalzero-skylight-sizzle-60s-cycles.mp4';
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const WORKERS = +(arg('--workers') || 3);

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href + '#plates');
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
  return page;
}

// Plate n (0-based output frame) is Cycles frame n + 1. The photo beat has no plate by design.
function plateURL(n) {
  const f = path.join(PLATES, `f${String(n + 1).padStart(4, '0')}.jpg`);
  return fs.existsSync(f) ? 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64') : null;
}

async function compose(page, n) {
  const url = await page.evaluate(([t, u]) => window.__composite(t, u, 0.35), [n / FPS, plateURL(n)]);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
}

function run(args, input) {
  return new Promise((res, rej) => {
    const p = spawn(FFMPEG, args, { stdio: [input ? 'pipe' : 'ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => (err += d));
    p.on('close', c => (c === 0 ? res() : rej(new Error(err.slice(-2000)))));
    if (input) input(p.stdin);
  });
}

async function segment(browser, idx, f0, f1) {
  const page = await openPage(browser);
  const out = path.join(DIST, `.cseg${idx}.mp4`);
  const t0 = Date.now();
  await run(['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), out],
  async stdin => {
    for (let n = f0; n < f1; n++) {
      const buf = await compose(page, n);
      if (!stdin.write(buf)) await new Promise(r => stdin.once('drain', r));
      if ((n - f0) % 96 === 0) console.log(`worker ${idx}: frame ${n} of ${f0}-${f1}, ${((Date.now() - t0) / Math.max(1, n - f0) / 1000).toFixed(2)} s/frame`);
    }
    stdin.end();
  });
  await page.close();
  return out;
}

async function main() {
  fs.mkdirSync(DIST, { recursive: true });
  const browser = await chromium.launch();

  const stills = arg('--stills');
  if (stills) {
    const dir = path.join(DIST, 'stills-cycles');
    fs.mkdirSync(dir, { recursive: true });
    const page = await openPage(browser);
    for (const t of stills.split(',').map(Number)) {
      fs.writeFileSync(path.join(dir, `t${t.toFixed(2)}.jpg`), await compose(page, Math.round(t * FPS)));
      console.log('still', t);
    }
    await browser.close();
    return;
  }

  const page = await openPage(browser);
  const dur = await page.evaluate(() => window.__DUR);
  const { b64, peak } = await page.evaluate(() => window.__renderAudio());
  const wav = path.join(DIST, '.caudio.wav');
  fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
  console.log(`audio rendered, peak ${peak.toFixed(3)}`);
  await page.close();

  const total = Math.round(dur * FPS), per = Math.ceil(total / WORKERS);
  const missing = [];
  for (let n = 0; n < total; n++) if (!fs.existsSync(path.join(PLATES, `f${String(n + 1).padStart(4, '0')}.jpg`))) missing.push(n + 1);
  console.log(`${total - missing.length} plates, ${missing.length} frames without one (the photo beat should be 96)`);
  const segs = await Promise.all(Array.from({ length: WORKERS }, (_, i) =>
    segment(browser, i, i * per, Math.min(total, (i + 1) * per))));
  await browser.close();
  const list = path.join(DIST, '.csegs.txt');
  fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n'));
  const out = path.join(DIST, OUT);
  await run(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-i', wav, '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart', out]);
  for (const f of [...segs, list, wav]) fs.rmSync(f);
  console.log(`wrote ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
}

main().catch(e => { console.error(e); process.exit(1); });
