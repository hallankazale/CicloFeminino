import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const source = new URL('../index.html', import.meta.url);
const webDir = new URL('../www/', import.meta.url);
const target = new URL('../www/index.html', import.meta.url);
const assetsDir = new URL('../assets/', import.meta.url);
const domainDir = new URL('../src/domain/', import.meta.url);

await rm(webDir, { recursive: true, force: true });
await mkdir(webDir, { recursive: true });
await mkdir(new URL('../www/assets/', import.meta.url), { recursive: true });
await mkdir(new URL('../www/src/domain/', import.meta.url), { recursive: true });

let html = await readFile(source, 'utf8');

const styleTag = '<link rel="stylesheet" href="assets/luna-v2.css">';
const engineTag = '<script src="src/domain/cycle-engine.js"></script>';
const upgradesTag = '<script src="assets/app-upgrades.js"></script>';

if (!html.includes(styleTag)) html = html.replace('</head>', `  ${styleTag}\n</head>`);
if (!html.includes(engineTag)) html = html.replace('</body>', `  ${engineTag}\n  ${upgradesTag}\n</body>`);

await writeFile(target, html, 'utf8');
await cp(assetsDir, new URL('../www/assets/', import.meta.url), { recursive: true });
await cp(domainDir, new URL('../www/src/domain/', import.meta.url), { recursive: true });

console.log('Luna v2 web bundle preparado com UI Android e cycle engine.');
