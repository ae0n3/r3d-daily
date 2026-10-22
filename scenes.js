/* ============================================================
   R3D Daily Review — category scenes
   One custom SVG illustration per category, drawn in that
   category's color.  Each scene fills a 350 x 236 viewBox.
   R3D_SCENES[categoryId](color) -> svg markup string
   ============================================================ */
(function (global) {
  'use strict';

  const C = global.R3D_CONFIG.CAT_COLOR;
  const CN = "'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif";

  /* ---------- shared building blocks ---------- */

  // A row of simple dark buildings with lit windows.
  function skyline(w, h, y, color, seed) {
    let s = '<g fill="#0C1128">';
    let x = 0, i = 0;
    const widths = [34, 22, 28, 20, 30, 24, 26, 18, 30, 22];
    while (x < w) {
      const bw = widths[(seed + i) % widths.length];
      const bh = 26 + ((seed * 7 + i * 13) % 46);
      s += '<rect x="' + x + '" y="' + (y - bh) + '" width="' + (bw - 3) + '" height="' + bh + '" rx="2"/>';
      x += bw; i++;
    }
    s += '</g>';
    // lit windows
    s += '<g fill="' + color + '">';
    x = 0; i = 0;
    while (x < w) {
      const bw = widths[(seed + i) % widths.length];
      const bh = 26 + ((seed * 7 + i * 13) % 46);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if ((i * 7 + r * 3 + c) % 4 === 0) continue;
          s += '<rect x="' + (x + 5 + c * 8) + '" y="' + (y - bh + 8 + r * 12) + '" width="3.5" height="4.5" rx="1" opacity="' + (0.35 + ((i + r) % 3) * 0.2) + '"/>';
        }
      }
      x += bw; i++;
    }
    s += '</g>';
    return s;
  }

  // A rounded speech bubble, optionally with a tail.
  function bubble(x, y, w, h, fill, stroke, text, textColor, fontSize) {
    let s = '<g>';
    s += '<path d="M' + (x + 14) + ' ' + y + ' h' + (w - 28) + ' a14 14 0 0 1 14 14 v' + (h - 28) +
         ' a14 14 0 0 1 -14 14 h' + (-(w - 28) - 8) + ' l-11 11 v-11 h' + (8 - 14) + ' a14 14 0 0 1 -14 -14 v' + (-(h - 28)) +
         ' a14 14 0 0 1 14 -14 z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2" stroke-linejoin="round"/>';
    if (text) {
      s += '<text x="' + (x + w / 2) + '" y="' + (y + h / 2) + '" text-anchor="middle" dominant-baseline="central" ' +
           'font-family="' + CN + '" font-size="' + fontSize + '" font-weight="700" fill="' + textColor + '">' + text + '</text>';
    }
    s += '</g>';
    return s;
  }

  // A simple person silhouette. x = center, y = feet line, h = height.
  function person(x, y, h, color, opts) {
    opts = opts || {};
    const headR = h * 0.13;
    const headY = y - h + headR;
    const bodyTop = headY + headR * 1.5;
    const bodyH = h * 0.46;
    const bw = h * 0.20;
    let s = '<g>';
    s += '<circle cx="' + x + '" cy="' + headY + '" r="' + headR + '" fill="' + (opts.head || color) + '"/>';
    s += '<path d="M' + (x - bw / 2) + ' ' + bodyTop + ' h' + bw + ' v' + bodyH + ' h' + (-bw) + ' z" fill="' + color + '"/>';
    s += '<path d="M' + (x - bw / 2) + ' ' + (bodyTop + 6) + ' h' + (-h * 0.16) + ' v' + (h * 0.10) + ' h' + (h * 0.16) + ' z" fill="' + color + '"/>';
    s += '<path d="M' + (x + bw / 2) + ' ' + (bodyTop + 6) + ' h' + (h * 0.16) + ' v' + (h * 0.10) + ' h' + (-h * 0.16) + ' z" fill="' + color + '"/>';
    s += '<path d="M' + (x - bw * 0.32) + ' ' + (bodyTop + bodyH) + ' h' + (bw * 0.28) + ' v' + (h * 0.20) + ' h' + (-bw * 0.28) + ' z" fill="' + color + '" opacity="0.8"/>';
    s += '<path d="M' + (x + bw * 0.04) + ' ' + (bodyTop + bodyH) + ' h' + (bw * 0.28) + ' v' + (h * 0.20) + ' h' + (-bw * 0.28) + ' z" fill="' + color + '" opacity="0.8"/>';
    s += '</g>';
    return s;
  }

  function stars(n, w, h, color) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = 12 + ((i * 79) % (w - 24));
      const y = 10 + ((i * 53) % (h * 0.7));
      const r = 0.8 + ((i * 7) % 3) * 0.45;
      s += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + color + '" opacity="' + (0.3 + ((i % 4) * 0.16)).toFixed(2) + '"/>';
    }
    return s;
  }

  /* ---------- the twelve scenes ---------- */

  // 1. Greetings — orange sunrise over a dark skyline, two people greeting.
  function greetings(c) {
    let s = '<defs><linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#241A3E"/><stop offset="0.55" stop-color="#7A3A2E"/>' +
      '<stop offset="1" stop-color="' + c + '"/></linearGradient>' +
      '<radialGradient id="g-sun"><stop offset="0" stop-color="#FFE9A8"/>' +
      '<stop offset="0.55" stop-color="' + c + '"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></radialGradient></defs>';
    s += '<rect width="350" height="236" fill="url(#g-sky)"/>';
    s += '<circle cx="175" cy="150" r="86" fill="url(#g-sun)"/>';
    s += '<circle cx="175" cy="150" r="30" fill="#FFD98A" opacity="0.95"/>';
    s += skyline(350, 236, 176, c, 3);
    s += '<rect x="0" y="176" width="350" height="60" fill="#0B1026"/>';
    s += '<rect x="0" y="176" width="350" height="3" fill="' + c + '" opacity="0.5"/>';
    // two people, one reaching out to shake hands
    s += person(122, 218, 78, '#0A0F1F', { head: '#12183A' });
    s += person(228, 218, 76, '#0A0F1F', { head: '#12183A' });
    // handshake arms
    s += '<g stroke="' + c + '" stroke-width="6" stroke-linecap="round" fill="none">' +
         '<path d="M148 168 l16 9"/><path d="M202 168 l-16 9"/></g>';
    s += '<circle cx="175" cy="177" r="7" fill="' + c + '"/>';
    // speech bubbles
    s += bubble(38, 34, 86, 44, '#101A38', c, '你好', '#EEF2FF', 24);
    s += bubble(226, 26, 86, 44, '#101A38', c, '您好', '#EEF2FF', 24);
    return s;
  }

  // 2. Questions — dark teal, dot grid, floating question marks, big bubble 什么？
  function questions(c) {
    let s = '<defs><linearGradient id="q-bg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#0C2A30"/><stop offset="1" stop-color="#0A0F1F"/></linearGradient></defs>';
    s += '<rect width="350" height="236" fill="url(#q-bg)"/>';
    // dot grid
    s += '<g fill="' + c + '" opacity="0.20">';
    for (let r = 0; r < 8; r++) {
      for (let cIdx = 0; cIdx < 15; cIdx++) {
        s += '<circle cx="' + (16 + cIdx * 22) + '" cy="' + (14 + r * 30) + '" r="1.6"/>';
      }
    }
    s += '</g>';
    // floating question marks
    const marks = [[44, 52, 22, 0.35], [300, 46, 26, 0.3], [58, 176, 18, 0.28], [292, 182, 20, 0.32], [166, 26, 15, 0.25]];
    for (const m of marks) {
      s += '<text x="' + m[0] + '" y="' + m[1] + '" font-family="' + CN + '" font-size="' + m[2] +
           '" font-weight="700" fill="' + c + '" opacity="' + m[3] + '" text-anchor="middle">?</text>';
    }
    // big central bubble
    s += bubble(88, 78, 174, 88, '#0E3740', c, '什么？', '#EEF2FF', 38);
    return s;
  }

  // 3. Numbers & time — big clock with hands and ticks, floating numerals.
  function numbers(c) {
    let s = '<defs><radialGradient id="n-bg"><stop offset="0" stop-color="#1B2258"/>' +
      '<stop offset="1" stop-color="#0A0F1F"/></radialGradient></defs>';
    s += '<rect width="350" height="236" fill="url(#n-bg)"/>';
    s += stars(24, 350, 236, c);
    // floating numerals at 30% opacity: [glyph, x, y, fontSize]
    const nums = [['一', 44, 44, 26], ['二', 292, 52, 22], ['三', 40, 190, 24], ['四', 300, 186, 26]];
    for (const n of nums) {
      s += '<text x="' + n[1] + '" y="' + n[2] + '" font-family="' + CN + '" font-size="' + n[3] +
           '" font-weight="700" fill="' + c + '" opacity="0.3" text-anchor="middle">' + n[0] + '</text>';
    }
    // clock
    const cx = 175, cy = 118, R = 66;
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 12) + '" fill="' + c + '" opacity="0.10"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="#0E1633" stroke="' + c + '" stroke-width="5"/>';
    // ticks
    s += '<g stroke="' + c + '" stroke-linecap="round">';
    for (let i = 0; i < 12; i++) {
      const a = (i * 30) * Math.PI / 180;
      const r1 = R - 12, r2 = R - (i % 3 === 0 ? 24 : 18);
      s += '<line x1="' + (cx + Math.sin(a) * r1).toFixed(1) + '" y1="' + (cy - Math.cos(a) * r1).toFixed(1) +
           '" x2="' + (cx + Math.sin(a) * r2).toFixed(1) + '" y2="' + (cy - Math.cos(a) * r2).toFixed(1) +
           '" stroke-width="' + (i % 3 === 0 ? 3.4 : 2) + '" opacity="' + (i % 3 === 0 ? 0.95 : 0.55) + '"/>';
    }
    s += '</g>';
    // hands  (10:08)
    s += '<g stroke="' + c + '" stroke-linecap="round" fill="none">';
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + 24) + '" y2="' + (cy - 30) + '" stroke-width="5"/>';
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx - 38) + '" y2="' + (cy - 16) + '" stroke-width="4"/>';
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + 8) + '" y2="' + (cy + 36) + '" stroke-width="2.4" opacity="0.7"/>';
    s += '</g>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="' + c + '"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="2.4" fill="#0A0F1F"/>';
    return s;
  }

  // 4. Food & restaurant — table from above, noodle bowl, chopsticks, tea cup, lantern.
  function food(c) {
    let s = '<defs><linearGradient id="f-bg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#3A1A18"/><stop offset="1" stop-color="#0A0F1F"/></linearGradient>' +
      '<radialGradient id="f-lant"><stop offset="0" stop-color="#FF8A6B"/><stop offset="1" stop-color="#D8342B"/></radialGradient></defs>';
    s += '<rect width="350" height="236" fill="url(#f-bg)"/>';
    // hanging red lantern
    s += '<line x1="292" y1="0" x2="292" y2="40" stroke="' + c + '" stroke-width="2" opacity="0.6"/>';
    s += '<ellipse cx="292" cy="58" rx="21" ry="25" fill="url(#f-lant)"/>';
    s += '<rect x="280" y="80" width="24" height="6" rx="2" fill="#E8A33C"/>';
    s += '<rect x="280" y="31" width="24" height="6" rx="2" fill="#E8A33C"/>';
    s += '<line x1="292" y1="86" x2="292" y2="106" stroke="#E8A33C" stroke-width="2.4"/>';
    // round table (from above)
    s += '<circle cx="150" cy="132" r="88" fill="#241522" stroke="' + c + '" stroke-width="3" opacity="0.95"/>';
    s += '<circle cx="150" cy="132" r="76" fill="none" stroke="' + c + '" stroke-width="1.4" opacity="0.35"/>';
    // noodle bowl
    s += '<circle cx="140" cy="140" r="42" fill="#0E1633" stroke="' + c + '" stroke-width="3.4"/>';
    s += '<circle cx="140" cy="140" r="33" fill="' + c + '" opacity="0.16"/>';
    s += '<g stroke="#F3E3C3" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.9">';
    s += '<path d="M120 138 q10 -9 20 0 q10 9 20 0 q10 -9 20 0"/>';
    s += '<path d="M124 150 q9 -8 18 0 q9 8 18 0"/>';
    s += '</g>';
    // rising steam
    s += '<g stroke="' + c + '" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.7">';
    s += '<path d="M126 92 c-7 -10 7 -16 0 -26"/>';
    s += '<path d="M140 86 c-7 -10 7 -16 0 -28"/>';
    s += '<path d="M154 92 c-7 -10 7 -16 0 -26"/>';
    s += '</g>';
    // chopsticks
    s += '<g stroke="#E3C08A" stroke-width="4" stroke-linecap="round">';
    s += '<line x1="186" y1="96" x2="212" y2="150"/>';
    s += '<line x1="196" y1="92" x2="222" y2="146"/>';
    s += '</g>';
    // tea cup
    s += '<circle cx="66" cy="170" r="20" fill="#0E1633" stroke="' + c + '" stroke-width="2.6"/>';
    s += '<circle cx="66" cy="170" r="12" fill="' + c + '" opacity="0.35"/>';
    s += '<path d="M86 166 a9 9 0 0 1 0 10" stroke="' + c + '" stroke-width="2.4" fill="none"/>';
    // steam from cup
    s += '<g stroke="' + c + '" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.5">';
    s += '<path d="M60 144 c-5 -8 5 -12 0 -20"/>';
    s += '<path d="M72 146 c-5 -8 5 -12 0 -18"/>';
    s += '</g>';
    return s;
  }

  // 5. Emergency & health — ambulance, pulsing light, glowing cross, ECG line.
  function emergency(c) {
    let s = '<defs><linearGradient id="e-bg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#3A1024"/><stop offset="1" stop-color="#0A0F1F"/></linearGradient>' +
      '<filter id="e-glow" x="-60%" y="-60%" width="220%" height="220%">' +
      '<feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="e-pulse" x="-60%" y="-60%" width="220%" height="220%">' +
      '<feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
    s += '<rect width="350" height="236" fill="url(#e-bg)"/>';
    // road
    s += '<rect x="0" y="188" width="350" height="48" fill="#0B1026"/>';
    s += '<g stroke="' + c + '" stroke-width="3" opacity="0.35"><line x1="10" y1="212" x2="54" y2="212"/>' +
         '<line x1="78" y1="212" x2="122" y2="212"/><line x1="146" y1="212" x2="190" y2="212"/>' +
         '<line x1="214" y1="212" x2="258" y2="212"/><line x1="282" y1="212" x2="326" y2="212"/></g>';
    // glowing medical cross
    s += '<g filter="url(#e-glow)" opacity="0.92">' +
         '<path d="M64 26 h18 v18 h18 v18 h-18 v18 h-18 v-18 h-18 v-18 h18 z" fill="' + c + '"/></g>';
    // ambulance (side view)
    s += '<g>';
    s += '<rect x="150" y="112" width="140" height="56" rx="8" fill="#0E1633" stroke="' + c + '" stroke-width="3"/>';
    s += '<path d="M290 140 l26 22 v6 h-26 z" fill="#0E1633" stroke="' + c + '" stroke-width="3" stroke-linejoin="round"/>';
    s += '<path d="M292 144 l20 18 h-20 z" fill="' + c + '" opacity="0.35"/>';
    s += '<rect x="158" y="120" width="34" height="22" rx="4" fill="' + c + '" opacity="0.3"/>';
    s += '<rect x="200" y="120" width="34" height="22" rx="4" fill="' + c + '" opacity="0.3"/>';
    // cross on the side
    s += '<path d="M252 130 h9 v9 h9 v9 h-9 v9 h-9 v-9 h-9 v-9 h9 z" fill="' + c + '"/>';
    // wheels
    s += '<circle cx="182" cy="170" r="15" fill="#0A0F1F" stroke="' + c + '" stroke-width="3"/>';
    s += '<circle cx="182" cy="170" r="5" fill="' + c + '"/>';
    s += '<circle cx="288" cy="170" r="15" fill="#0A0F1F" stroke="' + c + '" stroke-width="3"/>';
    s += '<circle cx="288" cy="170" r="5" fill="' + c + '"/>';
    // pulsing warning light
    s += '<rect x="205" y="100" width="30" height="12" rx="5" fill="' + c + '" filter="url(#e-pulse)">';
    s += '<animate attributeName="opacity" values="1;0.25;1" dur="1.2s" repeatCount="indefinite"/></rect>';
    s += '<g fill="' + c + '" opacity="0.4">' +
         '<path d="M220 92 l-30 -26 M220 92 l30 -26" stroke="' + c + '" stroke-width="3" stroke-linecap="round"/></g>';
    s += '</g>';
    // ECG heartbeat line across the scene
    s += '<g stroke="' + c + '" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.95">';
    s += '<path d="M0 60 h70 l10 -14 l10 30 l12 -44 l10 28 h44 l9 -12 l9 24 l11 -36 l9 24 h136"/>';
    s += '</g>';
    s += '<circle cx="0" cy="0" r="2.6" fill="' + c + '"/>';
    return s;
  }

  // 6. Phone & internet — big smartphone with QR + wifi, floating app icons, waves.
  function phone(c) {
    let s = '<defs><linearGradient id="p-bg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#0B3A33"/><stop offset="1" stop-color="#0A0F1F"/></linearGradient>' +
      '<linearGradient id="p-scr" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#10333E"/><stop offset="1" stop-color="#0C1C33"/></linearGradient></defs>';
    s += '<rect width="350" height="236" fill="url(#p-bg)"/>';
    // signal waves behind
    s += '<g fill="none" stroke="' + c + '" stroke-linecap="round" opacity="0.5">';
    s += '<path d="M40 200 a40 40 0 0 1 80 0" stroke-width="3"/>';
    s += '<path d="M28 200 a52 52 0 0 1 104 0" stroke-width="3" opacity="0.7"/>';
    s += '<path d="M16 200 a64 64 0 0 1 128 0" stroke-width="3" opacity="0.4"/>';
    s += '</g>';
    // smartphone
    s += '<rect x="118" y="24" width="114" height="188" rx="18" fill="#0B1026" stroke="' + c + '" stroke-width="4"/>';
    s += '<rect x="128" y="40" width="94" height="156" rx="10" fill="url(#p-scr)"/>';
    s += '<rect x="158" y="30" width="34" height="5" rx="2.5" fill="' + c + '" opacity="0.6"/>';
    // QR code
    let qr = '<g fill="' + c + '">';
    const finder = [[136, 50], [190, 50], [136, 104]];
    for (const f of finder) {
      qr += '<rect x="' + f[0] + '" y="' + f[1] + '" width="24" height="24" rx="4" fill="none" stroke="' + c + '" stroke-width="3.4"/>';
      qr += '<rect x="' + (f[0] + 8) + '" y="' + (f[1] + 8) + '" width="8" height="8" rx="1.6"/>';
    }
    // data modules
    const mods = [[168, 52], [180, 60], [168, 70], [192, 74], [138, 116], [152, 122], [166, 112],
                  [180, 120], [196, 112], [140, 140], [156, 136], [172, 144], [188, 138], [200, 150], [136, 128]];
    for (const m of mods) qr += '<rect x="' + m[0] + '" y="' + m[1] + '" width="8" height="8" rx="1.6" opacity="0.85"/>';
    qr += '</g>';
    s += qr;
    // wifi on the screen
    s += '<g fill="none" stroke="' + c + '" stroke-width="4" stroke-linecap="round">' +
         '<path d="M144 178 a24 24 0 0 1 34 0"/><path d="M151 186 a15 15 0 0 1 20 0"/></g>';
    s += '<circle cx="161" cy="193" r="3.2" fill="' + c + '"/>';
    // floating app icons
    const apps = [[62, 52, 24], [286, 46, 22], [48, 148, 20], [292, 156, 24]];
    for (const a of apps) {
      s += '<rect x="' + a[0] + '" y="' + a[1] + '" width="' + a[2] + '" height="' + a[2] + '" rx="7" fill="' + c + '" opacity="' + (0.20 + a[2] / 120).toFixed(2) + '" stroke="' + c + '" stroke-width="2"/>';
      s += '<circle cx="' + (a[0] + a[2] / 2) + '" cy="' + (a[1] + a[2] / 2) + '" r="' + (a[2] * 0.22).toFixed(1) + '" fill="' + c + '" opacity="0.85"/>';
    }
    return s;
  }

  // 7. Shopping & prices — night market stalls, shopping bag, hanging ¥ tags.
  function shopping(c) {
    let s = '<defs><linearGradient id="s-bg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#3A1030"/><stop offset="1" stop-color="#0A0F1F"/></linearGradient>' +
      '<linearGradient id="s-stall" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + c + '" stop-opacity="0.5"/><stop offset="1" stop-color="' + c + '" stop-opacity="0.14"/></linearGradient></defs>';
    s += '<rect width="350" height="236" fill="url(#s-bg)"/>';
    s += stars(18, 350, 120, c);
    // strings of tags across the top
    s += '<path d="M0 30 q90 26 175 6 q85 -20 175 12" stroke="' + c + '" stroke-width="1.6" fill="none" opacity="0.55"/>';
    const tags = [[42, 44], [128, 34], [212, 42], [292, 52]];
    for (const t of tags) {
      s += '<line x1="' + t[0] + '" y1="' + (t[1] - 26) + '" x2="' + t[0] + '" y2="' + t[1] + '" stroke="' + c + '" stroke-width="1.4" opacity="0.6"/>';
      s += '<rect x="' + (t[0] - 15) + '" y="' + t[1] + '" width="30" height="21" rx="5" fill="#0E1633" stroke="' + c + '" stroke-width="2"/>';
      s += '<text x="' + t[0] + '" y="' + (t[1] + 15) + '" text-anchor="middle" font-family="' + CN +
           '" font-size="14" font-weight="700" fill="' + c + '">¥</text>';
    }
    // market stalls
    const stalls = [[30, 108, 84], [126, 96, 88], [226, 112, 82]];
    for (const st of stalls) {
      s += '<rect x="' + st[0] + '" y="' + st[1] + '" width="' + st[2] + '" height="58" rx="6" fill="url(#s-stall)" stroke="' + c + '" stroke-width="2"/>';
      // awning stripes
      s += '<g fill="' + c + '" opacity="0.30">';
      for (let i = 0; i < 4; i++) s += '<rect x="' + (st[0] + 4 + i * (st[2] - 8) / 4) + '" y="' + (st[1] - 12) + '" width="' + ((st[2] - 8) / 8) + '" height="12"/>';
      s += '</g>';
      s += '<rect x="' + (st[0] - 4) + '" y="' + (st[1] - 14) + '" width="' + (st[2] + 8) + '" height="5" rx="2.5" fill="' + c + '" opacity="0.8"/>';
      // goods on the counter
      s += '<g fill="' + c + '" opacity="0.75">';
      for (let i = 0; i < 4; i++) s += '<rect x="' + (st[0] + 10 + i * ((st[2] - 20) / 4)) + '" y="' + (st[1] + 30) + '" width="12" height="16" rx="3"/>';
      s += '</g>';
    }
    // shopping bag (foreground)
    s += '<g>';
    s += '<path d="M134 150 h74 l-7 62 h-60 z" fill="#121A38" stroke="' + c + '" stroke-width="3" stroke-linejoin="round"/>';
    s += '<path d="M155 150 v-10 a16 16 0 0 1 32 0 v10" fill="none" stroke="' + c + '" stroke-width="3.4" stroke-linecap="round"/>';
    s += '<text x="171" y="188" text-anchor="middle" font-family="' + CN + '" font-size="20" font-weight="700" fill="' + c + '">¥</text>';
    s += '</g>';
    return s;
  }

  // 8. Hotel & lodging — golden facade, lit windows, entrance, key card + room key.
  function hotel(c) {
    let s = '<defs><linearGradient id="h-bg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#2C2413"/><stop offset="1" stop-color="#0A0F1F"/></linearGradient>' +
      '<linearGradient id="h-fac" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + c + '" stop-opacity="0.30"/><stop offset="1" stop-color="' + c + '" stop-opacity="0.08"/></linearGradient></defs>';
    s += '<rect width="350" height="236" fill="url(#h-bg)"/>';
    s += stars(14, 350, 90, c);
    // hotel facade
    s += '<rect x="60" y="18" width="150" height="150" rx="8" fill="url(#h-fac)" stroke="' + c + '" stroke-width="3"/>';
    s += '<rect x="60" y="10" width="150" height="14" rx="5" fill="' + c + '" opacity="0.85"/>';
    s += '<text x="135" y="22" text-anchor="middle" font-family="' + CN + '" font-size="11" font-weight="700" fill="#0A0F1F">酒店</text>';
    // lit windows
    s += '<g fill="' + c + '">';
    for (let r = 0; r < 3; r++) {
      for (let cIdx = 0; cIdx < 4; cIdx++) {
        const lit = (r * 4 + cIdx) % 3 !== 0;
        s += '<rect x="' + (74 + cIdx * 33) + '" y="' + (36 + r * 30) + '" width="22" height="20" rx="3" opacity="' + (lit ? 0.75 : 0.22) + '"/>';
      }
    }
    s += '</g>';
    // entrance
    s += '<rect x="108" y="126" width="54" height="42" rx="6" fill="#0A0F1F" stroke="' + c + '" stroke-width="2.6"/>';
    s += '<path d="M135 126 v42" stroke="' + c + '" stroke-width="1.6" opacity="0.6"/>';
    s += '<circle cx="127" cy="148" r="1.8" fill="' + c + '"/><circle cx="143" cy="148" r="1.8" fill="' + c + '"/>';
    // canopy
    s += '<rect x="100" y="116" width="70" height="10" rx="5" fill="' + c + '" opacity="0.9"/>';
    // ground
    s += '<rect x="0" y="168" width="350" height="68" fill="#0B1026"/>';
    s += '<rect x="0" y="168" width="350" height="3" fill="' + c + '" opacity="0.4"/>';
    // key card + room key at reception
    s += '<g>';
    s += '<rect x="238" y="120" width="58" height="38" rx="7" fill="#121A38" stroke="' + c + '" stroke-width="2.4"/>';
    s += '<rect x="246" y="128" width="20" height="14" rx="3" fill="' + c + '" opacity="0.55"/>';
    s += '<g fill="' + c + '" opacity="0.85"><rect x="271" y="129" width="18" height="3" rx="1.5"/>' +
         '<rect x="271" y="136" width="18" height="3" rx="1.5"/><rect x="246" y="148" width="43" height="3" rx="1.5"/></g>';
    // room key
    s += '<g transform="translate(252,170)">';
    s += '<circle cx="0" cy="0" r="13" fill="none" stroke="' + c + '" stroke-width="4"/>';
    s += '<line x1="13" y1="0" x2="46" y2="0" stroke="' + c + '" stroke-width="4" stroke-linecap="round"/>';
    s += '<line x1="38" y1="0" x2="38" y2="8" stroke="' + c + '" stroke-width="4" stroke-linecap="round"/>';
    s += '<line x1="46" y1="0" x2="46" y2="7" stroke="' + c + '" stroke-width="4" stroke-linecap="round"/>';
    s += '</g></g>';
    return s;
  }

  // 9. Transport — street with taxi, elevated metro, station sign, dotted route.
  function transport(c) {
    let s = '<defs><linearGradient id="t-bg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#1B2C10"/><stop offset="1" stop-color="#0A0F1F"/></linearGradient></defs>';
    s += '<rect width="350" height="236" fill="url(#t-bg)"/>';
    // elevated metro track
    s += '<rect x="0" y="52" width="350" height="10" rx="3" fill="#0E1633" stroke="' + c + '" stroke-width="2" opacity="0.9"/>';
    s += '<g stroke="' + c + '" stroke-width="2" opacity="0.45">';
    for (let i = 0; i < 12; i++) s += '<line x1="' + (10 + i * 30) + '" y1="52" x2="' + (10 + i * 30) + '" y2="30"/>';
    s += '</g>';
    // metro train
    s += '<g>';
    s += '<rect x="46" y="14" width="150" height="38" rx="10" fill="#0E1633" stroke="' + c + '" stroke-width="2.6"/>';
    s += '<g fill="' + c + '" opacity="0.5">';
    for (let i = 0; i < 5; i++) s += '<rect x="' + (58 + i * 27) + '" y="23" width="18" height="13" rx="3"/>';
    s += '</g>';
    s += '<rect x="196" y="24" width="16" height="18" rx="6" fill="' + c + '" opacity="0.7"/>';
    s += '<circle cx="70" cy="53" r="4" fill="' + c + '"/><circle cx="170" cy="53" r="4" fill="' + c + '"/>';
    s += '</g>';
    // station sign
    s += '<g>';
    s += '<rect x="252" y="66" width="80" height="26" rx="6" fill="#0E1633" stroke="' + c + '" stroke-width="2.4"/>';
    s += '<text x="292" y="84" text-anchor="middle" font-family="' + CN + '" font-size="14" font-weight="700" fill="' + c + '">地铁</text>';
    s += '<line x1="292" y1="92" x2="292" y2="112" stroke="' + c + '" stroke-width="2.4"/>';
    s += '</g>';
    // street
    s += '<rect x="0" y="150" width="350" height="86" fill="#0B1026"/>';
    s += '<g stroke="' + c + '" stroke-width="3" opacity="0.4"><line x1="6" y1="196" x2="56" y2="196"/>' +
         '<line x1="86" y1="196" x2="136" y2="196"/><line x1="166" y1="196" x2="216" y2="196"/>' +
         '<line x1="246" y1="196" x2="296" y2="196"/><line x1="326" y1="196" x2="346" y2="196"/></g>';
    // taxi
    s += '<g>';
    s += '<path d="M24 172 v-16 l10 -16 h96 l14 16 h44 l8 10 v12 h-14 a13 13 0 0 1 -26 0 h-72 a13 13 0 0 1 -26 0 h-14 z" fill="#0E1633" stroke="' + c + '" stroke-width="3" stroke-linejoin="round"/>';
    s += '<rect x="42" y="146" width="34" height="14" rx="3" fill="' + c + '" opacity="0.45"/>';
    s += '<rect x="82" y="146" width="40" height="14" rx="3" fill="' + c + '" opacity="0.45"/>';
    s += '<rect x="86" y="136" width="34" height="10" rx="3" fill="' + c + '"/>';
    s += '<text x="103" y="144" text-anchor="middle" font-family="' + CN + '" font-size="8" font-weight="700" fill="#0A0F1F">出租</text>';
    s += '<circle cx="56" cy="178" r="9" fill="#0A0F1F" stroke="' + c + '" stroke-width="2.6"/>';
    s += '<circle cx="136" cy="178" r="9" fill="#0A0F1F" stroke="' + c + '" stroke-width="2.6"/>';
    s += '</g>';
    // dotted green route line connecting two points
    s += '<path d="M206 214 q46 -30 92 -4" stroke="' + c + '" stroke-width="3" fill="none" stroke-dasharray="2 8" stroke-linecap="round"/>';
    s += '<circle cx="204" cy="214" r="6" fill="' + c + '"/>';
    s += '<circle cx="300" cy="210" r="6" fill="' + c + '"/>';
    return s;
  }

  // 10. Courtesy & thanks — shaking hands with a bow, big heart, red envelope, petals.
  function polite(c) {
    let s = '<defs><linearGradient id="c-bg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#3A3410"/><stop offset="1" stop-color="#0A0F1F"/></linearGradient>' +
      '<linearGradient id="c-env" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#E2493C"/><stop offset="1" stop-color="#A8231C"/></linearGradient></defs>';
    s += '<rect width="350" height="236" fill="url(#c-bg)"/>';
    // petals
    s += '<g fill="#F2839B" opacity="0.55">';
    const petals = [[40, 44, 6], [312, 60, 7], [66, 200, 5], [296, 196, 6], [160, 26, 5], [24, 128, 5], [330, 132, 6]];
    for (const p of petals) s += '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="' + p[2] + '" ry="' + (p[2] * 0.6) + '" transform="rotate(' + (p[0] % 90) + ' ' + p[0] + ' ' + p[1] + ')"/>';
    s += '</g>';
    // big heart
    s += '<path d="M175 44 c-14 -18 -46 -8 -46 16 c0 22 32 40 46 50 c14 -10 46 -28 46 -50 c0 -24 -32 -34 -46 -16 z" fill="' + c + '" opacity="0.22"/>';
    s += '<path d="M175 50 c-11 -14 -36 -6 -36 13 c0 17 25 31 36 39 c11 -8 36 -22 36 -39 c0 -19 -25 -27 -36 -13 z" fill="none" stroke="' + c + '" stroke-width="3" opacity="0.9"/>';
    // two people bowing, hands shaking
    s += person(108, 210, 92, '#12183A', { head: '#1A2148' });
    s += person(242, 210, 90, '#12183A', { head: '#1A2148' });
    // bow: tilt heads forward
    s += '<g stroke="' + c + '" stroke-width="7" stroke-linecap="round" fill="none">' +
         '<path d="M140 166 l22 12"/><path d="M210 166 l-22 12"/></g>';
    s += '<circle cx="175" cy="178" r="9" fill="' + c + '"/>';
    // red envelope (红包)
    s += '<g transform="translate(268,150) rotate(8)">';
    s += '<rect x="0" y="0" width="46" height="62" rx="5" fill="url(#c-env)" stroke="#FFC9A0" stroke-width="1.6"/>';
    s += '<path d="M23 18 a12 12 0 0 1 0 24 a12 12 0 0 1 0 -24" fill="none" stroke="#FFE0B8" stroke-width="2.4" opacity="0.9"/>';
    s += '<text x="23" y="14" text-anchor="middle" font-family="' + CN + '" font-size="11" font-weight="700" fill="#FFE0B8">红</text>';
    s += '</g>';
    return s;
  }

  // 11. Advanced & slang — rocket launching among stars, slang bubbles, purple trail.
  function advanced(c) {
    let s = '<defs><linearGradient id="a-bg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#241642"/><stop offset="1" stop-color="#0A0F1F"/></linearGradient>' +
      '<linearGradient id="a-trail" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + c + '" stop-opacity="0.85"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></linearGradient></defs>';
    s += '<rect width="350" height="236" fill="url(#a-bg)"/>';
    s += stars(46, 350, 236, c);
    // purple trail line
    s += '<path d="M175 236 q-34 -60 -6 -104 q26 -40 -4 -80" stroke="' + c + '" stroke-width="3" fill="none" opacity="0.4" stroke-dasharray="6 7" stroke-linecap="round"/>';
    s += '<path d="M175 236 l-16 -46 l32 0 z" fill="url(#a-trail)"/>';
    // rocket
    s += '<g transform="translate(175,96)">';
    s += '<path d="M0 -52 c16 18 22 40 22 62 l-44 0 c0 -22 6 -44 22 -62 z" fill="#0E1633" stroke="' + c + '" stroke-width="3" stroke-linejoin="round"/>';
    s += '<circle cx="0" cy="-18" r="9" fill="' + c + '" opacity="0.7"/>';
    s += '<path d="M-22 10 l-16 16 l18 -4 z" fill="' + c + '" opacity="0.85"/>';
    s += '<path d="M22 10 l16 16 l-18 -4 z" fill="' + c + '" opacity="0.85"/>';
    s += '<path d="M-8 10 h16 l-8 22 z" fill="' + c + '" opacity="0.9"/>';
    s += '</g>';
    // slang bubbles of various sizes
    s += bubble(24, 30, 76, 36, '#191042', c, '牛', '#EEF2FF', 18);
    s += bubble(262, 26, 66, 32, '#191042', c, '666', '#EEF2FF', 15);
    s += bubble(18, 150, 88, 38, '#191042', c, '给力', '#EEF2FF', 17);
    s += bubble(250, 158, 84, 36, '#191042', c, '躺平', '#EEF2FF', 16);
    s += bubble(120, 8, 56, 26, '#191042', c, '绝', '#EEF2FF', 13);
    return s;
  }

  // 12. General vocab — colorful bookshelves and floating Chinese words.
  function general(c) {
    let s = '<defs><linearGradient id="v-bg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#12244A"/><stop offset="1" stop-color="#0A0F1F"/></linearGradient></defs>';
    s += '<rect width="350" height="236" fill="url(#v-bg)"/>';
    // bookshelf on the right
    s += '<g>';
    s += '<rect x="204" y="20" width="128" height="196" rx="8" fill="#0E1633" stroke="' + c + '" stroke-width="3"/>';
    const shelfColors = [c, '#66D9E8', '#FFB020', '#38D9A9', '#F783AC', '#B197FC'];
    for (let r = 0; r < 4; r++) {
      const y = 34 + r * 46;
      s += '<rect x="212" y="' + (y + 30) + '" width="112" height="4" rx="2" fill="' + c + '" opacity="0.5"/>';
      let x = 216;
      let k = 0;
      while (x < 316) {
        const bw = 9 + ((r * 3 + k) % 3) * 4;
        const bh = 22 + ((r * 5 + k * 7) % 4) * 3;
        s += '<rect x="' + x + '" y="' + (y + 30 - bh) + '" width="' + bw + '" height="' + bh + '" rx="2" fill="' + shelfColors[(r + k) % shelfColors.length] + '" opacity="0.85"/>';
        x += bw + 3; k++;
      }
    }
    s += '</g>';
    // floating Chinese words cloud: [glyph, x, y, fontSize, color]
    const words = [['人', 40, 48, 30, '#66D9E8'], ['水', 92, 92, 26, '#38D9A9'], ['大', 34, 150, 28, '#FFB020'],
                   ['小', 88, 196, 24, '#F783AC'], ['好', 148, 150, 22, '#B197FC'], ['日', 152, 40, 20, '#FF7A59'],
                   ['月', 52, 108, 18, '#748FFC']];
    for (const w of words) {
      s += '<text x="' + w[1] + '" y="' + w[2] + '" font-family="' + CN + '" font-size="' + w[3] +
           '" font-weight="700" fill="' + w[4] + '" opacity="0.85" text-anchor="middle">' + w[0] + '</text>';
    }
    return s;
  }

  // All — a mosaic of the twelve circles in the category colors.
  function all() {
    const ids = ['greetings', 'questions', 'numbers', 'food', 'emergency', 'phone',
                 'shopping', 'hotel', 'transport', 'polite', 'advanced', 'general'];
    const pts = [[88, 78], [175, 78], [262, 78],
                 [88, 158], [175, 158], [262, 158],
                 [55, 40], [131, 40], [219, 40], [295, 40],
                 [92, 200], [258, 200]];
    let s = '<defs><radialGradient id="all-glow"><stop offset="0" stop-color="#16306B" stop-opacity="0.9"/>' +
            '<stop offset="1" stop-color="#0A0F1F" stop-opacity="0"/></radialGradient></defs>';
    s += '<rect width="350" height="236" fill="#0A0F1F"/>';
    s += '<circle cx="175" cy="118" r="112" fill="url(#all-glow)"/>';
    ids.forEach((id, i) => {
      const p = pts[i];
      const c = C[id];
      s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="26" fill="' + c + '" opacity="0.18"/>';
      s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="17" fill="' + c + '" opacity="0.9"/>';
      s += '<circle cx="' + (p[0] - 5) + '" cy="' + (p[1] - 6) + '" r="5" fill="#FFFFFF" opacity="0.28"/>';
    });
    // faint connector web
    s += '<g stroke="#34417A" stroke-width="1" opacity="0.5">';
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1];
        if (dx * dx + dy * dy < 8200) {
          s += '<line x1="' + pts[i][0] + '" y1="' + pts[i][1] + '" x2="' + pts[j][0] + '" y2="' + pts[j][1] + '"/>';
        }
      }
    }
    s += '</g>';
    return s;
  }

  global.R3D_SCENES = {
    greetings, questions, numbers, food, emergency, phone,
    shopping, hotel, transport, polite, advanced, general, all
  };
})(window);
