import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const STORAGE_KEY = 'luna_notifications';
const CHANNEL_ID = 'luna-cycle-reminders';
const BASE_ID = 12000;
const CYCLES_AHEAD = 4;
const DEFAULT_HOUR = 9;

function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

function enabledPreference() {
  return localStorage.getItem(STORAGE_KEY) === 'on';
}

function atHour(date, hour = DEFAULT_HOUR) {
  const result = new Date(date);
  result.setHours(hour, 0, 0, 0);
  return result;
}

function safeFuture(date, now = new Date()) {
  return date.getTime() > now.getTime() + 60_000;
}

async function ensureChannel() {
  if (!isNativeAndroid()) return;
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'Lembretes do ciclo',
    description: 'Menstruação, janela fértil e ovulação estimadas pelo Luna',
    importance: 4,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: '#F5A0BD'
  });
}

async function permissionStatus() {
  if (!isNativeAndroid()) {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  }
  const result = await LocalNotifications.checkPermissions();
  return result.display;
}

async function requestNativePermission() {
  if (!isNativeAndroid()) {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.requestPermission();
  }
  const current = await LocalNotifications.checkPermissions();
  if (current.display === 'granted') return 'granted';
  const requested = await LocalNotifications.requestPermissions();
  return requested.display;
}

async function cancelLunaNotifications() {
  if (!isNativeAndroid()) return;
  const pending = await LocalNotifications.getPending();
  const ours = pending.notifications.filter(item => item.id >= BASE_ID && item.id < BASE_ID + 500);
  if (ours.length) {
    await LocalNotifications.cancel({ notifications: ours.map(item => ({ id: item.id })) });
  }
}

function cyclePlan() {
  if (!appData?.lastPeriod || typeof getCycle !== 'function' || typeof addDays !== 'function') return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const first = getCycle(today);
  const notifications = [];

  for (let cycleIndex = 0; cycleIndex < CYCLES_AHEAD; cycleIndex += 1) {
    const cycleStart = addDays(first.cs, cycleIndex * first.cl);
    const nextPeriod = addDays(cycleStart, first.cl);
    const ovulationDay = Math.max(first.pl + 2, first.cl - 14);
    const fertileStartDay = Math.max(1, ovulationDay - 5);
    const fertileStart = addDays(cycleStart, fertileStartDay - 1);
    const ovulation = addDays(cycleStart, ovulationDay - 1);

    const events = [
      {
        offset: 1,
        when: atHour(addDays(nextPeriod, -2)),
        title: 'Luna · Menstruação em breve 🩸',
        body: 'Sua próxima menstruação está estimada para daqui a 2 dias.'
      },
      {
        offset: 2,
        when: atHour(nextPeriod),
        title: 'Luna · Menstruação prevista 🩸',
        body: 'Sua menstruação está prevista para hoje. A previsão é uma estimativa baseada no seu ciclo.'
      },
      {
        offset: 3,
        when: atHour(fertileStart),
        title: 'Luna · Janela fértil 🌿',
        body: 'Sua janela fértil estimada começa hoje. Não use esta previsão como método contraceptivo.'
      },
      {
        offset: 4,
        when: atHour(ovulation),
        title: 'Luna · Ovulação estimada ✨',
        body: 'Hoje é o dia estimado de ovulação no seu ciclo.'
      }
    ];

    for (const event of events) {
      if (!safeFuture(event.when)) continue;
      notifications.push({
        id: BASE_ID + cycleIndex * 10 + event.offset,
        title: event.title,
        body: event.body,
        channelId: CHANNEL_ID,
        schedule: { at: event.when, allowWhileIdle: true },
        autoCancel: true,
        extra: { source: 'luna', kind: 'cycle-reminder' }
      });
    }
  }

  return notifications;
}

async function scheduleCycleNotifications({ test = false } = {}) {
  if (!enabledPreference() || !isNativeAndroid()) return 0;
  const permission = await permissionStatus();
  if (permission !== 'granted') return 0;

  await ensureChannel();
  await cancelLunaNotifications();

  const plan = cyclePlan();
  if (plan.length) await LocalNotifications.schedule({ notifications: plan });

  if (test) {
    await LocalNotifications.schedule({
      notifications: [{
        id: BASE_ID + 400,
        title: 'Luna ativado 🌙',
        body: 'As notificações nativas do Luna estão funcionando neste celular.',
        channelId: CHANNEL_ID,
        schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
        autoCancel: true,
        extra: { source: 'luna', kind: 'test' }
      }]
    });
  }

  return plan.length;
}

