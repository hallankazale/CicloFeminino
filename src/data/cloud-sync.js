/* Luna cloud sync: isolated per authenticated user through Supabase RLS. */
(function () {
  'use strict';

  let syncTimer = null;
  let syncing = false;

  function adapter() {
    return window.LUNA_AUTH_ADAPTER;
  }

  async function session() {
    const auth = adapter();
    if (!auth?.getSession) return null;
    try { return await auth.getSession(); } catch (_) { return null; }
  }

  function currentData() {
    try { return typeof appData !== 'undefined' ? appData : null; } catch (_) { return null; }
  }

  function normalizeLogRow(row) {
    return {
      flow: row.flow ?? null,
      mood: Array.isArray(row.mood) ? row.mood : [],
      symptoms: Array.isArray(row.symptoms) ? row.symptoms : [],
      sex: row.sex ?? null,
      cervical: row.cervical ?? null,
      temp: row.temperature == null ? null : String(row.temperature),
      notes: row.notes ?? null,
      ts: row.updated_at ? Date.parse(row.updated_at) : Date.now()
    };
  }

  async function pushLocalData(userId) {
    const auth = adapter();
    const supabase = auth?.supabase;
    const data = currentData();
    if (!supabase || !data || !userId) return;

    const name = String(data.name || '').trim() || null;
    const lastPeriod = data.lastPeriod || null;

    const profileResult = await supabase.from('luna_profiles').upsert({
      user_id: userId,
      display_name: name
    }, { onConflict: 'user_id' });
    if (profileResult.error) throw profileResult.error;

    const settingsResult = await supabase.from('luna_cycle_settings').upsert({
      user_id: userId,
      last_period: lastPeriod,
      cycle_length: Number(data.cycleLen) || 28,
      period_length: Number(data.periodLen) || 5,
      notifications_enabled: localStorage.getItem('luna_notifications') === 'on'
    }, { onConflict: 'user_id' });
    if (settingsResult.error) throw settingsResult.error;

    const rows = Object.entries(data.logs || {}).map(([logDate, log]) => ({
      user_id: userId,
      log_date: logDate,
      flow: log.flow || null,
      mood: Array.isArray(log.mood) ? log.mood : [],
      symptoms: Array.isArray(log.symptoms) ? log.symptoms : [],
      sex: log.sex || null,
      cervical: log.cervical || null,
      temperature: log.temp ? Number(log.temp) : null,
      notes: log.notes || null
    }));

    if (rows.length) {
      const logsResult = await supabase.from('luna_daily_logs').upsert(rows, { onConflict: 'user_id,log_date' });
      if (logsResult.error) throw logsResult.error;
    }
  }

  async function pullCloudData(userId) {
    const supabase = adapter()?.supabase;
    if (!supabase || !userId) return false;

    const [{ data: profile, error: profileError }, { data: settings, error: settingsError }, { data: logs, error: logsError }] = await Promise.all([
      supabase.from('luna_profiles').select('display_name').eq('user_id', userId).maybeSingle(),
      supabase.from('luna_cycle_settings').select('last_period,cycle_length,period_length,notifications_enabled').eq('user_id', userId).maybeSingle(),
      supabase.from('luna_daily_logs').select('log_date,flow,mood,symptoms,sex,cervical,temperature,notes,updated_at').eq('user_id', userId).order('log_date')
    ]);

    if (profileError) throw profileError;
    if (settingsError) throw settingsError;
    if (logsError) throw logsError;
    if (!settings?.last_period) return false;

    const cloudLogs = {};
    for (const row of logs || []) cloudLogs[row.log_date] = normalizeLogRow(row);

    appData = {
      name: profile?.display_name || '',
      lastPeriod: settings.last_period,
      cycleLen: Number(settings.cycle_length) || 28,
      periodLen: Number(settings.period_length) || 5,
      logs: cloudLogs
    };

    localStorage.setItem('luna_notifications', settings.notifications_enabled ? 'on' : 'off');
    localStorage.setItem('luna_v2', JSON.stringify(appData));

    try {
      if (typeof updateHeaderName === 'function') updateHeaderName();
      if (typeof renderInicio === 'function') renderInicio();
      if (typeof renderCalendar === 'function') renderCalendar();
      if (typeof renderHistorico === 'function') renderHistorico();
      if (typeof renderInsights === 'function') renderInsights();
      if (window.LunaNotifications?.reschedule && settings.notifications_enabled) {
        await window.LunaNotifications.reschedule(appData);
      }
    } catch (_) {}
    return true;
  }

  async function initialSync() {
    if (syncing) return;
    const activeSession = await session();
    if (!activeSession?.user?.id) return;
    syncing = true;
    try {
      const hasCloudData = await pullCloudData(activeSession.user.id);
      if (!hasCloudData) await pushLocalData(activeSession.user.id);
      localStorage.setItem('luna_cloud_sync', 'on');
    } catch (error) {
      console.warn('Luna cloud sync:', error?.message || error);
      if (typeof showToast === 'function') showToast('Conta conectada. Sincronização será tentada novamente.');
    } finally {
      syncing = false;
    }
  }

  async function syncNow() {
    if (syncing) return;
    const activeSession = await session();
    if (!activeSession?.user?.id) return;
    syncing = true;
    try { await pushLocalData(activeSession.user.id); }
    catch (error) { console.warn('Luna cloud save:', error?.message || error); }
    finally { syncing = false; }
  }

  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncNow, 650);
  }

  async function clearCloudLogs() {
    const activeSession = await session();
    const supabase = adapter()?.supabase;
    if (!activeSession?.user?.id || !supabase) return;
    const { error } = await supabase.from('luna_daily_logs').delete().eq('user_id', activeSession.user.id);
    if (error) throw error;
  }

  function patchSave() {
    if (typeof save !== 'function' || save.__lunaCloudPatched) return;
    const originalSave = save;
    const patched = function saveWithCloudSync() {
      const result = originalSave.apply(this, arguments);
      scheduleSync();
      return result;
    };
    patched.__lunaCloudPatched = true;
    save = patched;
  }

  window.LUNA_CLOUD_SYNC = { initialSync, syncNow, clearCloudLogs };
  window.addEventListener('luna:authenticated', initialSync);

  function boot() {
    patchSave();
    initialSync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
