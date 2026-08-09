/* Luna v2 runtime upgrades — loaded after the legacy app script. */
(function () {
  'use strict';

  const NAV_ICONS = {
    inicio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.8 12 3l9 7.8v9.1a1.1 1.1 0 0 1-1.1 1.1h-5.4v-6h-5v6H4.1A1.1 1.1 0 0 1 3 19.9z"/></svg>',
    calendario: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
    historico: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 4.5V22M8 6h8M8 10h7"/></svg>',
    insights: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19V3"/></svg>',
    config: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06-2.83 2.83-.06-.06A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1.1 1.65V21h-4v-.08A1.8 1.8 0 0 0 8.8 19.3a1.8 1.8 0 0 0-1.98.36l-.06.06-2.83-2.83.06-.06A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.65-1.1H3v-4h.08A1.8 1.8 0 0 0 4.7 8.8a1.8 1.8 0 0 0-.36-1.98l-.06-.06 2.83-2.83.06.06A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 1.1-1.65V3h4v.08A1.8 1.8 0 0 0 15.2 4.7a1.8 1.8 0 0 0 1.98-.36l.06-.06 2.83 2.83-.06.06A1.8 1.8 0 0 0 19.4 9a1.8 1.8 0 0 0 1.65 1.1H21v4h-.08A1.8 1.8 0 0 0 19.4 15z"/></svg>'
  };

  function isNativeAndroid() {
    return Boolean(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) || /; wv\)/i.test(navigator.userAgent) || /Android/i.test(navigator.userAgent);
  }

  function installCycleEngineOverride() {
    if (!window.LunaCycleEngine || typeof appData === 'undefined') return;
    getCycle = function getCycleV2(refDate) {
      return window.LunaCycleEngine.calculateCycle(appData, refDate);
    };
  }

  function removeWebOnlyCopy() {
    document.body.classList.add('luna-native');
    const installCard = document.getElementById('home-install-card');
    if (installCard) installCard.remove();
    const installBtn = document.getElementById('install-btn');
    if (installBtn) installBtn.remove();

    const configView = document.getElementById('view-config');
    if (!configView) return;
    [...configView.querySelectorAll('.settings-card')].forEach(card => {
      const title = card.querySelector('.settings-title')?.textContent || '';
      if (title.includes('Instalar app')) card.remove();
    });
    configView.querySelectorAll('.small-help').forEach(help => {
      if (/navegador|GitHub Pages|instal/i.test(help.textContent || '')) {
        help.textContent = 'Os dados permanecem neste aparelho. Faça registros frequentes para melhorar as estimativas do ciclo.';
      }
    });
  }

  function upgradeNavigationIcons() {
    Object.entries(NAV_ICONS).forEach(([name, svg]) => {
      const icon = document.querySelector(`#nav-${name} .nav-icon`);
      if (icon) icon.innerHTML = svg;
    });
  }

  function greetingText() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  function addHomeIntro() {
    const home = document.getElementById('view-inicio');
    const hero = home?.querySelector('.cycle-hero');
    if (!home || !hero || home.querySelector('.home-intro')) return;

    const intro = document.createElement('div');
    intro.className = 'home-intro';
    intro.innerHTML = `
      <div class="home-intro-copy">
        <div class="home-eyebrow">Seu ciclo hoje</div>
        <div class="home-greeting" id="home-greeting">${greetingText()}</div>
        <div class="home-subtitle">Acompanhe seu ciclo e registre como você está se sentindo.</div>
      </div>
      <button type="button" class="home-register-btn" onclick="openLog()" aria-label="Registrar informações de hoje">+ Registrar</button>`;
    hero.before(intro);
  }

  function updateHomeGreeting() {
    const title = document.getElementById('home-greeting');
    if (!title) return;
    const name = typeof appData !== 'undefined' ? String(appData.name || '').trim() : '';
    title.textContent = `${greetingText()}${name ? `, ${name.split(' ')[0]}` : ''}`;
  }

  function addPredictionConfidence() {
    const chips = document.getElementById('phase-chips');
    if (!chips || typeof appData === 'undefined' || !appData.lastPeriod || !window.LunaCycleEngine) return;
    try {
      const result = window.LunaCycleEngine.calculateCycle(appData, new Date());
      const labels = { baixa:'Estimativa inicial', media:'Estimativa ajustada', alta:'Estimativa com histórico' };
      const item = document.createElement('div');
      item.className = 'chip prediction-confidence';
      item.textContent = `◉ ${labels[result.confidence] || 'Estimativa'}`;
      item.title = 'Previsões de ciclo são estimativas e não substituem orientação médica nem método contraceptivo.';
      chips.appendChild(item);
    } catch (_) {}
  }

  function decorateTodayShortcut() {
    const sectionAction = document.querySelector('#view-inicio .section-action[onclick*="openLog"]');
    if (!sectionAction) return;
    sectionAction.textContent = 'Editar hoje';
    sectionAction.setAttribute('aria-label', 'Registrar sintomas e informações de hoje');
  }

  function improveSectionCopy() {
    const timelineTitle = document.querySelector('#view-inicio .timeline')?.closest('.section')?.querySelector('.section-title');
    if (timelineTitle) timelineTitle.textContent = 'Próximas previsões';
    const todayTitle = document.querySelector('#today-preview')?.closest('.section')?.querySelector('.section-title');
    if (todayTitle) todayTitle.textContent = 'Seu registro de hoje';
  }

  function enhanceAccessibility() {
    document.querySelectorAll('button').forEach(button => {
      if (!button.getAttribute('type')) button.setAttribute('type', 'button');
    });
    document.querySelectorAll('.nav-item').forEach(button => {
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', button.classList.contains('active') ? 'true' : 'false');
    });
  }

  function patchTabAccessibility() {
    if (typeof showTab !== 'function') return;
    const previousShowTab = showTab;
    showTab = function showTabV2(name, button) {
      previousShowTab(name, button);
      document.querySelectorAll('.nav-item').forEach(item => {
        item.setAttribute('aria-selected', item === button ? 'true' : 'false');
      });
    };
  }

  function patchHomeRendering() {
    if (typeof renderInicio !== 'function') return;
    const previousRenderInicio = renderInicio;
    renderInicio = function renderInicioV2() {
      previousRenderInicio();
      document.querySelectorAll('.prediction-confidence').forEach(item => item.remove());
      updateHomeGreeting();
      addPredictionConfidence();
    };
  }

  function patchSettingsSave() {
    if (typeof saveSettings !== 'function') return;
    const previousSaveSettings = saveSettings;
    saveSettings = function saveSettingsV2() {
      previousSaveSettings();
      updateHomeGreeting();
    };
  }

  function boot() {
    if (isNativeAndroid()) document.body.classList.add('luna-native');
    installCycleEngineOverride();
    removeWebOnlyCopy();
    upgradeNavigationIcons();
    addHomeIntro();
    decorateTodayShortcut();
    improveSectionCopy();
    enhanceAccessibility();
    patchTabAccessibility();
    patchHomeRendering();
    patchSettingsSave();
    updateHomeGreeting();

    try {
      if (typeof appData !== 'undefined' && appData.lastPeriod && document.getElementById('app')?.style.display !== 'none') {
        renderInicio();
        renderCalendar();
      }
    } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
