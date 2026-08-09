import { cp, mkdir, rm } from 'node:fs/promises';

const source = new URL('../index.html', import.meta.url);
const webDir = new URL('../www/', import.meta.url);
const target = new URL('../www/index.html', import.meta.url);

await rm(webDir, { recursive: true, force: true });
await mkdir(webDir, { recursive: true });
await cp(source, target);

console.log('Web bundle preparado em www/index.html');
