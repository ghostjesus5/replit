// Frame-accurate export of index.html to MP4 (H.264 + AAC), in both ad formats.
//   node render.mjs                     both cuts to dist/
//   node render.mjs --fmt v             9:16 only (h for 16:9)
//   node render.mjs --stills 2.9,14.8   PNG stills of both formats to dist/stills/
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
const FPS = 30, WORKERS = 4;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FORMATS = {
  h: { w: 1920, h: 1080, out: 'goalzero-skylight-30s-16x9.mp4' },
  v: { w: 1080, h: 1920, out: 'goalzero-skylight-30s-9x16.mp4' },
};
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };

async function openPage(browser, f) {
  const { w, h } = FORMATS[f];
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href + '#capture-' + f);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
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

async function segment(browser, f, idx, f0, f1) {
  const page = await openPage(browser, f);
  const out = path.join(DIST, `.seg-${f}${idx}.mp4`);
  await run(['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), out],
  async stdin => {
    for (let n = f0; n < f1; n++) {
      const url = await page.evaluate(t => window.__frame(t), n / FPS);
      const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
      if (!stdin.write(buf)) await new Promise(r => stdin.once('drain', r));
      if ((n - f0) % 150 === 0) console.log(`${f} worker ${idx}: frame ${n}/${f1}`);
    }
    stdin.end();
  });
  await page.close();
  return out;
}

async function main() {
  fs.mkdirSync(DIST, { recursive: true });
  const browser = await chromium.launch();
  const fmts = arg('--fmt') ? [arg('--fmt')] : ['h', 'v'];

  const stills = arg('--stills');
  if (stills) {
    fs.mkdirSync(path.join(DIST, 'stills'), { recursive: true });
    for (const f of fmts) {
      const page = await openPage(browser, f);
      for (const t of stills.split(',').map(Number)) {
        const url = await page.evaluate(t => { window.__seek(t); return document.getElementById('cv').toDataURL('image/png'); }, t);
        fs.writeFileSync(path.join(DIST, 'stills', `${f}-t${t.toFixed(2)}.png`), Buffer.from(url.split(',')[1], 'base64'));
      }
      await page.close();
    }
    await browser.close();
    return;
  }

  const page = await openPage(browser, 'h');
  const dur = await page.evaluate(() => window.__DUR);
  const { b64, peak } = await page.evaluate(() => window.__renderAudio());
  const wav = path.join(DIST, '.audio.wav');
  fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
  console.log(`audio rendered, peak ${peak.toFixed(3)}`);
  await page.close();

  for (const f of fmts) {
    const total = Math.round(dur * FPS), per = Math.ceil(total / WORKERS);
    const segs = await Promise.all(Array.from({ length: WORKERS }, (_, i) =>
      segment(browser, f, i, i * per, Math.min(total, (i + 1) * per))));
    const list = path.join(DIST, `.segs-${f}.txt`);
    fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n'));
    const out = path.join(DIST, FORMATS[f].out);
    await run(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-i', wav, '-c:v', 'copy',
      '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out]);
    for (const s of [...segs, list]) fs.rmSync(s);
    console.log(`wrote ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
  }
  await browser.close();
  fs.rmSync(wav);
}

main().catch(e => { console.error(e); process.exit(1); });