async function pendingCount() {
  if (!isNativeAndroid()) return 0;
  const result = await LocalNotifications.getPending();
  return result.notifications.filter(item => item.id >= BASE_ID && item.id < BASE_ID + 500).length;
}

async function enableNotificationsNative() {
  try {
    const permission = await requestNativePermission();
    if (permission !== 'granted') {
      localStorage.setItem(STORAGE_KEY, 'off');
      showToast('Permissão de notificações não concedida.');
      await refreshNotificationUINative();
      return;
    }

    localStorage.setItem(STORAGE_KEY, 'on');
    const count = await scheduleCycleNotifications({ test: true });
    showToast(`Notificações ativadas · ${count} lembretes agendados 🔔`);
    await refreshNotificationUINative();
  } catch (error) {
    console.error('[Luna notifications] enable failed', error);
    localStorage.setItem(STORAGE_KEY, 'off');
    showToast('Não foi possível ativar as notificações.');
    await refreshNotificationUINative();
  }
}

async function disableNotificationsNative() {
  try {
    localStorage.setItem(STORAGE_KEY, 'off');
    await cancelLunaNotifications();
    showToast('Notificações desativadas.');
  } catch (error) {
    console.error('[Luna notifications] disable failed', error);
  }
  await refreshNotificationUINative();
}

async function refreshNotificationUINative() {
  const btn = document.getElementById('notify-toggle');
  const status = document.getElementById('notify-status');
  const homeCard = document.getElementById('home-notify-card');

  if (!isNativeAndroid()) return;

  let permission = 'prompt';
  let count = 0;
  try {
    permission = await permissionStatus();
    if (permission === 'granted' && enabledPreference()) count = await pendingCount();
  } catch (error) {
    console.error('[Luna notifications] status failed', error);
  }

  const on = enabledPreference() && permission === 'granted';
  if (btn) {
    btn.textContent = on ? 'Desativar' : 'Ativar';
    btn.style.color = on ? 'var(--mint)' : 'var(--text2)';
  }
  if (status) {
    status.textContent = permission === 'denied'
      ? 'Permissão bloqueada no Android. Ative notificações nas configurações do aplicativo.'
      : on
        ? `Ativado · ${count} lembrete(s) nativo(s) agendado(s) no Android.`
        : 'Desativado. Toque em ativar para receber lembretes mesmo com o app fechado.';
  }
  if (homeCard) homeCard.style.display = on ? 'none' : 'block';
}

async function rescheduleIfEnabled() {
  if (!isNativeAndroid() || !enabledPreference()) return;
  try {
    await scheduleCycleNotifications();
    await refreshNotificationUINative();
  } catch (error) {
    console.error('[Luna notifications] reschedule failed', error);
  }
}

if (isNativeAndroid()) {
  window.enableNotifications = enableNotificationsNative;
  window.disableNotifications = disableNotificationsNative;
  window.toggleNotifications = () => enabledPreference() ? disableNotificationsNative() : enableNotificationsNative();
  window.refreshNotificationUI = refreshNotificationUINative;
  window.sendCycleNotifications = () => rescheduleIfEnabled();

  const originalSaveSettings = window.saveSettings;
  if (typeof originalSaveSettings === 'function') {
    window.saveSettings = function saveSettingsWithNotifications(...args) {
      const result = originalSaveSettings.apply(this, args);
      void rescheduleIfEnabled();
      return result;
    };
  }

  const originalSaveLog = window.saveLog;
  if (typeof originalSaveLog === 'function') {
    window.saveLog = function saveLogWithNotifications(...args) {
      const result = originalSaveLog.apply(this, args);
      void rescheduleIfEnabled();
      return result;
    };
  }

  window.addEventListener('DOMContentLoaded', () => {
    void refreshNotificationUINative();
    void rescheduleIfEnabled();
  });
}

export {
  cancelLunaNotifications,
  cyclePlan,
  enabledPreference,
  pendingCount,
  requestNativePermission,
  scheduleCycleNotifications
};
