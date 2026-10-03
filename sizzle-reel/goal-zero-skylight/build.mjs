// Bundles src/ into one self-contained dist/index.html (three.js, fonts and score inlined).
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const src = p => path.join(ROOT, 'src', p);
const b64 = p => fs.readFileSync(src(p)).toString('base64');

const fonts = `
@font-face{font-family:'Archivo';src:url(data:font/woff2;base64,${b64('fonts/archivo-latin.woff2')}) format('woff2');font-weight:100 900;font-stretch:62% 125%}
@font-face{font-family:'JetBrains Mono';src:url(data:font/woff2;base64,${b64('fonts/jbmono-0.woff2')}) format('woff2');font-weight:100 800}`;

const out = await build({ entryPoints: [src('main.js')], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', legalComments: 'none' });
const js = out.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const html = fs.readFileSync(src('index.html'), 'utf8')
  .replace('/*@FONTS*/', fonts)
  .replace('<!--@SCRIPT-->', () => `<script>${js}</script>`);
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist', 'index.html'), html);
console.log(`dist/index.html ${(html.length / 1e6).toFixed(2)} MB`);
