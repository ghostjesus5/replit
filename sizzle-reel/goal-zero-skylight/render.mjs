// Frame-accurate export of dist/index.html to MP4 (H.264 + AAC).
//   node render.mjs                     full render to dist/goal-zero-skylight-sizzle.mp4
//   node render.mjs --stills 3,16.4     PNG stills to dist/stills/
//   node render.mjs --range 16,20       partial render (no audio) to dist/range.mp4
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const URL = pathToFileURL(path.join(DIST, 'index.html')).href + '#capture';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const WORKERS = Number(process.env.WORKERS || 4);
const ARGS = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--autoplay-policy=no-user-gesture-required'];

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('pageerror:', e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('console:', m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
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

async function segment(browser, idx, f0, f1, fps, out) {
  const page = await openPage(browser);
  const t0 = Date.now();
  await run(['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-tune', 'grain', '-pix_fmt', 'yuv420p', '-r', String(fps), out],
  async stdin => {
    for (let f = f0; f < f1; f++) {
      await page.evaluate(t => window.__seek(t), f / fps);
      const buf = await page.screenshot({ type: 'jpeg', quality: 96 });
      if (!stdin.write(buf)) await new Promise(r => stdin.once('drain', r));
      if ((f - f0) % 60 === 0) console.log(`worker ${idx}: frame ${f} (${f - f0}/${f1 - f0}) ${((Date.now() - t0) / Math.max(1, f - f0)).toFixed(0)} ms/frame`);
    }
    stdin.end();
  });
  await page.close();
  return out;
}

async function main() {
  fs.mkdirSync(DIST, { recursive: true });
  const browser = await chromium.launch({ args: ARGS });
  const si = process.argv.indexOf('--stills');
  if (si > 0) {
    const page = await openPage(browser);
    fs.mkdirSync(path.join(DIST, 'stills'), { recursive: true });
    for (const t of process.argv[si + 1].split(',').map(Number)) {
      const t0 = Date.now();
      await page.evaluate(t => window.__seek(t), t);
      await page.screenshot({ path: path.join(DIST, 'stills', `t${t.toFixed(2)}.png`) });
      console.log(`still ${t}s ${Date.now() - t0} ms`);
    }
    await browser.close();
    return;
  }
  const page = await openPage(browser);
  const dur = await page.evaluate(() => window.__DUR), fps = await page.evaluate(() => window.__FPS);
  const ri = process.argv.indexOf('--range');
  let F0 = 0, F1 = Math.round(dur * fps), wav = null;
  if (ri > 0) { const [a, b] = process.argv[ri + 1].split(',').map(Number); F0 = Math.round(a * fps); F1 = Math.round(b * fps); }
  else {
    const { b64, peak } = await page.evaluate(() => window.__renderAudio());
    wav = path.join(DIST, '.audio.wav'); fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
    console.log(`audio rendered, raw peak ${peak.toFixed(3)}`);
  }
  await page.close();

  const total = F1 - F0, per = Math.ceil(total / WORKERS);
  const segs = await Promise.all(Array.from({ length: WORKERS }, (_, i) =>
    segment(browser, i, F0 + i * per, Math.min(F1, F0 + (i + 1) * per), fps, path.join(DIST, `.seg${i}.mp4`))));
  await browser.close();

  const list = path.join(DIST, '.segs.txt');
  fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n'));
  const out = path.join(DIST, ri > 0 ? 'range.mp4' : 'goal-zero-skylight-sizzle.mp4');
  const audioArgs = wav ? ['-i', wav, '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '320k', '-shortest'] : [];
  await run(['-y', '-f', 'concat', '-safe', '0', '-i', list, ...audioArgs, '-c:v', 'copy', '-movflags', '+faststart', out]);
  for (const f of [...segs, list, ...(wav ? [wav] : [])]) fs.rmSync(f);
  console.log(`wrote ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
}

main().catch(e => { console.error(e); process.exit(1); });
