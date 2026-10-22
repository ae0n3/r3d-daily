/* ============================================================
   R3D Daily Review — shared configuration
   Category colors, Arabic names, and register (tone) maps.
   Loaded BEFORE scenes.js and daily.js.
   ============================================================ */
(function (global) {
  'use strict';

  /* One color per category — used for the gradient background,
     borders, buttons, and the category's illustrated scene. */
  const CAT_COLOR = {
    greetings: '#FFB020',
    questions: '#66D9E8',
    numbers:  '#748FFC',
    food:     '#FF7A59',
    emergency:'#FF4D6D',
    phone:    '#38D9A9',
    shopping: '#F783AC',
    hotel:    '#C9A66B',
    transport:'#A9E34B',
    polite:   '#FFE066',
    advanced: '#B197FC',
    general:  '#4DABF7'
  };

  /* Fallback Arabic names — library/content-data.json wins when present. */
  const CAT_AR = {
    greetings: 'التحيات والتعارف',
    questions: 'الأسئلة الأساسية',
    numbers:  'الأرقام والوقت',
    food:     'الأكل والمطعم',
    emergency:'الطوارئ والصحة',
    phone:    'الهاتف والإنترنت',
    shopping: 'التسوق والأسعار',
    hotel:    'الفندق والسكن',
    transport:'المواصلات والتنقل',
    polite:   'المجاملات والشكر',
    advanced: 'متقدم وعامية',
    general:  'مفردات عامة',
    all:      'كل الفئات'
  };

  /* Register (source/use) colors. "academic" in the library == "formal" in the UI. */
  const TONE_COLOR = { street: '#FF7A59', academic: '#4DABF7', neutral: '#38D9A9' };
  const TONE_LABEL = { street: 'شارعي', academic: 'رسمي', neutral: 'محايد' };
  const TONE_DESC  = { street: 'يومي في الشارع والمتجر', academic: 'للعمل والمدرسة', neutral: 'كل مكان' };
  const TONE_ORDER = ['street', 'academic', 'neutral'];

  const LEVEL_LABEL = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' };
  const LEVEL_ORDER = ['easy', 'medium', 'hard'];

  /* Leitner boxes — 5 boxes, day interval per box. */
  const BOX_INTERVAL = [0, 1, 3, 7, 14, 30];

  /* Pronunciation speed presets. The value is used both for the recorded MP3
     (HTMLMediaElement.playbackRate) and for the TTS fallback (utterance.rate).
     Keep `value` and `label` in sync — `value` is what gets persisted. */
  const AUDIO_SPEEDS = [
    { value: 0.75, label: '0.75×' },
    { value: 1,    label: '1×' },
    { value: 1.25, label: '1.25×' }
  ];
  const DEFAULT_AUDIO_SPEED = 1;

  const STORAGE = {
    progress: 'review-progress-v1',   /* spec key */
    legacy:   'r3d-daily-prog-v1',    /* pre-1.0 key — migrated, never deleted on load */
    settings: 'r3d-daily-state-v1',
    start:    'r3d-daily-start'
  };

  global.R3D_CONFIG = {
    CAT_COLOR, CAT_AR, TONE_COLOR, TONE_LABEL, TONE_DESC, TONE_ORDER,
    LEVEL_LABEL, LEVEL_ORDER, BOX_INTERVAL, STORAGE,
    AUDIO_SPEEDS, DEFAULT_AUDIO_SPEED
  };
})(window);
