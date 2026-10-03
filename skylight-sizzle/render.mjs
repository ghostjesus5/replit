// Frame-accurate export of index.html to a 1080p30 H.264/AAC master.
//   node render.mjs                      full render to dist/goalzero-skylight-sizzle-60s.mp4
//   node render.mjs --stills 4.6,14.8    PNG stills to dist/stills/
//   node render.mjs --workers 3          parallel browser workers (default 4)
// Needs Playwright (global install) and an ffmpeg with libx264 on PATH (or the FFMPEG env var).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const FPS = 30;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const OUT = 'goalzero-skylight-sizzle-60s.mp4';
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const WORKERS = +(arg('--workers') || 4);

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('page error:', e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('console:', m.text().slice(0, 300)); });
  await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href + '#capture');
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
  return page;
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
  const out = path.join(DIST, `.seg${idx}.mp4`);
  const t0 = Date.now();
  await run(['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), out],
  async stdin => {
    for (let n = f0; n < f1; n++) {
      const url = await page.evaluate(t => window.__frame(t), n / FPS);
      const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
      if (!stdin.write(buf)) await new Promise(r => stdin.once('drain', r));
      if ((n - f0) % 60 === 0) console.log(`worker ${idx}: frame ${n} of ${f0}-${f1}, ${((Date.now() - t0) / Math.max(1, n - f0) / 1000).toFixed(2)} s/frame`);
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
    fs.mkdirSync(path.join(DIST, 'stills'), { recursive: true });
    const page = await openPage(browser);
    for (const t of stills.split(',').map(Number)) {
      const t0 = Date.now();
      const url = await page.evaluate(t => { window.__seek(t); return document.getElementById('cv').toDataURL('image/png'); }, t);
      fs.writeFileSync(path.join(DIST, 'stills', `t${t.toFixed(2)}.png`), Buffer.from(url.split(',')[1], 'base64'));
      console.log(`still ${t} in ${Date.now() - t0} ms`);
    }
    await browser.close();
    return;
  }

  const page = await openPage(browser);
  const dur = await page.evaluate(() => window.__DUR);
  const { b64, peak } = await page.evaluate(() => window.__renderAudio());
  const wav = path.join(DIST, '.audio.wav');
  fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
  console.log(`audio rendered, peak ${peak.toFixed(3)}`);
  await page.close();

  const total = Math.round(dur * FPS), per = Math.ceil(total / WORKERS);
  const segs = await Promise.all(Array.from({ length: WORKERS }, (_, i) =>
    segment(browser, i, i * per, Math.min(total, (i + 1) * per))));
  await browser.close();
  const list = path.join(DIST, '.segs.txt');
  fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n'));
  const out = path.join(DIST, OUT);
  await run(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-i', wav, '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart', out]);
  for (const f of [...segs, list, wav]) fs.rmSync(f);
  console.log(`wrote ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
}

main().catch(e => { console.error(e); process.exit(1); });
