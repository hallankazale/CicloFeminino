import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const nativeSource = fs.readFileSync(new URL('../src/native/notifications.js', import.meta.url), 'utf8');
const prepareSource = fs.readFileSync(new URL('../scripts/prepare-web.mjs', import.meta.url), 'utf8');
const capacitorConfig = JSON.parse(fs.readFileSync(new URL('../capacitor.config.json', import.meta.url), 'utf8'));

test('usa o plugin nativo de notificações do Capacitor', () => {
  assert.match(nativeSource, /@capacitor\/local-notifications/);
  assert.match(nativeSource, /LocalNotifications\.requestPermissions/);
  assert.match(nativeSource, /LocalNotifications\.schedule/);
  assert.match(nativeSource, /LocalNotifications\.getPending/);
  assert.match(nativeSource, /LocalNotifications\.cancel/);
});

test('agenda lembretes de ciclo mesmo com o APK fechado', () => {
  assert.match(nativeSource, /CYCLES_AHEAD = 4/);
  assert.match(nativeSource, /allowWhileIdle: true/);
  assert.match(nativeSource, /Menstruação em breve/);
  assert.match(nativeSource, /Janela fértil/);
  assert.match(nativeSource, /Ovulação estimada/);
});

test('reagenda após alteração de configurações ou registro', () => {
  assert.match(nativeSource, /originalSaveSettings/);
  assert.match(nativeSource, /originalSaveLog/);
  assert.match(nativeSource, /rescheduleIfEnabled/);
});

test('bundle nativo é injetado no pacote web do APK', () => {
  assert.match(prepareSource, /esbuild/);
  assert.match(prepareSource, /native-notifications\.js/);
});

test('ícone pequeno de notificação está configurado', () => {
  assert.equal(capacitorConfig.plugins.LocalNotifications.smallIcon, 'luna_notification');
  assert.equal(capacitorConfig.plugins.LocalNotifications.iconColor, '#F5A0BD');
});
