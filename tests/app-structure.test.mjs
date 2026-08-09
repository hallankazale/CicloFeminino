import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('app possui as views essenciais', () => {
  for (const id of ['view-inicio', 'view-calendario', 'view-historico', 'view-insights', 'view-config']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test('app possui persistência e configuração inicial do ciclo', () => {
  assert.match(html, /luna_v2/);
  assert.match(html, /lastPeriod/);
  assert.match(html, /cycleLen/);
  assert.match(html, /periodLen/);
});

test('app possui suporte a registro diário', () => {
  assert.match(html, /function saveLog\(/);
  assert.match(html, /symptoms/);
  assert.match(html, /mood/);
  assert.match(html, /flow/);
});
