/* ============================================================
   R3D Daily Review — application
   Hash router + Leitner progress + filters + search + stats.

   Progress lives in localStorage under "review-progress-v1":
     { [cardId]: { status, box, nextReview, seen, correct } }
   ============================================================ */
(function () {
  'use strict';

  const CFG = window.R3D_CONFIG;
  const SCENES = window.R3D_SCENES;
  const DATA = window.R3D_DAILY || { cats: [], cards: [] };
  const AUDIO = window.R3D_AUDIO || {};

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const CATS = DATA.cats.map(c => ({
    id: c.id,
    ar: c.ar || CFG.CAT_AR[c.id] || c.id,
    desc: c.desc || ''
  }));

  if (!CATS.length) {
    Object.keys(CFG.CAT_AR).forEach(id => {
      if (id !== 'all') CATS.push({ id, ar: CFG.CAT_AR[id], desc: '' });
    });
  }

  const CAT_BY_ID = {};
  CATS.forEach(c => { CAT_BY_ID[c.id] = c; });

  const catName = id => (CAT_BY_ID[id] && CAT_BY_ID[id].ar) || CFG.CAT_AR[id] || id;
  const catColor = id => CFG.CAT_COLOR[id] || '#38BDF8';

  const DEFAULT_SETTINGS = {
    cat: 'all',
    mode: 'new',
    level: 'all',
    tones: [],
    audioSpeed: CFG.DEFAULT_AUDIO_SPEED || 1,
    theme: 'dark'
  };

  const SPEED_OPTIONS = CFG.AUDIO_SPEEDS || [
    { value: 0.75, label: '0.75×' },
    { value: 1, label: '1×' },
    { value: 1.25, label: '1.25×' }
  ];

  let settings = Object.assign({}, DEFAULT_SETTINGS);
  let progress = {};
  let forcedCardId = null;

  function loadSettings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CFG.STORAGE.settings) || 'null');
      if (parsed && typeof parsed === 'object') {
        settings = Object.assign({}, DEFAULT_SETTINGS, parsed);
      }
    } catch (e) {}
    if (!Array.isArray(settings.tones)) settings.tones = [];
    var sp = Number(settings.audioSpeed);
    if (!SPEED_OPTIONS.some(function (o) { return o.value === sp; })) {
      settings.audioSpeed = CFG.DEFAULT_AUDIO_SPEED || 1;
    }
  }

  function saveSettings() {
    try { localStorage.setItem(CFG.STORAGE.settings, JSON.stringify(settings)); } catch (e) {}
  }

  function loadProgress() {
    let raw = null;
    try { raw = localStorage.getItem(CFG.STORAGE.progress); } catch (e) {}
    if (!raw) {
      try { raw = localStorage.getItem(CFG.STORAGE.legacy); } catch (e) {}
    }
    if (!raw) { progress = {}; return; }
    try {
      const parsed = JSON.parse(raw);
      progress = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    } catch (e) { progress = {}; }
  }

  function saveProgress() {
    try { localStorage.setItem(CFG.STORAGE.progress, JSON.stringify(progress)); } catch (e) {}
  }

  const todayStr = () => {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  };

  const addDays = (iso, n) => {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  };

  const progOf = id => progress[id] || null;
  const isKnown = id => { const p = progOf(id); return !!(p && p.status === 'known'); };
  const isDue = id => {
    const p = progOf(id);
    if (!p || p.status === 'new') return false;
    return (p.nextReview || '9999-12-31') <= todayStr();
  };

  function eligible(c) {
    if (settings.cat !== 'all' && c.cat !== settings.cat) return false;
    if (settings.level !== 'all' && c.level !== settings.level) return false;
    if (settings.tones.length && settings.tones.indexOf(c.label) === -1) return false;
    if (settings.mode === 'new') return !progOf(c.id);
    return isDue(c.id);
  }

  function scopedCards() { return DATA.cards.filter(eligible); }

  /* ---------------- Icons ---------------- */
  const ICON = {
    notebook: '<path d="M6 3h11a2 2 0 0 1 2 2v15H8a2 2 0 0 1-2-2z"/><path d="M6 18a2 2 0 0 1 2-2h11"/><path d="M10 7h6M10 10h4"/>',
    star: '<path d="M12 3l2.2 5.3 5.8.5-4.4 3.8 1.4 5.6L12 15l-5 3.2 1.4-5.6L4 8.8l5.8-.5z"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7"/><path d="M12 17h.01"/>',
    bowl: '<path d="M3 12h18a9 9 0 0 1-18 0z"/><path d="M8 3c-1 1.5 1 2.5 0 4M13 3c-1 1.5 1 2.5 0 4"/>',
    cross: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
    bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    building: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M10 21v-4h4v4"/>',
    taxi: '<path d="M4 16v-4l2-5h12l2 5v4z"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/>',
    heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    rocket: '<path d="M12 3c3 2 4 6 3 10l-3 3-3-3c-1-4 0-8 3-10z"/><circle cx="12" cy="9" r="1.5"/><path d="M9 14l-3 3 3 .5M15 14l3 3-3 .5"/>',
    shelf: '<rect x="4" y="5" width="16" height="4" rx="1"/><rect x="4" y="10" width="16" height="4" rx="1"/><rect x="4" y="15" width="16" height="4" rx="1"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.8"/><rect x="13" y="13" width="7" height="7" rx="1.8"/>',
    play: '<path d="M8 5v14l11-7z"/>',
    sound: '<path d="M12 15V3l-6 9h4v6l6-9h-4z"/>',
    back: '<path d="M9 6l-4 6 4 6"/><path d="M5 12h14"/>',
    next: '<path d="M15 6l4 6-4 6"/><path d="M19 12H5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    grid2: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    stats: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
    theme: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    bubble: '<path d="M4 5h11v8H9l-3 3v-3H4z"/><path d="M17 9h3v8h-2v3l-3-3h-5v-2"/>'
  };

  function svgIcon(name, size, color, width) {
    return '<svg aria-hidden="true" width="' + (size || 20) + '" height="' + (size || 20) +
      '" viewBox="0 0 24 24" fill="none" stroke="' + (color || 'currentColor') +
      '" stroke-width="' + (width || 2) + '" stroke-linecap="round" stroke-linejoin="round">' +
      (ICON[name] || '') + '</svg>';
  }

  const CAT_ICON = {
    greetings: 'bubble', questions: 'question', numbers: 'clock', food: 'bowl',
    emergency: 'cross', phone: 'phone', shopping: 'bag', hotel: 'building',
    transport: 'taxi', polite: 'heart', advanced: 'rocket', general: 'shelf'
  };

  /* ---------------- Theme Helpers ---------------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    settings.theme = theme;
    saveSettings();
    updateThemeToggleLabel();
  }

  function initTheme() {
    const saved = settings.theme || 'dark';
    applyTheme(saved);
  }

  function toggleTheme() {
    const next = settings.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }

  function updateThemeToggleLabel() {
    const btn = $('#themeToggle');
    if (btn) {
      const isDark = settings.theme === 'dark';
      btn.innerHTML = (isDark ? svgIcon('sun', 16, 'currentColor') : svgIcon('moon', 16, 'currentColor')) +
        '<span>' + (isDark ? 'الوضع الفاتح' : 'الوضع الداكن') + '</span>';
      btn.setAttribute('aria-label', isDark ? 'التحول إلى الوضع الفاتح' : 'التحول إلى الوضع الداكن');
    }
  }

  /* ---------------- Accessible Modal Helper ---------------- */
  function openModal(htmlContent, onInit) {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-scrim';
    backdrop.setAttribute('role', 'presentation');
    backdrop.innerHTML = htmlContent;
    document.body.appendChild(backdrop);
    document.body.classList.add('modal-open');

    const box = backdrop.querySelector('.dialog-box');
    if (box) {
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
    }

    const previouslyFocused = document.activeElement;

    const focusableEls = backdrop.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusableEls[0];
    const lastEl = focusableEls[focusableEls.length - 1];

    if (firstEl) firstEl.focus();

    const closeModal = () => {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      document.body.classList.remove('modal-open');
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
      document.removeEventListener('keydown', handleKeydown);
    };

    const handleKeydown = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      } else if (e.key === 'Tab' && focusableEls.length > 0) {
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeydown);
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) closeModal();
    });

    if (typeof onInit === 'function') {
      onInit(backdrop, closeModal);
    }

    return closeModal;
  }

  /* ---------------- HOME view ---------------- */
  function renderHome() {
    document.body.classList.remove('study-active');
    document.title = 'مراجعة اليوم — R3D Daily Review';

    const scope = scopedCards();
    const total = DATA.cards.length;
    const known = scope.filter(c => isKnown(c.id)).length;
    const due = scope.filter(c => isDue(c.id)).length;
    const scopeDesc = scope.length === total ? '' : ' (بعد التصفية)';

    const brandHeader = `
      <header class="app-header">
        <div class="brand-wrap">
          <div class="brand-icon">${svgIcon('notebook', 24, 'currentColor', 2.2)}</div>
          <div class="brand-titles">
            <h1>مراجعة اليوم</h1>
            <p>تعابير صينية يومية للحياة الواقعية</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="action-pill" type="button" id="statsBtn" aria-label="إحصائيات المراجعة">
            ${svgIcon('stats', 16, 'currentColor')}
            <span>الإحصائيات</span>
          </button>
          <button class="action-pill" type="button" id="searchBtn" aria-label="بحث في القاموس">
            ${svgIcon('search', 16, 'currentColor')}
            <span>بحث</span>
          </button>
          <button class="action-pill" type="button" id="themeToggle" aria-label="تبديل المظهر">
            🌓 <span>المظهر</span>
          </button>
        </div>
      </header>
    `;

    const metricsDeck = `
      <section class="metrics-deck">
        <div class="metrics-grid">
          <div class="metric-card known">
            <div class="metric-header">
              <span>معروفة</span>
              <span class="metric-dot known"></span>
            </div>
            <div class="metric-val">${known}</div>
            <div class="metric-meta">متقنة بالكامل</div>
          </div>
          <div class="metric-card due">
            <div class="metric-header">
              <span>اليومية</span>
              <span class="metric-dot due"></span>
            </div>
            <div class="metric-val">${due}</div>
            <div class="metric-meta">مستحقة للمراجعة</div>
          </div>
          <div class="metric-card total">
            <div class="metric-header">
              <span>الإجمالي</span>
              <span class="metric-dot total"></span>
            </div>
            <div class="metric-val">${total}</div>
            <div class="metric-meta">مجموعة البطاقات</div>
          </div>
        </div>
        <div class="deck-scope-note">النطاق الحالي: ${scope.length} بطاقة${scopeDesc}</div>
      </section>
    `;

    const modeBtn = (val, label, icon) =>
      '<button class="filter-btn" type="button" data-mode="' + val + '" aria-pressed="' +
      (settings.mode === val) + '">' + svgIcon(icon, 16, 'currentColor') + '<span>' + label + '</span></button>';

    const levelBtn = (val, label) =>
      '<button class="filter-btn" type="button" data-level="' + val + '" aria-pressed="' +
      (settings.level === val) + '"><span>' + label + '</span></button>';

    const filterPanel = `
      <section class="filter-panel">
        <div class="filter-group">
          <div class="filter-title">وضع الجولة</div>
          <div class="filter-segments">
            ${modeBtn('new', 'بطاقات جديدة', 'star')}
            ${modeBtn('today', 'المراجعة اليومية', 'calendar')}
          </div>
        </div>
        <div class="filter-group">
          <div class="filter-title">المستوى</div>
          <div class="filter-segments">
            ${levelBtn('all', 'جميع المستويات')}
            ${levelBtn('easy', 'سهل (HSK 1-2)')}
            ${levelBtn('medium', 'متوسط (HSK 3-4)')}
            ${levelBtn('hard', 'متقدم (HSK 5-6)')}
          </div>
        </div>
      </section>
    `;

    const toneChip = (tone) => {
      const on = settings.tones.indexOf(tone) !== -1;
      return '<button class="register-card" type="button" data-tone="' + tone + '" aria-pressed="' + on + '">' +
        '<span class="register-badge">' + svgIcon(tone === 'street' ? 'bag' : tone === 'academic' ? 'building' : 'globe', 18, 'currentColor') + '</span>' +
        '<span class="register-texts"><span class="register-name">' + CFG.TONE_LABEL[tone] + '</span>' +
        '<span class="register-desc">' + CFG.TONE_DESC[tone] + '</span></span></button>';
    };

    const registersSection = `
      <section class="registers-section">
        <div class="section-head">
          <h2 class="section-title">المصدر والاستخدام</h2>
          <span class="section-subtitle">اختر تصفية السجل</span>
        </div>
        <div class="registers-grid">
          ${CFG.TONE_ORDER.map(toneChip).join('')}
        </div>
      </section>
    `;

    const catChip = (c) => {
      const color = catColor(c.id);
      const inCat = DATA.cards.filter(x =>
        x.cat === c.id &&
        (settings.level === 'all' || x.level === settings.level) &&
        (!settings.tones.length || settings.tones.indexOf(x.label) !== -1));
      const n = inCat.length;
      const knownN = inCat.filter(x => isKnown(x.id)).length;
      return '<button class="cat-chip" type="button" data-cat="' + c.id + '" style="--cat:' + color + ';--cat-surface:' + hexA(color, 0.12) + '">' +
        '<span class="cat-icon-badge">' + svgIcon(CAT_ICON[c.id] || 'grid', 20, 'currentColor') + '</span>' +
        '<span class="cat-chip-info">' +
          '<span class="cat-chip-name">' + esc(c.ar) + '</span>' +
          '<span class="cat-chip-count">' + knownN + ' / ' + n + ' معروفة</span>' +
        '</span></button>';
    };

    const categoriesSection = `
      <section class="categories-section">
        <div class="section-head">
          <h2 class="section-title">الفئات والمواقف</h2>
          <span class="section-subtitle">اختر فئة محددة أو ابدأ بالكل</span>
        </div>
        <div class="category-grid">
          <button class="cat-chip cat-all-chip" type="button" data-cat="all">
            <span class="cat-icon-badge" style="color:var(--accent)">${svgIcon('grid', 20, 'currentColor')}</span>
            <span class="cat-chip-info">
              <span class="cat-chip-name">عرض جميع الفئات</span>
              <span class="cat-chip-count">${total} بطاقة إجمالية</span>
            </span>
          </button>
          ${CATS.map(catChip).join('')}
        </div>
      </section>
    `;

    const startButton = `
      <button class="primary-start-btn" type="button" id="startBtn">
        <span>ابدأ المراجعة الآن</span>
        ${svgIcon('next', 22, 'currentColor', 2.5)}
      </button>
    `;

    const footer = `
      <footer class="app-footer">
        <p class="footer-copy">المصدر: <b>library/content-data.json</b> (يُبنى عبر <code>python tools/build.py</code>)</p>
        <button class="btn-quiet" type="button" id="resetBtn">
          ${svgIcon('reset', 14, 'currentColor')}
          <span>إعادة ضبط التقدم</span>
        </button>
      </footer>
    `;

    document.getElementById('app').innerHTML =
      '<div class="shell">' +
        brandHeader +
        metricsDeck +
        filterPanel +
        registersSection +
        categoriesSection +
        startButton +
        footer +
      '</div>';

    bindHome();
  }

  function hexA(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function bindHome() {
    $$('[data-mode]').forEach(b => b.addEventListener('click', () => {
      settings.mode = b.dataset.mode;
      saveSettings();
      renderHome();
    }));

    $$('[data-level]').forEach(b => b.addEventListener('click', () => {
      settings.level = b.dataset.level;
      saveSettings();
      renderHome();
    }));

    $$('.register-card').forEach(b => b.addEventListener('click', () => {
      const t = b.dataset.tone;
      const i = settings.tones.indexOf(t);
      if (i === -1) settings.tones.push(t); else settings.tones.splice(i, 1);
      saveSettings();
      renderHome();
    }));

    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', toggleTheme);
      updateThemeToggleLabel();
    }

    $$('[data-cat]').forEach(b => b.addEventListener('click', () => {
      settings.cat = b.dataset.cat;
      saveSettings();
      location.hash = '#/study/' + b.dataset.cat;
    }));

    const startBtn = $('#startBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const n = scopedCards().length;
        if (!n) {
          toast('لا توجد بطاقات مطابقة لهذه الإعدادات — جرب تعديل الفلتر.');
          return;
        }
        location.hash = '#/study/' + settings.cat;
      });
    }

    const resetBtn = $('#resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        openModal(
          '<div class="dialog-box">' +
            '<div class="dialog-header"><h3>إعادة ضبط التقدم بالكامل؟</h3></div>' +
            '<p class="dialog-lead">سيتم مسح سجل المراجعات وصناديق لايتنر والإحصائيات نهائياً. لا يمكن التراجع عن هذا الإجراء.</p>' +
            '<div class="dialog-actions">' +
              '<button class="btn-secondary" type="button" id="dlgCancel">إلغاء</button>' +
              '<button class="btn-danger" type="button" id="dlgOk">مسح التقدم</button>' +
            '</div>' +
          '</div>',
          (backdrop, close) => {
            backdrop.querySelector('#dlgCancel').addEventListener('click', close);
            backdrop.querySelector('#dlgOk').addEventListener('click', () => {
              progress = {};
              saveProgress();
              settings = Object.assign({}, DEFAULT_SETTINGS);
              saveSettings();
              close();
              renderHome();
              toast('تمت إعادة ضبط التقدم بنجاح');
            });
          }
        );
      });
    }

    const statsBtn = document.getElementById('statsBtn');
    if (statsBtn) statsBtn.addEventListener('click', openStatsModal);

    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.addEventListener('click', openSearchModal);
  }

  /* ---------------- STUDY view ---------------- */
  const session = {
    queue: [], idx: 0, cur: null, flipped: false,
    counts: { know: 0, hard: 0, miss: 0 },
    rated: []
  };

  function renderStudy(catId) {
    const cat = (catId === 'all') ? 'all' : (CAT_BY_ID[catId] ? catId : 'all');
    const color = catColor(cat);
    const title = cat === 'all' ? 'كل الفئات والمواقف' : catName(cat);

    document.title = title + ' — مراجعة اليوم';

    const root = document.getElementById('app');
    root.innerHTML = `
      <div class="study-shell" style="--cat: ${color}">
        <nav class="study-navbar">
          <button class="study-icon-btn" type="button" id="backBtn" aria-label="العودة للرئيسية">
            ${svgIcon('back', 20, 'currentColor')}
          </button>
          <div class="study-title-wrap">
            <h1 class="study-title">${esc(title)}</h1>
          </div>
          <div class="speed-segment-group" role="group" aria-label="سرعة النطق">
            ${SPEED_OPTIONS.map(s =>
              '<button class="speed-segment-btn" type="button" data-speed="' + s.value + '" aria-pressed="' +
              (Number(settings.audioSpeed || 1) === s.value) + '">' + s.label + '</button>'
            ).join('')}
          </div>
        </nav>

        <div class="study-progress-card">
          <div class="progress-track">
            <div class="progress-fill" id="pbarFill" style="width: 0%"></div>
          </div>
          <div class="progress-meta">
            <span class="progress-counter" id="progressLabel">0 / 0</span>
            <span id="progressLeft">جاري التحميل...</span>
          </div>
        </div>

        <div class="study-content-grid">
          <div class="scene-frame" id="sceneCard" style="border-color: var(--border);"></div>
          <div class="study-column">
            <div id="studyBody"></div>
            <div class="shortcuts-row">
              <span>قلب البطاقة <kbd class="kbd-badge">Space</kbd></span>
              <span>لم أعرفها <kbd class="kbd-badge">1</kbd></span>
              <span>صعبة <kbd class="kbd-badge">2</kbd></span>
              <span>عرفتها <kbd class="kbd-badge">3</kbd></span>
              <span>تنقل <kbd class="kbd-badge">← / →</kbd></span>
            </div>
          </div>
        </div>
      </div>
    `;

    const sceneFn = SCENES[cat] || SCENES.all;
    $('#sceneCard').innerHTML =
      '<svg viewBox="0 0 350 236" role="img" aria-label="مشهد توضيحي لـ ' + esc(title) + '">' +
      sceneFn(color) + '</svg>';

    $('#backBtn').addEventListener('click', () => {
      location.hash = '#/';
    });

    $$('[data-speed]').forEach(b => b.addEventListener('click', () => {
      settings.audioSpeed = Number(b.dataset.speed);
      saveSettings();
      $$('[data-speed]').forEach(x =>
        x.setAttribute('aria-pressed', String(Number(x.dataset.speed) === settings.audioSpeed)));
      if (session.cur) speak(session.cur.front, session.cur.id);
    }));

    buildQueue(cat);
    session.idx = 0;
    session.flipped = false;
    session.counts = { know: 0, hard: 0, miss: 0 };
    session.rated = [];

    if (!session.queue.length) {
      renderEmpty();
      return;
    }
    renderCard();
  }

  function buildQueue(cat) {
    if (forcedCardId) {
      const targetCard = DATA.cards.find(c => c.id === forcedCardId);
      forcedCardId = null;
      if (targetCard) {
        session.queue = [targetCard];
        return;
      }
    }

    const base = DATA.cards.filter(c => {
      if (cat !== 'all' && c.cat !== cat) return false;
      if (settings.level !== 'all' && c.level !== settings.level) return false;
      if (settings.tones.length && settings.tones.indexOf(c.label) === -1) return false;
      return true;
    });

    let q;
    if (settings.mode === 'new') {
      q = base.filter(c => !progOf(c.id));
    } else {
      q = base.filter(c => isDue(c.id));
    }

    if (!q.length) {
      const unseen = base.filter(c => !progOf(c.id));
      q = unseen.length ? unseen : base;
    }
    session.queue = q;
  }

  function renderEmpty() {
    $('#studyBody').innerHTML = `
      <div class="round-summary">
        <h2>لا توجد بطاقات مطابقة</h2>
        <p class="dialog-lead">كل بطاقات هذه الفئة مراجَعة أو استُبعدت بالفلاتر الحالية. جرب تغيير وضع الجولة أو المستوى.</p>
        <button class="btn-primary" type="button" id="emptyBack" style="width: 100%;">العودة للرئيسية</button>
      </div>
    `;
    $('#emptyBack').addEventListener('click', () => { location.hash = '#/'; });
  }

  function renderCard() {
    const c = session.queue[session.idx];
    if (!c) { showSummary(); return; }
    session.cur = c;
    session.flipped = false;

    const tone = c.label;
    const toneLabel = CFG.TONE_LABEL[tone] || 'محايد';
    const levelLabel = CFG.LEVEL_LABEL[c.level] || c.level;
    const toneClass = 'tone-' + (tone === 'street' ? 'street' : tone === 'academic' ? 'academic' : 'neutral');

    const frontFace = `
      <div class="card-side">
        <div class="card-zh-head zh" dir="ltr">${esc(c.front)}</div>
        ${c.py ? '<div class="card-pinyin ltr" dir="ltr">' + esc(c.py) + '</div>' : ''}
        <div class="card-prompt-hint">اضغط على البطاقة أو انقر المسافة لكشف المعنى</div>
      </div>
    `;

    const backFace = `
      <div class="card-side card-side-back">
        <div class="card-zh-head zh" dir="ltr">${esc(c.front)}</div>
        ${c.py ? '<div class="card-pinyin ltr" dir="ltr">' + esc(c.py) + '</div>' : ''}
        <div class="card-rule"></div>
        <div class="card-ar-body" dir="rtl">${esc(c.ar)}</div>
        ${c.note ? '<div class="card-note-body" dir="rtl">' + esc(c.note) + '</div>' : ''}
        <button class="voice-btn" type="button" id="soundBtn" aria-label="استمع للنطق الصيني">
          ${svgIcon('sound', 22, 'currentColor')}
        </button>
      </div>
    `;

    const bodyHtml = `
      <div class="study-column">
        <div class="badge-row">
          <span class="meta-chip ${toneClass}">${toneLabel}</span>
          <span class="meta-chip meta-level">${levelLabel}</span>
        </div>

        <div class="flip-stage">
          <div class="card-canvas" id="flipCard" role="button" tabindex="0" aria-label="بطاقة تعليمية، اضغط للقلب">
            ${frontFace}
            ${backFace}
          </div>
        </div>

        <div class="nav-row">
          <button class="nav-action-btn" type="button" data-nav="prev" aria-label="البطاقة السابقة">
            ${svgIcon('back', 16, 'currentColor')}
            <span>السابقة</span>
          </button>
          <button class="nav-action-btn" type="button" data-nav="next" aria-label="البطاقة التالية">
            <span>التالية</span>
            ${svgIcon('next', 16, 'currentColor')}
          </button>
        </div>

        <div class="rating-deck">
          <button class="rate-btn miss" type="button" data-rate="miss">لم أعرفها</button>
          <button class="rate-btn hard" type="button" data-rate="hard">صعبة</button>
          <button class="rate-btn know" type="button" data-rate="know">عرفتها</button>
        </div>
      </div>
    `;

    $('#studyBody').innerHTML = bodyHtml;

    const card = $('#flipCard');
    const doFlip = () => {
      session.flipped = !session.flipped;
      card.classList.toggle('is-flipped', session.flipped);
    };

    card.addEventListener('click', doFlip);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        doFlip();
      }
    });

    const soundBtn = $('#soundBtn');
    if (soundBtn) {
      soundBtn.addEventListener('click', e => {
        e.stopPropagation();
        speak(c.front, c.id);
      });
    }

    $$('[data-rate]').forEach(b => b.addEventListener('click', () => rate(b.dataset.rate)));
    $$('[data-nav]').forEach(b => b.addEventListener('click', () => {
      gotoCard(session.idx + (b.dataset.nav === 'next' ? 1 : -1));
    }));

    updateProgressUI();
  }

  function gotoCard(target) {
    if (!session.queue.length) return;
    const idx = Math.max(0, Math.min(session.queue.length - 1, target));
    if (idx === session.idx) { updateNavUI(); return; }
    session.idx = idx;
    session.flipped = false;
    renderCard();
  }

  function updateProgressUI() {
    const total = session.queue.length;
    const currentPos = Math.min(session.idx + 1, total);
    $('#progressLabel').textContent = currentPos + ' / ' + total;
    $('#pbarFill').style.width = (total ? (session.idx / total * 100) : 0) + '%';
    const left = Math.max(0, total - session.idx);
    $('#progressLeft').textContent = 'المتبقي في الجولة: ' + left;
    updateNavUI();
  }

  function updateNavUI() {
    const prev = $('[data-nav="prev"]');
    const next = $('[data-nav="next"]');
    const total = session.queue.length;
    if (prev) {
      const off = session.idx <= 0;
      prev.disabled = off;
    }
    if (next) {
      const off = session.idx >= total - 1;
      next.disabled = off;
    }
  }

  function rate(kind) {
    const c = session.cur;
    if (!c) return;
    const prev = progOf(c.id) || { status: 'new', box: 0, seen: 0, correct: 0 };
    let box = prev.box || 0;

    if (kind === 'know') {
      box = Math.min(5, box + 1);
      session.counts.know++;
    } else if (kind === 'hard') {
      box = Math.max(1, box);
      session.counts.hard++;
    } else {
      box = 1;
      session.counts.miss++;
    }

    const status = box >= 5 ? 'known' : (box === 0 ? 'new' : 'learning');
    const nextReview = addDays(todayStr(), CFG.BOX_INTERVAL[box] || 1);

    progress[c.id] = {
      status: status,
      box: box,
      nextReview: nextReview,
      seen: (prev.seen || 0) + 1,
      correct: (prev.correct || 0) + (kind === 'know' ? 1 : 0)
    };
    saveProgress();
    session.rated.push({ id: c.id, kind: kind });

    session.idx++;
    if (session.idx >= session.queue.length) { showSummary(); return; }
    renderCard();
  }

  function showSummary() {
    const total = session.rated.length || 1;
    const pct = Math.round(session.counts.know / total * 100);

    $('#studyBody').innerHTML = `
      <div class="round-summary">
        <h2>انتهت الجولة بنجاح</h2>
        <div class="summary-score">
          <span class="score-num">${pct}%</span>
          <span class="score-label">نسبة الإتقان في هذه الجولة</span>
        </div>
        <div class="summary-list">
          <div class="summary-item">
            <span>عرفتها</span>
            <span class="summary-item-val" style="color:var(--known)">${session.counts.know}</span>
          </div>
          <div class="summary-item">
            <span>صعبة</span>
            <span class="summary-item-val" style="color:var(--due)">${session.counts.hard}</span>
          </div>
          <div class="summary-item">
            <span>لم أعرفها</span>
            <span class="summary-item-val" style="color:var(--miss)">${session.counts.miss}</span>
          </div>
        </div>
        <div class="summary-actions">
          <button class="btn-secondary" type="button" id="againBtn">إعادة الجولة</button>
          <button class="btn-primary" type="button" id="backCatsBtn">الرئيسية</button>
        </div>
      </div>
    `;

    $('#againBtn').addEventListener('click', () => {
      const cat = location.hash.replace('#/study/', '') || 'all';
      renderStudy(cat);
    });
    $('#backCatsBtn').addEventListener('click', () => { location.hash = '#/'; });
    $('#pbarFill').style.width = '100%';
    $('#progressLabel').textContent = session.queue.length + ' / ' + session.queue.length;
    $('#progressLeft').textContent = 'اكتملت الجولة';
  }

  /* ---------------- Speech / Audio ---------------- */
  let voicesReady = false;
  function speak(text, cardId) {
    const btn = $('#soundBtn');
    if (cardId && playRecorded(cardId)) {
      if (btn) {
        btn.classList.add('is-active');
        setTimeout(() => btn.classList.remove('is-active'), 1000);
      }
      return;
    }
    if (!('speechSynthesis' in window)) { toast('متصفحك لا يدعم النطق الصوتي'); return; }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.rate = Number(settings.audioSpeed) || 1;
      const v = pickChineseVoice();
      if (v) u.voice = v;
      if (btn) btn.classList.add('is-active');
      u.onend = u.onerror = () => { if (btn) btn.classList.remove('is-active'); };
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function pickChineseVoice() {
    if (!voicesReady && window.speechSynthesis) {
      try { window.speechSynthesis.getVoices(); voicesReady = true; } catch (e) {}
    }
    const list = window.speechSynthesis ? window.speechSynthesis.getVoices() || [] : [];
    if (!list.length) return null;
    return list.find(v => /^zh[-_]CN/i.test(v.lang)) ||
           list.find(v => /^zh/i.test(v.lang)) || null;
  }

  if (window.speechSynthesis) {
    try { window.speechSynthesis.onvoiceschanged = () => { voicesReady = true; }; } catch (e) {}
  }

  function playRecorded(id) {
    if (!AUDIO[id]) return false;
    try {
      const a = new Audio(AUDIO[id]);
      a.playbackRate = Number(settings.audioSpeed) || 1;
      a.play().catch(() => {});
      return true;
    } catch (e) { return false; }
  }

  /* ---------------- Stats Modal ---------------- */
  function openStatsModal() {
    let totalReviews = 0;
    const boxDist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const catCounts = {};
    CATS.forEach(c => { if (c.id !== 'all') catCounts[c.id] = 0; });

    let totalSeenSum = 0;
    let totalCorrectSum = 0;

    DATA.cards.forEach(c => {
      const p = progress[c.id];
      if (p) {
        totalReviews += p.seen || 0;
        const b = Math.min(5, Math.max(0, p.box || 0));
        boxDist[b]++;
        if (catCounts[c.cat] !== undefined) {
          if (p.status === 'known' || p.box >= 5) catCounts[c.cat]++;
        }
        totalSeenSum += p.seen || 0;
        totalCorrectSum += p.correct || 0;
      }
    });

    const retention = totalSeenSum > 0 ? Math.round((totalCorrectSum / totalSeenSum) * 100) : 0;
    const maxBoxCount = Math.max(...Object.values(boxDist), 1);

    const boxColumns = Object.entries(boxDist).map(([boxNum, count]) => {
      const pct = Math.round((count / maxBoxCount) * 100);
      const boxName = boxNum === '5' ? 'مُتقن' : 'صندوق ' + boxNum;
      return `
        <div class="chart-bar-wrap">
          <div class="chart-col-val">${count}</div>
          <div class="chart-bar-pillar box-${boxNum}" style="height: ${Math.max(8, pct)}%;"></div>
          <span class="chart-col-tag">${boxName}</span>
        </div>
      `;
    }).join('');

    const catsRows = CATS.filter(c => c.id !== 'all').map(c => {
      const mastered = catCounts[c.id] || 0;
      return `
        <div class="stats-cat-row">
          <span>${esc(c.ar)}</span>
          <span class="count">${mastered} متقنة</span>
        </div>
      `;
    }).join('');

    const html = `
      <div class="dialog-box" style="max-width: 580px;">
        <div class="dialog-header">
          <h3>إحصائيات المراجعة والإتقان</h3>
        </div>
        <div class="stats-overview-grid">
          <div class="stat-metric-pill">
            <span class="val">${totalReviews}</span>
            <span class="lbl">إجمالي عمليات المراجعة</span>
          </div>
          <div class="stat-metric-pill">
            <span class="val" style="color:var(--known)">${retention}%</span>
            <span class="lbl">دقة الإجابات</span>
          </div>
        </div>

        <div class="box-chart-deck">
          <div class="chart-title">توزيع صناديق لايتنر (Leitner Boxes)</div>
          <div class="chart-columns">${boxColumns}</div>
        </div>

        <div class="box-chart-deck">
          <div class="chart-title">البطاقات المتقنة حسب الفئة</div>
          <div class="stats-cats-collection">${catsRows}</div>
        </div>

        <div class="dialog-actions">
          <button class="btn-primary" type="button" id="statsClose">إغلاق</button>
          <button class="btn-secondary" type="button" id="exportProgress">تصدير التقدم</button>
          <button class="btn-secondary" type="button" id="importProgress">استيراد التقدم</button>
        </div>
      </div>
    `;

    openModal(html, (backdrop, close) => {
      backdrop.querySelector('#statsClose').addEventListener('click', close);
      backdrop.querySelector('#exportProgress').addEventListener('click', exportProgress);
      backdrop.querySelector('#importProgress').addEventListener('click', importProgress);
    });
  }

  /* ---------------- Search Modal ---------------- */
  function openSearchModal() {
    const html = `
      <div class="dialog-box" style="max-width: 540px;">
        <div class="dialog-header">
          <h3>البحث السريع في البطاقات</h3>
        </div>
        <input class="search-input-field" type="text" id="searchInput" placeholder="ابحث بالصينية، البينيين، أو المعنى العربي..." autocomplete="off">
        <div class="search-results-list" id="searchResults">
          <div style="text-align: center; color: var(--text-subtle); padding: 24px;">اكتب حرفين أو أكثر للبحث الفوري...</div>
        </div>
        <div class="dialog-actions">
          <button class="btn-secondary" style="width: 100%;" type="button" id="searchClose">إغلاق</button>
        </div>
      </div>
    `;

    openModal(html, (backdrop, close) => {
      const input = backdrop.querySelector('#searchInput');
      const resultsDiv = backdrop.querySelector('#searchResults');

      input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        if (q.length < 2) {
          resultsDiv.innerHTML = '<div style="text-align: center; color: var(--text-subtle); padding: 24px;">اكتب حرفين أو أكثر للبحث الفوري...</div>';
          return;
        }

        const hits = DATA.cards.filter(c =>
          c.front.toLowerCase().includes(q) ||
          c.py.toLowerCase().includes(q) ||
          c.ar.toLowerCase().includes(q)
        ).slice(0, 40);

        if (!hits.length) {
          resultsDiv.innerHTML = '<div style="text-align: center; color: var(--text-subtle); padding: 24px;">لا توجد نتائج مطابقة لبحثك</div>';
          return;
        }

        resultsDiv.innerHTML = hits.map(c => {
          const catObj = CAT_BY_ID[c.cat];
          return `
            <button class="search-item" type="button" data-card-id="${esc(c.id)}" data-cat="${esc(c.cat)}">
              <div class="search-item-zh">${esc(c.front)}</div>
              <div class="search-item-py">${esc(c.py)}</div>
              <div class="search-item-ar">${esc(c.ar)}</div>
              <div class="search-item-tag">الفئة: ${catObj ? esc(catObj.ar) : esc(c.cat)}</div>
            </button>
          `;
        }).join('');

        resultsDiv.querySelectorAll('.search-item').forEach(el => {
          el.addEventListener('click', () => {
            const cardId = el.dataset.cardId;
            const catId = el.dataset.cat;
            close();
            forcedCardId = cardId;
            settings.cat = catId;
            saveSettings();
            location.hash = '#/study/' + catId;
          });
        });
      });

      backdrop.querySelector('#searchClose').addEventListener('click', close);
      setTimeout(() => input.focus(), 50);
    });
  }

  /* ---------------- Export / Import ---------------- */
  function exportProgress() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      progress: progress,
      settings: {
        cat: settings.cat,
        mode: settings.mode,
        level: settings.level,
        tones: settings.tones
      }
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'r3d-daily-backup-' + todayStr() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('تم تصدير ملف التقدم بنجاح');
  }

  function importProgress() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (parsed && typeof parsed.progress === 'object') {
            progress = parsed.progress;
            saveProgress();
            if (parsed.settings) {
              settings = Object.assign({}, settings, parsed.settings);
              saveSettings();
            }
            toast('تم استيراد التقدم وتحديث البيانات بنجاح');
            renderHome();
          } else {
            toast('ملف النسخ الاحتياطي غير صالح');
          }
        } catch (err) {
          toast('تعذر قراءة ملف JSON');
        }
      };
      reader.readAsText(file);
    });
    fileInput.click();
  }

  /* ---------------- Toast Notifications ---------------- */
  let toastTimer = null;
  function toast(msg) {
    let outlet = $('.toast-outlet');
    if (!outlet) {
      outlet = document.createElement('div');
      outlet.className = 'toast-outlet';
      document.body.appendChild(outlet);
    }
    outlet.textContent = msg;
    outlet.style.display = 'block';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (outlet.parentNode) outlet.style.display = 'none';
    }, 3200);
  }

  /* ---------------- Keyboard Shortcuts ---------------- */
  document.addEventListener('keydown', e => {
    if (!document.body.classList.contains('study-active')) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;

    if (e.key === ' ' || e.key === 'Spacebar') {
      const card = $('#flipCard');
      if (card) { e.preventDefault(); card.click(); }
      return;
    }
    if (e.key === '1') { e.preventDefault(); rate('miss'); }
    else if (e.key === '2') { e.preventDefault(); rate('hard'); }
    else if (e.key === '3') { e.preventDefault(); rate('know'); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const dir = e.key === 'ArrowLeft' ? 1 : -1;
      gotoCard(session.idx + dir);
    }
  });

  /* ---------------- Router ---------------- */
  function route() {
    const hash = location.hash || '#/';
    const m = hash.match(/^#\/study\/([A-Za-z0-9_-]+)/);
    if (m) {
      document.body.classList.add('study-active');
      renderStudy(m[1]);
    } else {
      document.body.classList.remove('study-active');
      renderHome();
    }
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);

  /* ---------------- Boot ---------------- */
  loadSettings();
  loadProgress();
  initTheme();
  route();
})();
