// Frame-accurate export of index.html to MP4 (H.264 + AAC).
//   node render.mjs                 full render to dist/all-in-sizzle-reel.mp4
//   node render.mjs --stills 3,10.6 PNG stills to dist/stills/
// Needs Playwright (global install) and an ffmpeg with libx264 (FFMPEG env var, or imageio-ffmpeg's binary).
import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const URL = pathToFileURL(path.join(ROOT, 'index.html')).href + '#capture';
const FPS = 30, WORKERS = 4;
const FFMPEG = process.env.FFMPEG ||
  execSync(`python3 -c "import imageio_ffmpeg as i;print(i.get_ffmpeg_exe())"`).toString().trim();

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(URL);
  await page.evaluate(() => document.fonts.ready);
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
  await run(['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS), out],
  async stdin => {
    for (let f = f0; f < f1; f++) {
      await page.evaluate(t => window.__seek(t), f / FPS);
      const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
      if (!stdin.write(buf)) await new Promise(r => stdin.once('drain', r));
      if ((f - f0) % 150 === 0) console.log(`worker ${idx}: frame ${f}/${f1}`);
    }
    stdin.end();
  });
  await page.close();
  return out;
}

async function main() {
  fs.mkdirSync(DIST, { recursive: true });
  const browser = await chromium.launch();
  const si = process.argv.indexOf('--stills');
  if (si > 0) {
    const page = await openPage(browser);
    fs.mkdirSync(path.join(DIST, 'stills'), { recursive: true });
    for (const t of process.argv[si + 1].split(',').map(Number)) {
      await page.evaluate(t => window.__seek(t), t);
      await page.screenshot({ path: path.join(DIST, 'stills', `t${t.toFixed(2)}.png`) });
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
  const out = path.join(DIST, 'all-in-sizzle-reel.mp4');
  await run(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-i', wav, '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out]);
  for (const f of [...segs, list, wav]) fs.rmSync(f);
  console.log(`wrote ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
}

main().catch(e => { console.error(e); process.exit(1); });
