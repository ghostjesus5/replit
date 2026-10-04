// Export the film's geometry and per-frame state for the Cycles build.
//   node cycles/export.mjs     -> cycles/data/scene.glb and cycles/data/frames.json (24 fps)
// Needs Playwright (global install). Run `python3 build.py` first so index.html carries the export hooks.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'data');
const FPS = 24, DUR = 60;
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('pageerror', e => console.error('page error:', e.message));
await p.goto(pathToFileURL(path.join(HERE, '..', 'index.html')).href + '#export');
await p.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
const glb = await p.evaluate(() => window.__exportGLB());
fs.writeFileSync(path.join(OUT, 'scene.glb'), Buffer.from(glb, 'base64'));
console.log('scene.glb', (fs.statSync(path.join(OUT, 'scene.glb')).size / 1e6).toFixed(2), 'MB');
const parts = [];
for (let f0 = 0; f0 < FPS * DUR; f0 += 240)
  parts.push(JSON.parse(await p.evaluate(([a, z]) => window.__exportFrames(24, a, z), [f0, Math.min(FPS * DUR, f0 + 240)])));
const all = { fps: FPS, names: parts[0].names, frames: parts.flatMap(x => x.frames) };
fs.writeFileSync(path.join(OUT, 'frames.json'), JSON.stringify(all));
console.log('frames.json', all.frames.length, 'frames,', all.names.length, 'tracked nodes');
await b.close();
