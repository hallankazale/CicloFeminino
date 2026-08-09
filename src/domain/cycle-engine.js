(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LunaCycleEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DAY_MS = 86400000;

  function clamp(value, min, max, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  }

  function parseLocalDate(value) {
    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    if (typeof value !== 'string') throw new TypeError('Data inválida');
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) throw new TypeError('Use datas no formato YYYY-MM-DD');
    const [, y, m, d] = match.map(Number);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      throw new RangeError('Data inexistente');
    }
    return date;
  }

  function toKey(date) {
    const d = parseLocalDate(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function dayNumber(date) {
    const d = parseLocalDate(date);
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
  }

  function daysBetween(a, b) {
    return dayNumber(b) - dayNumber(a);
  }

  function addDays(date, amount) {
    const d = parseLocalDate(date);
    d.setDate(d.getDate() + amount);
    return d;
  }

  function median(numbers) {
    if (!numbers.length) return null;
    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  }

  function hasBleeding(log) {
    return Boolean(log && log.flow && log.flow !== 'nenhum');
  }

  /**
   * Detecta o primeiro dia de cada sequência menstrual registrada.
   * Registros isolados são aceitos; dias consecutivos pertencem ao mesmo período.
   */
  function detectPeriodStarts(logs = {}) {
    const bleedingDays = Object.entries(logs)
      .filter(([, log]) => hasBleeding(log))
      .map(([key]) => key)
      .filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key))
      .sort();

    const starts = [];
    let previous = null;
    for (const key of bleedingDays) {
      const current = parseLocalDate(key);
      if (!previous || daysBetween(previous, current) > 1) starts.push(key);
      previous = current;
    }
    return starts;
  }

  function estimateCycleLength(periodStarts, fallbackCycleLength) {
    if (periodStarts.length < 2) return clamp(fallbackCycleLength, 21, 45, 28);
    const intervals = [];
    for (let i = 1; i < periodStarts.length; i += 1) {
      const diff = daysBetween(parseLocalDate(periodStarts[i - 1]), parseLocalDate(periodStarts[i]));
      if (diff >= 15 && diff <= 60) intervals.push(diff);
    }
    const estimated = median(intervals);
    return clamp(estimated, 21, 45, clamp(fallbackCycleLength, 21, 45, 28));
  }

  function resolveAnchor(config, periodStarts) {
    const configured = parseLocalDate(config.lastPeriod);
    if (!periodStarts.length) return configured;
    const latestObserved = parseLocalDate(periodStarts[periodStarts.length - 1]);
    return latestObserved > configured ? latestObserved : configured;
  }

  function confidence(periodStarts) {
    if (periodStarts.length >= 4) return 'alta';
    if (periodStarts.length >= 2) return 'media';
    return 'baixa';
  }

  /**
   * Calcula a posição do dia dentro do ciclo para datas no passado ou futuro.
   * A previsão é estimativa e não deve ser usada como método contraceptivo.
   */
  function calculateCycle(config, refDate = new Date()) {
    if (!config || !config.lastPeriod) throw new TypeError('Última menstruação é obrigatória');

    const starts = detectPeriodStarts(config.logs || {});
    const cycleLength = estimateCycleLength(starts, config.cycleLen);
    const periodLength = clamp(config.periodLen, 2, 10, 5);
    const anchor = resolveAnchor(config, starts);
    const ref = parseLocalDate(refDate);
    const delta = daysBetween(anchor, ref);
    const cycleOffset = Math.floor(delta / cycleLength);
    const cycleStart = addDays(anchor, cycleOffset * cycleLength);
    const dayOfCycle = daysBetween(cycleStart, ref) + 1;

    const ovulationDay = Math.max(periodLength + 2, cycleLength - 14);
    const fertileStartDay = Math.max(1, ovulationDay - 5);
    const fertileEndDay = Math.min(cycleLength, ovulationDay + 1);

    let phase = 'lutea';
    if (dayOfCycle <= periodLength) phase = 'menstrual';
    else if (dayOfCycle < fertileStartDay) phase = 'folicula';
    else if (dayOfCycle <= fertileEndDay) phase = 'ovulacao';

    return {
      doc: dayOfCycle,
      phase,
      isFertile: dayOfCycle >= fertileStartDay && dayOfCycle <= fertileEndDay,
      nextPeriod: addDays(cycleStart, cycleLength),
      ovulationDate: addDays(cycleStart, ovulationDay - 1),
      fertileStartDate: addDays(cycleStart, fertileStartDay - 1),
      fertileEndDate: addDays(cycleStart, fertileEndDay - 1),
      cs: cycleStart,
      cl: cycleLength,
      pl: periodLength,
      confidence: confidence(starts),
      observedCycles: Math.max(0, starts.length - 1),
      periodStarts: starts
    };
  }

  return {
    addDays,
    calculateCycle,
    daysBetween,
    detectPeriodStarts,
    estimateCycleLength,
    parseLocalDate,
    toKey
  };
});
