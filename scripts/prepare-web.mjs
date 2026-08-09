import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const source = new URL('../index.html', import.meta.url);
const webDir = new URL('../www/', import.meta.url);
const target = new URL('../www/index.html', import.meta.url);
const assetsDir = new URL('../assets/', import.meta.url);
const domainDir = new URL('../src/domain/', import.meta.url);
const nativeEntry = new URL('../src/native/notifications.js', import.meta.url);
const authEntry = new URL('../src/auth/supabase-auth.js', import.meta.url);
const webAssets = new URL('../www/assets/', import.meta.url);

await rm(webDir, { recursive: true, force: true });
await mkdir(webDir, { recursive: true });
await mkdir(webAssets, { recursive: true });
await mkdir(new URL('../www/src/domain/', import.meta.url), { recursive: true });

let html = await readFile(source, 'utf8');

const styleTag = '<link rel="stylesheet" href="assets/luna-v2.css">';
const authStyleTag = '<link rel="stylesheet" href="assets/auth-shell.css">';
const engineTag = '<script src="src/domain/cycle-engine.js"></script>';
const authAdapterTag = '<script src="assets/supabase-auth.js"></script>';
const authTag = '<script src="assets/auth-shell.js"></script>';
const upgradesTag = '<script src="assets/app-upgrades.js"></script>';
const notificationsTag = '<script src="assets/native-notifications.js"></script>';

if (!html.includes(styleTag)) html = html.replace('</head>', `  ${styleTag}\n  ${authStyleTag}\n</head>`);
else if (!html.includes(authStyleTag)) html = html.replace(styleTag, `${styleTag}\n  ${authStyleTag}`);

if (!html.includes(engineTag)) {
  html = html.replace(
    '</body>',
    `  ${engineTag}\n  ${authAdapterTag}\n  ${authTag}\n  ${upgradesTag}\n  ${notificationsTag}\n</body>`
  );
} else {
  if (!html.includes(authAdapterTag)) html = html.replace(engineTag, `${engineTag}\n  ${authAdapterTag}`);
  if (!html.includes(authTag)) html = html.replace(authAdapterTag, `${authAdapterTag}\n  ${authTag}`);
}

await writeFile(target, html, 'utf8');
await cp(assetsDir, webAssets, { recursive: true });
await cp(domainDir, new URL('../www/src/domain/', import.meta.url), { recursive: true });

await Promise.all([
  build({
    entryPoints: [nativeEntry.pathname],
    outfile: new URL('../www/assets/native-notifications.js', import.meta.url).pathname,
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome100'],
    minify: true,
    sourcemap: false,
    logLevel: 'info'
  }),
  build({
    entryPoints: [authEntry.pathname],
    outfile: new URL('../www/assets/supabase-auth.js', import.meta.url).pathname,
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome100'],
    minify: true,
    sourcemap: false,
    logLevel: 'info'
  })
]);

console.log('Luna preparado com UI Android, Supabase Auth, splash, cycle engine e notificações nativas.');
