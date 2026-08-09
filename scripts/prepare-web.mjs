import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const source = new URL('../index.html', import.meta.url);
const webDir = new URL('../www/', import.meta.url);
const target = new URL('../www/index.html', import.meta.url);
const assetsDir = new URL('../assets/', import.meta.url);
const domainDir = new URL('../src/domain/', import.meta.url);
const nativeEntry = new URL('../src/native/notifications.js', import.meta.url);
const webAssets = new URL('../www/assets/', import.meta.url);

await rm(webDir, { recursive: true, force: true });
await mkdir(webDir, { recursive: true });
await mkdir(webAssets, { recursive: true });
await mkdir(new URL('../www/src/domain/', import.meta.url), { recursive: true });

let html = await readFile(source, 'utf8');

const styleTag = '<link rel="stylesheet" href="assets/luna-v2.css">';
const authStyleTag = '<link rel="stylesheet" href="assets/auth-shell.css">';
const engineTag = '<script src="src/domain/cycle-engine.js"></script>';
const authTag = '<script src="assets/auth-shell.js"></script>';
const upgradesTag = '<script src="assets/app-upgrades.js"></script>';
const notificationsTag = '<script src="assets/native-notifications.js"></script>';

if (!html.includes(styleTag)) html = html.replace('</head>', `  ${styleTag}\n  ${authStyleTag}\n</head>`);
else if (!html.includes(authStyleTag)) html = html.replace(styleTag, `${styleTag}\n  ${authStyleTag}`);

if (!html.includes(engineTag)) {
  html = html.replace(
    '</body>',
    `  ${engineTag}\n  ${authTag}\n  ${upgradesTag}\n  ${notificationsTag}\n</body>`
  );
} else if (!html.includes(authTag)) {
  html = html.replace(engineTag, `${engineTag}\n  ${authTag}`);
}

await writeFile(target, html, 'utf8');
await cp(assetsDir, webAssets, { recursive: true });
await cp(domainDir, new URL('../www/src/domain/', import.meta.url), { recursive: true });

await build({
  entryPoints: [nativeEntry.pathname],
  outfile: new URL('../www/assets/native-notifications.js', import.meta.url).pathname,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome100'],
  minify: true,
  sourcemap: false,
  logLevel: 'info'
});

console.log('Luna preparado com UI Android, splash, autenticação, cycle engine e notificações nativas.');
