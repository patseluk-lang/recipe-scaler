/*
 * Recipe Scaler — interface languages.
 * Every language lives in its own file: lang/<code>.js.
 * To add a language: create lang/<code>.js (copy en.js and translate it)
 * and add its code to LANGUAGES below.
 */
(function () {
  'use strict';

  const LANGUAGES = ['uk', 'en'];
  const FALLBACK = 'en';
  const STORAGE_KEY = 'recipe-scaler.lang';

  window.RS_LANG = window.RS_LANG || {};

  const scriptBase = (function () {
    const current = document.currentScript && document.currentScript.src;
    return current ? current.replace(/js\/i18n\.js(\?.*)?$/, '') : '';
  })();

  let currentLang = FALLBACK;

  function loadScript(code) {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = scriptBase + 'lang/' + code + '.js';
      script.onload = resolve;
      script.onerror = resolve; // a missing language file must not break the page
      document.head.appendChild(script);
    });
  }

  function savedLang() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function pickLang() {
    const saved = savedLang();
    if (saved && window.RS_LANG[saved]) return saved;
    const browser = (navigator.language || '').slice(0, 2).toLowerCase();
    if (window.RS_LANG[browser]) return browser;
    return window.RS_LANG[FALLBACK] ? FALLBACK : LANGUAGES.find((c) => window.RS_LANG[c]);
  }

  /** Translation by key; {name} placeholders are replaced with vars.name. */
  function t(key, vars) {
    const dict = (window.RS_LANG[currentLang] || {}).strings || {};
    const fallback = (window.RS_LANG[FALLBACK] || {}).strings || {};
    let text = dict[key] !== undefined ? dict[key] : fallback[key] !== undefined ? fallback[key] : key;
    if (vars) {
      Object.keys(vars).forEach((name) => {
        text = text.split('{' + name + '}').join(vars[name]);
      });
    }
    return text;
  }

  function locale() {
    return (window.RS_LANG[currentLang] || {}).locale || 'en-GB';
  }

  /** Number formatting for the current language (decimal comma in Ukrainian). */
  function formatNumber(value, maxDigits) {
    if (!Number.isFinite(value)) return '—';
    return new Intl.NumberFormat(locale(), {
      maximumFractionDigits: maxDigits === undefined ? 1 : maxDigits,
      minimumFractionDigits: 0,
    }).format(value);
  }

  function formatDate(iso) {
    const date = new Date(iso);
    if (isNaN(date)) return '';
    return new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  /** Fills every element marked with data-i18n / data-i18n-placeholder / data-i18n-aria-label. */
  function applyStatic(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    scope.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
    });
    scope.querySelectorAll('[data-num]').forEach((el) => {
      el.textContent = formatNumber(Number(el.getAttribute('data-num')), 2);
    });
    const titleKey = document.body.getAttribute('data-title');
    if (titleKey) document.title = t(titleKey) + ' — Recipe Scaler';
    document.documentElement.lang = currentLang;
  }

  function buildSwitcher() {
    const select = document.getElementById('lang-select');
    if (!select) return;
    select.innerHTML = '';
    LANGUAGES.filter((code) => window.RS_LANG[code]).forEach((code) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = window.RS_LANG[code].name;
      select.appendChild(option);
    });
    select.value = currentLang;
    select.addEventListener('change', () => setLang(select.value));
  }

  function setLang(code) {
    if (!window.RS_LANG[code]) return;
    currentLang = code;
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch (e) {
      /* the choice just won't be remembered */
    }
    applyStatic();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: code } }));
  }

  const ready = Promise.all(LANGUAGES.map(loadScript)).then(() => {
    currentLang = pickLang();
    buildSwitcher();
    applyStatic();
  });

  window.I18n = {
    ready,
    t,
    formatNumber,
    formatDate,
    applyStatic,
    get lang() {
      return currentLang;
    },
  };
})();
