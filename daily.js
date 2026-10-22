/* ============================================================
   R3D Daily Review — application
   Hash router (#/ and #/study/:categoryId) + Leitner progress
   + filters + session timer + card flip + summary.

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

  /* ---------------- categories ---------------- */
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
  const catColor = id => CFG.CAT_COLOR[id] || '#7ADAFB';

  /* ---------------- state ---------------- */
  const DEFAULT_SETTINGS = {
    cat: 'all', mode: 'new', level: 'all', tones: [],
    audioSpeed: CFG.DEFAULT_AUDIO_SPEED || 1
  };

  /* Pronunciation speed presets live in config.js so the offered values and
     the persisted setting can never drift apart. */
  const SPEED_OPTIONS = CFG.AUDIO_SPEEDS || [
    { value: 0.75, label: '0.75×' },
    { value: 1, label: '1×' },
    { value: 1.25, label: '1.25×' }
  ];
  let settings = Object.assign({}, DEFAULT_SETTINGS);
  let progress = {};

  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(CFG.STORAGE.settings) || 'null');
      if (s && typeof s === 'object') settings = Object.assign({}, DEFAULT_SETTINGS, s);
    } catch (e) { /* corrupt settings — fall back to defaults */ }
    if (!Array.isArray(settings.tones)) settings.tones = [];
    // audioSpeed must be one of the offered presets — anything else is stale
    // or hand-edited, so fall back to normal speed.
    var sp = Number(settings.audioSpeed);
    if (!SPEED_OPTIONS.some(function (o) { return o.value === sp; })) {
      settings.audioSpeed = CFG.DEFAULT_AUDIO_SPEED || 1;
    }
  }
  function saveSettings() {
    try { localStorage.setItem(CFG.STORAGE.settings, JSON.stringify(settings)); } catch (e) {}
  }

  function loadProgress() {
    // primary key per spec; fall back to the pre-1.0 key and migrate it once.
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

  /* ---------------- card filtering ---------------- */
  function eligible(c) {
    if (settings.cat !== 'all' && c.cat !== settings.cat) return false;
    if (settings.level !== 'all' && c.level !== settings.level) return false;
    if (settings.tones.length && settings.tones.indexOf(c.label) === -1) return false;
    if (settings.mode === 'new') return !progOf(c.id);
    return isDue(c.id);
  }
  function scopedCards() { return DATA.cards.filter(eligible); }

  /* ---------------- icons (line SVG, stroke 2) ---------------- */
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
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'
  };
  function svgIcon(name, size, color, width) {
    return '<svg aria-hidden="true" width="' + (size || 24) + '" height="' + (size || 24) +
      '" viewBox="0 0 24 24" fill="none" stroke="' + (color || 'currentColor') +
      '" stroke-width="' + (width || 2) + '" stroke-linecap="round" stroke-linejoin="round">' +
      (ICON[name] || '') + '</svg>';
  }
  const CAT_ICON = {
    greetings: 'bubble', questions: 'question', numbers: 'clock', food: 'bowl',
    emergency: 'cross', phone: 'phone', shopping: 'bag', hotel: 'building',
    transport: 'taxi', polite: 'heart', advanced: 'rocket', general: 'shelf'
  };
  /* two speech bubbles for greetings */
  ICON.bubble = '<path d="M4 5h11v8H9l-3 3v-3H4z"/><path d="M17 9h3v8h-2v3l-3-3h-5v-2"/>';
  /* ---------------- shared markup builders ---------------- */
  function levelBars(level) {
    const on = { easy: 1, medium: 2, hard: 3 }[level] || 0;
    const col = { easy: '#38BDF8', medium: '#FFB020', hard: '#FF4D6D' }[level] || '#34417A';
    const active = 'var(--ink)';
    let s = '<svg aria-hidden="true" width="26" height="22" viewBox="0 0 26 22">';
    const bars = [[2, 12], [10, 7], [18, 2]];
    for (let i = 0; i < 3; i++) {
      const isOn = i < on;
      s += '<rect x="' + bars[i][0] + '" y="' + bars[i][1] + '" width="5" height="' + (20 - bars[i][1]) +
        '" rx="1.5" fill="' + (isOn ? active : col) + '" opacity="' + (isOn ? 1 : 0.35) + '"/>';
    }
    return s + '</svg>';
  }
  function ringIcon(pct, color, pctOf) {
    const r = 26, C = 2 * Math.PI * r;
    const v = pctOf === undefined ? pct : pctOf;
    return '<svg class="stat-ring" width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">' +
      '<circle cx="32" cy="32" r="' + r + '" fill="none" stroke="#2A3A78" stroke-width="6"/>' +
      '<circle cx="32" cy="32" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="6" ' +
      'stroke-linecap="round" stroke-dasharray="' + (C * v).toFixed(1) + ' ' + C.toFixed(1) + '" ' +
      'transform="rotate(-90 32 32)"/></svg>';
  }

  /* ---------------- HOME view ---------------- */
  function renderHome() {
    document.body.classList.remove('study-active');
    document.title = 'مراجعة اليوم';
    const scope = scopedCards();
    const total = DATA.cards.length;
    const known = scope.filter(c => isKnown(c.id)).length;
    const due = scope.filter(c => isDue(c.id)).length;
    const scopeDesc = scope.length === total ? '' : ' (بعد التصفية)';

    const toneChip = (tone) => {
      const on = settings.tones.indexOf(tone) !== -1;
      return '<button class="tone" type="button" data-tone="' + tone + '" aria-pressed="' + on + '" ' +
        'aria-label="تصفية حسب ' + CFG.TONE_LABEL[tone] + '">' +
        '<span class="tone-icon" style="color:#0A0F1F">' + svgIcon(
          tone === 'street' ? 'bag' : tone === 'academic' ? 'building' : 'globe', 26, '#0A0F1F') + '</span>' +
        '<span class="tone-text"><span class="tone-name">' + CFG.TONE_LABEL[tone] + '</span>' +
        '<span class="tone-desc">' + CFG.TONE_DESC[tone] + '</span></span></button>';
    };

    const catDots = CATS.map(c =>
      '<span class="cat-dot" style="background:' + catColor(c.id) + '"></span>').join('');

    const catCard = (c) => {
      const color = catColor(c.id);
      // counts honour the active level/register filters, so the grid
      // visibly reacts when a filter changes
      const inCat = DATA.cards.filter(x =>
        x.cat === c.id &&
        (settings.level === 'all' || x.level === settings.level) &&
        (!settings.tones.length || settings.tones.indexOf(x.label) !== -1));
      const n = inCat.length;
      const knownN = inCat.filter(x => isKnown(x.id)).length;
      return '<button class="cat-card" type="button" data-cat="' + c.id + '" ' +
        'style="background:linear-gradient(135deg,' + hexA(color, .25) + ' 0%,var(--panel) 100%);border-color:' + hexA(color, .4) + '" ' +
        'aria-label="' + esc(c.ar) + ' — ' + n + ' بطاقة">' +
        '<span class="cat-glow" style="background:' + hexA(color, .15) + '"></span>' +
        '<span class="cat-icon" style="background:' + color + ';color:#0A0F1F">' +
        svgIcon(CAT_ICON[c.id] || 'grid', 26, '#0A0F1F') + '</span>' +
        '<span class="cat-name">' + esc(c.ar) + '</span>' +
        '<span class="cat-count">' + knownN + ' / ' + n + ' معروفة</span>' +
        '</button>';
    };

    const hero = `
      <section class="hero">
        <svg class="hero-skyline" viewBox="0 0 560 220" aria-hidden="true">
          <rect x="10" y="120" width="46" height="100" rx="6" fill="#FFB02033"/>
          <rect x="64" y="80" width="54" height="140" rx="6" fill="#FF4D6D33"/>
          <rect x="126" y="130" width="40" height="90" rx="6" fill="#38D9A933"/>
          <rect x="174" y="60" width="60" height="160" rx="6" fill="#4DABF744"/>
          <rect x="242" y="110" width="48" height="110" rx="6" fill="#F783AC33"/>
          <rect x="298" y="90" width="56" height="130" rx="6" fill="#B197FC44"/>
          <rect x="362" y="140" width="42" height="80" rx="6" fill="#A9E34B33"/>
          <rect x="412" y="70" width="58" height="150" rx="6" fill="#FFE06633"/>
          <rect x="478" y="120" width="50" height="100" rx="6" fill="#FF7A5933"/>
          <g fill="#EEF2FF" opacity="0.55">
            <rect x="82" y="100" width="6" height="6" rx="1"/><rect x="98" y="100" width="6" height="6" rx="1"/>
            <rect x="82" y="120" width="6" height="6" rx="1"/><rect x="192" y="80" width="6" height="6" rx="1"/>
            <rect x="210" y="80" width="6" height="6" rx="1"/><rect x="192" y="100" width="6" height="6" rx="1"/>
            <rect x="210" y="120" width="6" height="6" rx="1"/><rect x="316" y="110" width="6" height="6" rx="1"/>
            <rect x="332" y="110" width="6" height="6" rx="1"/><rect x="316" y="130" width="6" height="6" rx="1"/>
            <rect x="430" y="90" width="6" height="6" rx="1"/><rect x="446" y="90" width="6" height="6" rx="1"/>
            <rect x="430" y="110" width="6" height="6" rx="1"/>
          </g>
        </svg>
        <div class="hero-top">
          <div class="hero-icon">${svgIcon('notebook', 40, '#06223A', 1.8)}</div>
          <div class="hero-titles">
            <h1>مراجعة اليوم</h1>
            <div class="hero-sub">كلمات وجمل حياة — <b>لا أكاديمية</b>، وخطوات واضحة بين الشارعي والرسمي</div>
          </div>
        </div>
        <div class="stats">
          <div class="stat stat-known">
            ${ringIcon(known / (scope.length || 1), '#38D9A9')}
            <div><div class="stat-num" data-stat="known">${known}</div><div class="stat-label">معروفة</div></div>
          </div>
          <div class="stat stat-due">
            ${ringIcon(due / (scope.length || 1), '#FFB020')}
            <div><div class="stat-num" data-stat="today">${due}</div><div class="stat-label">في اليومية</div></div>
          </div>
          <div class="stat stat-total">
            ${ringIcon(1, '#38BDF8')}
            <div><div class="stat-num" data-stat="total">${total}</div><div class="stat-label">إجمالي البطاقات</div></div>
          </div>
        </div>
        <div class="hero-scope">${scope.length} بطاقة في النطاق الحالي${scopeDesc}</div>
      </section>`;

    const modeBtn = (val, label, icon) =>
      '<button class="seg" type="button" data-mode="' + val + '" aria-pressed="' +
      (settings.mode === val) + '">' + svgIcon(icon, 24, 'currentColor') + label + '</button>';

    const levelBtn = (val, label) =>
      '<button class="seg" type="button" data-level="' + val + '" aria-pressed="' +
      (settings.level === val) + '">' +
      (val === 'all' ? svgIcon('reset', 24, 'currentColor') : levelBars(val)) + label + '</button>';

    const controls = `
      <section class="panel">
        <div class="ctl-row">
          <div class="ctl-label">الوضع</div>
          <div class="ctl-opts">
            ${modeBtn('new', 'جديدة', 'star')}
            ${modeBtn('today', 'اليومية', 'calendar')}
          </div>
        </div>
        <div class="ctl-row">
          <div class="ctl-label">المستوى</div>
          <div class="ctl-opts">
            ${levelBtn('all', 'الكل')}
            ${levelBtn('easy', 'سهل')}
            ${levelBtn('medium', 'متوسط')}
            ${levelBtn('hard', 'صعب')}
          </div>
        </div>
      </section>`;

    const tones = '<section class="tones">' +
      CFG.TONE_ORDER.map(toneChip).join('') + '</section>';

    const grid = `
      <section style="display:flex;flex-direction:column;gap:16px">
        <div class="sec-head">
          <div class="sec-title">الفئات</div>
          <div class="sec-sub">اختر حيًّا من المدينة</div>
        </div>
        <div class="cat-grid">
          <button class="cat-all" type="button" data-cat="all" aria-label="كل الفئات">
            <span class="cat-all-icon">${svgIcon('grid', 28, '#04263B')}</span>
            <span class="cat-all-name">الكل</span>
            <span class="cat-dots">${catDots}</span>
          </button>
          ${CATS.map(catCard).join('')}
        </div>
      </section>`;

    const start = `<button class="start-btn" type="button" id="startBtn">
      <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="#04263B"><path d="M8 5v14l11-7z"/></svg>
      ابدأ المراجعة</button>`;

    const footer = `
      <footer class="foot">
        <div class="foot-note">المصدر الوحيد: <b>library/content-data.json</b> (أعد التشغيل بـ <b>tools/build.py</b>)</div>
        <button class="ghost-btn" type="button" id="resetBtn">
          ${svgIcon('reset', 16, '#C8D3F2', 2.2)} بدء جديد — مواصفات اليومية والعلامات
        </button>
      </footer>`;

    document.getElementById('app').innerHTML =
      '<div class="shell">' + hero + controls + tones + grid + start + footer + '</div>';

    bindHome();
  }

  function hexA(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function bindHome() {
    $$('[data-mode]').forEach(b => b.addEventListener('click', () => {
      settings.mode = b.dataset.mode; saveSettings(); renderHome();
    }));
    $$('[data-level]').forEach(b => b.addEventListener('click', () => {
      settings.level = b.dataset.level; saveSettings(); renderHome();
    }));
    $$('.tone').forEach(b => b.addEventListener('click', () => {
      const t = b.dataset.tone;
      const i = settings.tones.indexOf(t);
      if (i === -1) settings.tones.push(t); else settings.tones.splice(i, 1);
      saveSettings(); renderHome();
    }));
    $$('.cat-card, .cat-all').forEach(b => b.addEventListener('click', () => {
      settings.cat = b.dataset.cat; saveSettings();
      location.hash = '#/study/' + b.dataset.cat;
    }));
    const startBtn = $('#startBtn');
    if (startBtn) startBtn.addEventListener('click', () => {
      const n = scopedCards().length;
      if (!n) {
        toast('لا توجد بطاقات مطابقة لهذه الإعدادات — غيّر الوضع أو المستوى.');
        return;
      }
      location.hash = '#/study/' + settings.cat;
    });
    const resetBtn = $('#resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      openDialog({
        title: 'بدء جديد؟',
        body: 'سيُمسح تقدّمك المحفوظ (العلامة والصندوق وموعد المراجعة لكل بطاقة) ' +
              'وتُعاد إعدادات اليومية والعلامات إلى الافتراضي. لا يمكن التراجع.',
        confirmLabel: 'امسح التقدّم',
        danger: true,
        onConfirm: () => {
          progress = {};
          saveProgress();
          settings = Object.assign({}, DEFAULT_SETTINGS);
          saveSettings();
          renderHome();
          toast('تم مسح التقدّم');
        }
      });
    });
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
    const title = cat === 'all' ? 'كل الفئات' : catName(cat);

    document.title = title + ' — مراجعة اليوم';
    const root = document.getElementById('app');
    root.innerHTML =
      '<div class="study-page" style="--cat:' + color + ';--cat-soft:' + hexA(color, .22) + '">' +
      '<div class="study-inner">' +
        '<div class="study-top">' +
          '<button class="icon-btn" type="button" id="backBtn" aria-label="رجوع إلى الفئات">' +
            svgIcon('back', 22, 'currentColor') + '</button>' +
          '<h1 class="study-title">' + esc(title) + '</h1>' +
          '<div class="speed-ctrl" id="speedCtrl" role="group" aria-label="سرعة النطق">' +
            SPEED_OPTIONS.map(s =>
              '<button class="speed-seg" type="button" data-speed="' + s.value + '" aria-pressed="' +
              (Number(settings.audioSpeed || 1) === s.value) + '">' + s.label + '</button>').join('') +
          '</div>' +
        '</div>' +
        '<div class="study-progress">' +
          '<div class="pbar"><div class="pbar-fill" id="pbarFill" style="width:0%"></div></div>' +
          '<div class="pmeta"><span id="progressLabel">0 / 0</span><span id="progressLeft"></span></div>' +
        '</div>' +
        '<div class="scene-card" id="sceneCard" style="border-color:' + color + '"></div>' +
        '<div class="study-main">' +
          '<div id="studyBody"></div>' +
          '<div class="keys">' +
            '<span><kbd>مسافة</kbd> اقلب البطاقة</span>' +
            '<span><kbd>1</kbd> لم أعرفها</span>' +
            '<span><kbd>2</kbd> صعبة</span>' +
            '<span><kbd>3</kbd> عرفتها</span>' +
            '<span><kbd>←</kbd><kbd>→</kbd> تنقّل</span>' +
          '</div>' +
        '</div>' +
      '</div></div>';

    // scene
    const sceneFn = SCENES[cat] || SCENES.all;
    $('#sceneCard').innerHTML =
      '<svg viewBox="0 0 350 236" role="img" aria-label="صورة توضيحية لـ ' + esc(title) + '">' +
      sceneFn(color) + '</svg>';

    $('#backBtn').addEventListener('click', () => {
      location.hash = '#/';
    });

    $$('[data-speed]').forEach(b => b.addEventListener('click', () => {
      settings.audioSpeed = Number(b.dataset.speed);
      saveSettings();
      $$('[data-speed]').forEach(x =>
        x.setAttribute('aria-pressed', String(Number(x.dataset.speed) === settings.audioSpeed)));
      // replay the current word so the new speed is audible straight away
      if (session.cur) speak(session.cur.front, session.cur.id);
    }));

    buildQueue(cat);
    session.idx = 0; session.flipped = false;
    session.counts = { know: 0, hard: 0, miss: 0 };
    session.rated = [];

    if (!session.queue.length) {
      renderEmpty();
      return;
    }
    renderCard();
  }

  function buildQueue(cat) {
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
      // "Today" mode with nothing due yet. Rather than leave the page dead,
      // fall back to the unseen cards in scope, then to anything already seen.
      const unseen = base.filter(c => !progOf(c.id));
      q = unseen.length ? unseen : base;
    }
    session.queue = q;
  }

  function renderEmpty() {
    $('#studyBody').innerHTML =
      '<div class="empty">' +
        '<div class="empty-title">لا توجد بطاقات هنا الآن</div>' +
        '<div class="empty-sub">كل بطاقات هذه الفئة مراجَعة، أو الإعدادات الحالية تُخرجها من النطاق. ' +
        'جرّب «اليومية» أو غيّر المستوى.</div>' +
        '<button class="btn-ghost" type="button" id="emptyBack" style="min-height:48px;border-radius:16px;padding:0 18px;font-weight:600;cursor:pointer">رجوع للفئات</button>' +
      '</div>';
    $('#emptyBack').addEventListener('click', () => { location.hash = '#/'; });
  }

  function renderCard() {
    const c = session.queue[session.idx];
    if (!c) { showSummary(); return; }
    session.cur = c;
    session.flipped = false;

    const tone = c.label;
    const toneColor = CFG.TONE_COLOR[tone] || CFG.TONE_COLOR.neutral;
    const toneLabel = CFG.TONE_LABEL[tone] || 'محايد';
    const levelLabel = CFG.LEVEL_LABEL[c.level] || c.level;
    const color = catColor(c.cat);

    const front =
      '<div class="flip-face flip-front">' +
        '<div class="card-zh">' + esc(c.front) + '</div>' +
        (c.py ? '<div class="card-py">' + esc(c.py) + '</div>' : '') +
        '<div class="card-hint">اضغط على البطاقة لكشف المعنى</div>' +
      '</div>';
    const back =
      '<div class="flip-face flip-back">' +
        '<div class="card-zh">' + esc(c.front) + '</div>' +
        (c.py ? '<div class="card-py">' + esc(c.py) + '</div>' : '') +
        '<div class="card-div"></div>' +
        '<div class="card-ar">' + esc(c.ar) + '</div>' +
        (c.note ? '<div class="card-note">' + esc(c.note) + '</div>' : '') +
        '<button class="sound-btn" type="button" id="soundBtn" aria-label="استمع للنطق">' +
          svgIcon('sound', 24, 'currentColor') + '</button>' +
      '</div>';

    const body =
      '<div class="badges">' +
        '<span class="badge" style="border-color:' + toneColor + ';color:' + toneColor + ';background:' + hexA(toneColor, .1) + '">' +
          toneLabel + '</span>' +
        '<span class="badge badge-level">' + levelLabel + '</span>' +
      '</div>' +
      '<div class="flip-wrap"><div class="flip-card" id="flipCard" role="button" tabindex="0" ' +
        'aria-label="بطاقة المراجعة — اضغط للقلب">' + front + back + '</div></div>' +
      '<div class="nav-row">' +
        '<button class="nav-btn" type="button" data-nav="prev" aria-label="الكلمة السابقة">' +
          svgIcon('back', 22, 'currentColor') + '<span>السابقة</span></button>' +
        '<button class="nav-btn" type="button" data-nav="next" aria-label="الكلمة التالية">' +
          '<span>التالية</span>' + svgIcon('next', 22, 'currentColor') + '</button>' +
      '</div>' +
      '<div class="rating-row">' +
        '<button class="rate rate-miss" type="button" data-rate="miss">لم أعرفها</button>' +
        '<button class="rate rate-hard" type="button" data-rate="hard">صعبة</button>' +
        '<button class="rate rate-know" type="button" data-rate="know">عرفتها</button>' +
      '</div>';

    $('#studyBody').innerHTML = body;

    const card = $('#flipCard');
    const doFlip = () => {
      session.flipped = !session.flipped;
      card.classList.toggle('flipped', session.flipped);
    };
    card.addEventListener('click', doFlip);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doFlip(); }
    });

    $('#soundBtn').addEventListener('click', e => {
      e.stopPropagation();
      speak(c.front, c.id);
    });

    $$('[data-rate]').forEach(b => b.addEventListener('click', () => rate(b.dataset.rate)));

    $$('[data-nav]').forEach(b => b.addEventListener('click', () => {
      gotoCard(session.idx + (b.dataset.nav === 'next' ? 1 : -1));
    }));

    updateProgressUI();
  }

  /* Move to a card in the current queue without grading it. Clamps at both
     ends so the buttons (and the arrow keys) can never run off the queue. */
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
    const n = session.idx;
    $('#progressLabel').textContent = n + ' / ' + total;
    $('#pbarFill').style.width = (total ? (n / total * 100) : 0) + '%';
    const left = Math.max(0, total - n);
    $('#progressLeft').textContent =
      (settings.mode === 'new' ? 'جديدة' : 'اليومية') + ': ' + left + ' متبقاة';
    updateNavUI();
  }

  /* Grey out the nav buttons when there is nowhere to go. */
  function updateNavUI() {
    const prev = $('[data-nav="prev"]');
    const next = $('[data-nav="next"]');
    const total = session.queue.length;
    if (prev) {
      const off = session.idx <= 0;
      prev.classList.toggle('at-edge', off);
      prev.disabled = off;
    }
    if (next) {
      const off = session.idx >= total - 1;
      next.classList.toggle('at-edge', off);
      next.disabled = off;
    }
  }

  /* ---------------- rating / Leitner ---------------- */
  function rate(kind) {
    const c = session.cur;
    if (!c) return;
    const prev = progOf(c.id) || { status: 'new', box: 0, seen: 0, correct: 0 };
    let box = prev.box || 0;

    if (kind === 'know') {
      box = Math.min(5, box + 1);
      session.counts.know++;
    } else if (kind === 'hard') {
      box = Math.max(1, box);          // stays in the same box
      session.counts.hard++;
    } else {
      box = 1;                          // back to box 1
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
    const C = 2 * Math.PI * 44;
    const body =
      '<div class="summary">' +
        '<h2>انتهت الجولة</h2>' +
        '<div class="summary-ring">' +
          '<svg width="108" height="108" viewBox="0 0 108 108" aria-hidden="true">' +
            '<circle cx="54" cy="54" r="44" fill="none" stroke="#27325C" stroke-width="9"/>' +
            '<circle cx="54" cy="54" r="44" fill="none" stroke="#38D9A9" stroke-width="9" ' +
            'stroke-linecap="round" stroke-dasharray="' + (C * pct / 100).toFixed(1) + ' ' + C.toFixed(1) + '" ' +
            'transform="rotate(-90 54 54)"/>' +
          '</svg>' +
          '<div class="summary-ring-txt"><div class="summary-pct">' + pct + '%</div>' +
          '<div class="summary-lbl">إتقان</div></div>' +
        '</div>' +
        '<div class="summary-rows">' +
          '<div class="summary-row"><span>عرفتها</span><b style="color:#38D9A9">' + session.counts.know + '</b></div>' +
          '<div class="summary-row"><span>صعبة</span><b style="color:#A3B1D9">' + session.counts.hard + '</b></div>' +
          '<div class="summary-row"><span>لم أعرفها</span><b style="color:#FF4D6D">' + session.counts.miss + '</b></div>' +
        '</div>' +
        '<div class="summary-actions">' +
          '<button class="btn-ghost" type="button" id="againBtn">أعد الجولة</button>' +
          '<button class="btn-primary" type="button" id="backCatsBtn">رجوع للفئات</button>' +
        '</div>' +
      '</div>';
    $('#studyBody').innerHTML = body;
    $('#againBtn').addEventListener('click', () => {
      const cat = location.hash.replace('#/study/', '') || 'all';
      renderStudy(cat);
    });
    $('#backCatsBtn').addEventListener('click', () => { location.hash = '#/'; });
    updateProgressUI();
  }

  /* ---------------- speech ---------------- */
  let voicesReady = false;
  function speak(text, cardId) {
    const btn = $('#soundBtn');
    // Recorded MP3 first when we have one for this card — it is the
    // natural Chinese voice and needs no TTS support.
    if (cardId && playRecorded(cardId)) {
      if (btn) {
        btn.classList.add('speaking');
        setTimeout(() => btn.classList.remove('speaking'), 900);
      }
      return;
    }
    if (!('speechSynthesis' in window)) { toast('متصفحك لا يدعم النطق'); return; }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.rate = Number(settings.audioSpeed) || 1;
      const v = pickChineseVoice();
      if (v) u.voice = v;
      if (btn) btn.classList.add('speaking');
      u.onend = u.onerror = () => { if (btn) btn.classList.remove('speaking'); };
      window.speechSynthesis.speak(u);
    } catch (e) { /* speech unavailable — nothing else to try */ }
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

  /* ---------------- audio (recorded mp3) ---------------- */
  function playRecorded(id) {
    if (!AUDIO[id]) return false;
    try {
      const a = new Audio(AUDIO[id]);
      a.playbackRate = Number(settings.audioSpeed) || 1;
      a.play().catch(() => {});
      return true;
    } catch (e) { return false; }
  }

  /* ---------------- dialog ---------------- */
  function openDialog(opts) {
    const backdrop = document.createElement('div');
    backdrop.className = 'dlg-backdrop';
    backdrop.innerHTML =
      '<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgTitle">' +
        '<h3 id="dlgTitle">' + esc(opts.title) + '</h3>' +
        '<p>' + esc(opts.body) + '</p>' +
        '<div class="dlg-actions">' +
          '<button class="btn-ghost" type="button" id="dlgCancel">إلغاء</button>' +
          '<button class="' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" type="button" id="dlgOk">' +
            esc(opts.confirmLabel || 'تأكيد') + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(backdrop);
    const close = () => { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); };
    $('#dlgCancel').addEventListener('click', close);
    $('#dlgOk').addEventListener('click', () => { close(); if (opts.onConfirm) opts.onConfirm(); });
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', function esc2(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc2); }
    });
    $('#dlgOk').focus();
  }

  /* ---------------- toast ---------------- */
  let toastTimer = null;
  function toast(msg) {
    const old = $('.toast');
    if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 3200);
  }

  /* ---------------- keyboard shortcuts (desktop) ---------------- */
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
      const dir = e.key === 'ArrowLeft' ? 1 : -1;   // RTL: left arrow = next
      gotoCard(session.idx + dir);
    }
  });

  /* ---------------- router ---------------- */
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

  /* ---------------- boot ---------------- */
  loadSettings();
  loadProgress();
  route();
})();
