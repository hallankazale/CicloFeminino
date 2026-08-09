import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/domain/cycle-engine.js', import.meta.url), 'utf8');
const sandbox = { globalThis: {}, module: { exports: {} }, exports: {} };
vm.runInNewContext(source, sandbox);
const engine = sandbox.module.exports;

test('calcula corretamente datas futuras e passadas do ciclo', () => {
  const config = { lastPeriod: '2026-08-01', cycleLen: 28, periodLen: 5, logs: {} };
  const future = engine.calculateCycle(config, new Date(2026, 7, 15));
  assert.equal(future.doc, 15);
  assert.equal(future.cl, 28);

  const past = engine.calculateCycle(config, new Date(2026, 6, 31));
  assert.equal(past.doc, 28);
});

test('detecta início de menstruação por blocos de fluxo consecutivo', () => {
  const logs = {
    '2026-06-01': { flow: 'moderado' },
    '2026-06-02': { flow: 'leve' },
    '2026-06-28': { flow: 'intenso' },
    '2026-06-29': { flow: 'moderado' },
    '2026-07-26': { flow: 'leve' }
  };
  assert.deepEqual(engine.detectPeriodStarts(logs), ['2026-06-01', '2026-06-28', '2026-07-26']);
});

test('usa mediana dos ciclos observados em vez de um único intervalo', () => {
  const starts = ['2026-05-01', '2026-05-29', '2026-06-27', '2026-07-25'];
  assert.equal(engine.estimateCycleLength(starts, 30), 28);
});

test('rejeita datas inválidas e limita configurações fora da faixa', () => {
  assert.throws(() => engine.parseLocalDate('2026-02-30'));
  const result = engine.calculateCycle({ lastPeriod: '2026-08-01', cycleLen: 99, periodLen: 99, logs: {} }, new Date(2026, 7, 1));
  assert.equal(result.cl, 45);
  assert.equal(result.pl, 10);
});

test('aumenta confiança conforme há histórico menstrual registrado', () => {
  const logs = {
    '2026-05-01': { flow: 'leve' },
    '2026-05-29': { flow: 'leve' },
    '2026-06-26': { flow: 'moderado' },
    '2026-07-24': { flow: 'intenso' }
  };
  const result = engine.calculateCycle({ lastPeriod: '2026-05-01', cycleLen: 30, periodLen: 5, logs }, new Date(2026, 7, 8));
  assert.equal(result.confidence, 'alta');
  assert.equal(result.cl, 28);
});
