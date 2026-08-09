import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const auth = fs.readFileSync(new URL('../src/auth/supabase-auth.js', import.meta.url), 'utf8');
const workflow = fs.readFileSync(new URL('../.github/workflows/android-apk.yml', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('Luna usa projeto Supabase exclusivo', () => {
  assert.match(auth, /davruybzxyjsxitvibek\.supabase\.co/);
  assert.doesNotMatch(auth, /pgdpjhjnzcohdixqpbsx/);
});

test('autenticação cobre email senha cadastro recuperação e Google', () => {
  assert.match(auth, /signInWithPassword/);
  assert.match(auth, /auth\.signUp/);
  assert.match(auth, /resetPasswordForEmail/);
  assert.match(auth, /signInWithOAuth/);
  assert.match(auth, /provider:\s*'google'/);
});

test('OAuth retorna ao APK por deep link próprio do Luna', () => {
  assert.match(auth, /br\.com\.ciclofeminino\.luna:\/\/auth\/callback/);
  assert.match(workflow, /android:scheme="br\.com\.ciclofeminino\.luna"/);
  assert.match(workflow, /android:host="auth"/);
  assert.match(workflow, /android:pathPrefix="\/callback"/);
});

test('plugins nativos necessários estão fixados na série Capacitor 8', () => {
  assert.ok(pkg.dependencies['@capacitor/app']?.startsWith('8.'));
  assert.ok(pkg.dependencies['@capacitor/browser']?.startsWith('8.'));
  assert.ok(pkg.dependencies['@supabase/supabase-js']?.startsWith('2.'));
});
