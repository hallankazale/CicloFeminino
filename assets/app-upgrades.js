/* Luna v2 runtime upgrades — loaded after the legacy app script. */
(function () {
  'use strict';

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

  function addPredictionConfidence() {
    const chips = document.getElementById('phase-chips');
    if (!chips || typeof appData === 'undefined' || !appData.lastPeriod || !window.LunaCycleEngine) return;
    try {
      const result = window.LunaCycleEngine.calculateCycle(appData, new Date());
      const labels = {
        baixa: 'Estimativa inicial',
        media: 'Estimativa ajustada',
        alta: 'Estimativa com histórico'
      };
      const item = document.createElement('div');
      item.className = 'chip';
      item.textContent = `◉ ${labels[result.confidence] || 'Estimativa'}`;
      item.title = 'Previsões de ciclo são estimativas e não substituem orientação médica nem método contraceptivo.';
      chips.appendChild(item);
    } catch (_) {}
  }

  function decorateTodayShortcut() {
    const sectionAction = document.querySelector('#view-inicio .section-action[onclick*="openLog"]');
    if (!sectionAction) return;
    sectionAction.textContent = '+ Registrar hoje';
    sectionAction.setAttribute('aria-label', 'Registrar sintomas e informações de hoje');
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
      addPredictionConfidence();
    };
  }

  function boot() {
    if (isNativeAndroid()) document.body.classList.add('luna-native');
    installCycleEngineOverride();
    removeWebOnlyCopy();
    decorateTodayShortcut();
    enhanceAccessibility();
    patchTabAccessibility();
    patchHomeRendering();

    // Re-render only when the user has already completed setup.
    try {
      if (typeof appData !== 'undefined' && appData.lastPeriod && document.getElementById('app')?.style.display !== 'none') {
        renderInicio();
        renderCalendar();
      }
    } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
