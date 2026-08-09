import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const authJs = fs.readFileSync(new URL('../assets/auth-shell.js', import.meta.url), 'utf8');
const authCss = fs.readFileSync(new URL('../assets/auth-shell.css', import.meta.url), 'utf8');
const prepare = fs.readFileSync(new URL('../scripts/prepare-web.mjs', import.meta.url), 'utf8');

test('possui splash screen dedicada do Luna', () => {
  assert.match(authJs, /luna-splash/);
  assert.match(authJs, /Seu ciclo, do seu jeito/);
  assert.match(authCss, /\.luna-splash/);
});

test('possui login, cadastro, Google e recuperação de senha', () => {
  assert.match(authJs, /Continuar com Google/);
  assert.match(authJs, /Criar minha conta/);
  assert.match(authJs, /Esqueci minha senha/);
  assert.match(authJs, /signInWithGoogle/);
  assert.match(authJs, /signUp/);
  assert.match(authJs, /resetPassword/);
});

test('modo local mantém o APK utilizável sem misturar backend de outro projeto', () => {
  assert.match(authJs, /luna_local_session/);
  assert.match(authJs, /Continuar neste aparelho/);
});

test('fluxo Limpar apaga somente registros e atualiza as telas', () => {
  assert.match(authJs, /appData\.logs = \{\}/);
  assert.match(authJs, /renderInicio/);
  assert.match(authJs, /renderCalendar/);
  assert.match(authJs, /renderHistorico/);
  assert.match(authJs, /renderInsights/);
  assert.match(authJs, /clearLogsSafe/);
});

test('bundle inclui os assets de autenticação', () => {
  assert.match(prepare, /auth-shell\.css/);
  assert.match(prepare, /auth-shell\.js/);
});
