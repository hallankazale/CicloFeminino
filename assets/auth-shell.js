/* Luna splash/auth shell. Uses window.LUNA_AUTH_ADAPTER when online auth is available. */
(function () {
  'use strict';

  const ICON = '<svg viewBox="0 0 108 108" aria-hidden="true"><path fill="#FFF8FC" fill-rule="evenodd" d="M48 25a28 28 0 1 0 0 56 28 28 0 1 0 0-56Zm13 0a23 23 0 1 0 0 46 23 23 0 1 0 0-46Z"/><path fill="#F5A0BD" d="M75 65s9 11 9 17c0 6-4 10-10 10s-10-4-10-10c0-6 11-17 11-17Z"/></svg>';
  const SESSION_KEY = 'luna_local_session';
  const BACKEND_MIGRATION_KEY = 'luna_backend_auth_v1_seen';

  function createSplash() {
    const splash = document.createElement('div');
    splash.className = 'luna-splash';
    splash.id = 'luna-splash';
    splash.innerHTML = `<div><div class="luna-splash-mark">${ICON}</div><div class="luna-splash-title">Luna</div><div class="luna-splash-subtitle">Seu ciclo, do seu jeito</div><div class="luna-splash-loader"></div></div>`;
    document.body.appendChild(splash);
  }

  function authMarkup() {
    return `<div class="luna-auth-inner">
      <div class="luna-auth-brand">
        <div class="luna-auth-brand-mark">${ICON}</div>
        <h1>Luna</h1>
        <p>Acompanhe seu ciclo com privacidade e clareza.</p>
      </div>
      <div class="luna-auth-card">
        <div class="luna-auth-tabs"><button class="luna-auth-tab active" data-auth-tab="login">Entrar</button><button class="luna-auth-tab" data-auth-tab="signup">Criar conta</button></div>
        <div id="luna-auth-error" class="luna-auth-error"></div>
        <button id="luna-google-btn" class="luna-google-btn"><span class="luna-google-g">G</span><span>Continuar com Google</span></button>
        <div class="luna-auth-divider">ou</div>
        <form id="luna-auth-form" novalidate>
          <div class="luna-field" id="luna-name-field" style="display:none"><label for="luna-auth-name">Nome</label><input id="luna-auth-name" autocomplete="name" placeholder="Seu nome"></div>
          <div class="luna-field"><label for="luna-auth-email">E-mail</label><input id="luna-auth-email" type="email" autocomplete="email" inputmode="email" placeholder="voce@email.com" required></div>
          <div class="luna-field"><label for="luna-auth-password">Senha</label><div class="luna-password-wrap"><input id="luna-auth-password" type="password" autocomplete="current-password" minlength="6" placeholder="Mínimo 6 caracteres" required><button type="button" id="luna-password-toggle" class="luna-password-toggle" aria-label="Mostrar senha">◉</button></div></div>
          <button id="luna-auth-submit" class="luna-auth-submit" type="submit">Entrar</button>
        </form>
        <div class="luna-auth-links"><button type="button" class="luna-auth-link" id="luna-forgot-btn">Esqueci minha senha</button><span></span></div>
        <button type="button" id="luna-local-btn" class="luna-local-btn">Continuar sem conta neste aparelho</button>
      </div>
      <div class="luna-auth-note">Dados sincronizados usam uma conta exclusiva do Luna. No modo local, os registros permanecem somente neste aparelho.</div>
    </div>`;
  }

  function createAuth() {
    const auth = document.createElement('section');
    auth.className = 'luna-auth';
    auth.id = 'luna-auth';
    auth.setAttribute('aria-label', 'Entrar no Luna');
    auth.innerHTML = authMarkup();
    document.body.appendChild(auth);
    wireAuth(auth);
  }

  function showAuth() { document.getElementById('luna-auth')?.classList.add('is-visible'); }
  function hideAuth() { document.getElementById('luna-auth')?.classList.remove('is-visible'); }
  function setError(message, success = false) {
    const box = document.getElementById('luna-auth-error');
    if (!box) return;
    box.textContent = message || '';
    box.classList.toggle('show', Boolean(message));
    box.classList.toggle('success', Boolean(message) && success);
  }

  async function runAdapter(method, payload) {
    const adapter = window.LUNA_AUTH_ADAPTER;
    if (!adapter || typeof adapter[method] !== 'function') throw new Error('O login online do Luna não está disponível nesta versão.');
    return adapter[method](payload);
  }

  async function finishOnlineLogin(method, payload) {
    const result = await runAdapter(method, payload);
    localStorage.removeItem(SESSION_KEY);
    hideAuth();
    window.dispatchEvent(new CustomEvent('luna:authenticated', { detail: { method } }));
    return result;
  }

  function wireAuth(auth) {
    let mode = 'login';
    const tabs = auth.querySelectorAll('[data-auth-tab]');
    const nameField = auth.querySelector('#luna-name-field');
    const submit = auth.querySelector('#luna-auth-submit');
    const password = auth.querySelector('#luna-auth-password');

    tabs.forEach(tab => tab.addEventListener('click', () => {
      mode = tab.dataset.authTab;
      tabs.forEach(item => item.classList.toggle('active', item === tab));
      nameField.style.display = mode === 'signup' ? 'block' : 'none';
      submit.textContent = mode === 'signup' ? 'Criar minha conta' : 'Entrar';
      password.autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
      setError('');
    }));

    auth.querySelector('#luna-password-toggle').addEventListener('click', () => {
      password.type = password.type === 'password' ? 'text' : 'password';
    });

    auth.querySelector('#luna-local-btn').addEventListener('click', () => {
      localStorage.setItem(SESSION_KEY, 'local');
      hideAuth();
    });

    auth.querySelector('#luna-google-btn').addEventListener('click', async () => {
      setError('');
      try { await finishOnlineLogin('signInWithGoogle'); }
      catch (error) { setError(error?.message || 'Não foi possível entrar com Google.'); }
    });

    auth.querySelector('#luna-forgot-btn').addEventListener('click', async () => {
      const email = auth.querySelector('#luna-auth-email').value.trim();
      if (!email) return setError('Digite seu e-mail para recuperar a senha.');
      try {
        await runAdapter('resetPassword', { email });
        setError('Enviamos as instruções de recuperação para seu e-mail.', true);
      } catch (error) { setError(error?.message || 'Não foi possível recuperar a senha.'); }
    });

    auth.querySelector('#luna-auth-form').addEventListener('submit', async event => {
      event.preventDefault();
      setError('');
      const email = auth.querySelector('#luna-auth-email').value.trim();
      const pass = password.value;
      const name = auth.querySelector('#luna-auth-name').value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Informe um e-mail válido.');
      if (pass.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.');
      if (mode === 'signup' && name.length < 2) return setError('Informe seu nome.');
      submit.disabled = true;
      try {
        if (mode === 'signup') await finishOnlineLogin('signUp', { email, password: pass, name });
        else await finishOnlineLogin('signIn', { email, password: pass });
      } catch (error) {
        const message = error?.message || 'Não foi possível concluir o acesso.';
        setError(message, /^Conta criada\./i.test(message));
      } finally { submit.disabled = false; }
    });
  }

  function createDangerDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'luna-danger-confirm';
    dialog.id = 'luna-danger-confirm';
    dialog.innerHTML = `<div class="luna-danger-card"><div class="luna-danger-icon">⌫</div><div class="luna-danger-title">Apagar registros?</div><div class="luna-danger-text">Isso apagará todos os registros de sintomas, fluxo, humor e anotações deste aparelho. Sua conta e configurações do ciclo serão mantidas.</div><div class="luna-danger-actions"><button class="luna-danger-cancel" id="luna-clear-cancel">Cancelar</button><button class="luna-danger-delete" id="luna-clear-confirm">Apagar registros</button></div></div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('#luna-clear-cancel').addEventListener('click', () => dialog.classList.remove('show'));
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.classList.remove('show'); });
    dialog.querySelector('#luna-clear-confirm').addEventListener('click', async () => {
      try {
        if (typeof appData !== 'undefined') appData.logs = {};
        if (typeof save === 'function') save();
        if (typeof renderInicio === 'function') renderInicio();
        if (typeof renderCalendar === 'function') renderCalendar();
        if (typeof renderHistorico === 'function') renderHistorico();
        if (typeof renderInsights === 'function') renderInsights();
        if (window.LunaNotifications?.reschedule && typeof appData !== 'undefined') {
          try { await window.LunaNotifications.reschedule(appData); } catch (_) {}
        }
        dialog.classList.remove('show');
        if (typeof showToast === 'function') showToast('Registros apagados.');
      } catch (_) {
        if (typeof showToast === 'function') showToast('Não foi possível limpar os registros.');
      }
    });
  }

  function patchClearButton() {
    window.clearLogs = function clearLogsSafe() {
      document.getElementById('luna-danger-confirm')?.classList.add('show');
    };
    document.querySelectorAll('button[onclick*="clearLogs"]').forEach(button => {
      button.onclick = window.clearLogs;
      button.textContent = 'Limpar';
    });
  }

  async function resolveStartupSession() {
    try {
      const adapter = window.LUNA_AUTH_ADAPTER;
      if (adapter?.getSession) {
        const session = await adapter.getSession();
        if (session) {
          localStorage.removeItem(SESSION_KEY);
          hideAuth();
          return;
        }
      }
    } catch (_) {}

    // Existing local users see the new account screen once after this backend migration.
    if (localStorage.getItem(SESSION_KEY) && localStorage.getItem(BACKEND_MIGRATION_KEY)) {
      hideAuth();
      return;
    }
    localStorage.setItem(BACKEND_MIGRATION_KEY, '1');
    showAuth();
  }

  function boot() {
    createSplash();
    createAuth();
    createDangerDialog();
    patchClearButton();

    setTimeout(async () => {
      const splash = document.getElementById('luna-splash');
      splash?.classList.add('is-leaving');
      setTimeout(() => splash?.remove(), 340);
      await resolveStartupSession();
    }, 1450);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
