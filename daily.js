(() => {
  'use strict';
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const STORAGE = 'r3d-daily-state-v1';
  const AUDIO = window.R3D_AUDIO || {};
  const CATS = (window.R3D_DAILY && window.R3D_DAILY.cats) || [];

  const CAT_COLOR = {
    greetings:'#FFB020', questions:'#66C9F3', numbers:'#748FFC', food:'#FF7A59',
    emergency:'#FF4D6D', phone:'#38D9A9', shopping:'#F783AC', hotel:'#C9A66B',
    transport:'#A9E34B', polite:'#FFE066', advanced:'#B197FC', general:'#4DAFD9', all:'#38D9F8'
  };
  const TONE_COLOR = { street:'#FF7A59', academic:'#4DAFD9', neutral:'#38D9A9' };
  const TONE_LABEL = { street:'شارعي', academic:'رسمي', neutral:'محايد' };

  let PROG = {};
  try { PROG = JSON.parse(localStorage.getItem('r3d-daily-prog-v1')) || {}; } catch(e){ PROG = {}; }
  let ST = { cat:'all', mode:'new', level:'all', batch:30, tones:'all' };
  try { const s = localStorage.getItem(STORAGE); if (s) ST = { ...ST, ...JSON.parse(s) }; } catch(e){}

  const saveState = () => { try { localStorage.setItem(STORAGE, JSON.stringify(ST)); } catch(e){} };
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const addDays = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

  function playId(id){
    if (id && AUDIO[id]) {
      const a = new Audio(); a.preload = 'auto'; a.src = AUDIO[id];
      a.play().catch(()=>{});
      return;
    }
    const e = document.getElementById('r3dAudio');
    if (e && e.play) e.play().catch(()=>{});
  }
  function stopAudio(){
    const e = document.getElementById('r3dAudio');
    if (e) e.pause();
  }

  function sceneSVG(hex){
    const c = hex || '#FFB020';
    return `<svg viewBox="0 0 350 236" role="img" aria-label="صورة توضيحية للفئة">
      <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2A2250"/><stop offset="1" stop-color="${c}"/>
      </linearGradient></defs>
      <rect width="350" height="236" fill="url(#sky)"/>
      <circle cx="276" cy="68" r="26" fill="${c}" opacity="0.92"/>
      <g fill="#1A1430">
        <rect x="0" y="174" width="350" height="62"/>
        <rect x="6" y="140" width="70" height="62"/>
        <rect x="94" y="152" width="58" height="46"/>
        <rect x="164" y="130" width="72" height="78"/>
        <rect x="248" y="152" width="60" height="44"/>
        <rect x="310" y="162" width="36" height="36"/>
      </g>
      <g stroke="${c}" stroke-width="3.2" stroke-linecap="round" fill="none">
        <path d="M66 158 c-5-6 -5-15 0-21 M104 158 c-5-6 -5-15 0-21"/>
        <path d="M66 158 c0-5 6-14 0-21 M104 158 c0-5 6-14 0-21"/>
      </g>
      <g fill="#FF7A59"><circle cx="66" cy="140" r="9"/><circle cx="104" cy="140" r="9"/></g>
      <rect x="46" y="128" width="40" height="44" fill="#191330"/>
      <rect x="90" y="144" width="40" height="28"/>
      <rect x="150" y="112" width="40" height="44"/>
      <rect x="192" y="132" width="40" height="32"/>
    </svg>`;
  }

  function ell(c){
    return { zh:c.front, py:c.py||'', ar:c.ar||'', tone:c.label, level:c.level, cat:c.cat, sub:c.sub||'', note:c.note||'' };
  }

  function setFilterActive(b){
    $$('.filter-active').forEach(x=>x.classList.remove('filter-active'));
    if (b) b.classList.add('filter-active');
  }
  function toneChips(){
    return $$('div').filter(d => d.textContent.trim() && TONE_COLOR[d.textContent.trim()] && d.querySelector('div'));
  }

  function homeInit(){
    $$('button').filter(b=>['جديدة','اليومانية'].includes(b.textContent.trim())).forEach(b=>b.addEventListener('click',()=>{
      setFilterActive(b); ST.mode=b.textContent.trim(); saveState(); updateStats();
    }));
    $$('button').filter(b=>['سهل','متوسط','صعب'].includes(b.textContent.trim())).forEach(b=>b.addEventListener('click',()=>{
      setFilterActive(b); ST.level=b.textContent.trim(); saveState(); updateStats();
    }));
    $$('button').filter(b=>['30 ث','1 دقيقة','2 دقيقة'].includes(b.textContent.trim())).forEach(b=>b.addEventListener('click',()=>{
      const t=b.textContent.trim(); ST.batch = t.startsWith('30')?30 : (t.startsWith('1')?60:120);
      setFilterActive(b); saveState(); updateStats();
    }));
    toneChips().forEach(t=>{
      const k=t.textContent.trim();
      t.addEventListener('click',()=>{
        setFilterActive(...toneChips().filter(x=>x!==t));
        if (t.classList.contains('filter-active')){ t.classList.remove('filter-active'); ST.tones='all'; }
        else { t.classList.add('filter-active'); ST.tones=k; }
        saveState(); updateStats();
      });
    });
    $$('.cat-btn').forEach(b=>b.addEventListener('click',()=>{
      const cat = b.dataset.cat === 'all' ? 'all' : b.dataset.cat;
      ST.cat = cat; saveState(); renderAll();
    }));
    const start = document.querySelector('button');
    start.addEventListener('click', ()=>{
      const queue = R3D_DAILY.cards.filter(eligible);
      if (!queue.length){ alert('مفيش بيانات للمراجعة مع الجهة والفئة المختارة — غير الإعدادات.'); return; }
      saveState(); localStorage.setItem('r3d-daily-start', JSON.stringify({cat:ST.cat,mode:ST.mode,level:ST.level,batch:ST.batch,tones:ST.tones}));
      window.location.href = 'review.html';
    });
    $$('button').filter(b=>b.textContent.trim().startsWith('بدء جديد')).forEach(b=>b.addEventListener('click',()=>{
      if (!confirm('امسح التقدم (معروفة/اليومانية)؟')) return;
      try { localStorage.removeItem('r3d-daily-prog-v1'); } catch(e){}
      try { localStorage.removeItem(STORAGE); } catch(e){}
      PROG = {};
      ST = { cat:'all', mode:'new', level:'all', batch:30, tones:'all' };
      updateStats();
    }));
    updateStats();
  }

  // ---- review ----
  let queue=[], idx=0, cur=null, budget=0, timerId=null, mm=0;

  function eligible(c){
    if (ST.cat!=='all' && c.cat!==ST.cat) return false;
    if (ST.level!=='all' && c.level!==ST.level) return false;
    if (ST.tones!=='all' && c.label!==ST.tones) return false;
    const r = PROG[c.id]||{n:0, due:'9999-01-01'};
    if (ST.mode==='new') return r.n===0;
    return r.n>0 && r.due<=todayStr();
  }

  function stFromURL(){
    const q = location.search.slice(1).split('&');
    const o = {cat:'all'};
    for (const p of q){ const i=p.indexOf('='); if (i>0) o[p.slice(0,i)]=decodeURIComponent(p.slice(i+1)); }
    return o;
  }

  function renderAll(){
    const u = stFromURL();
    if (u.cat!=='all') ST.cat = u.cat;
    const color = CAT_COLOR[ST.cat]||'#FFB020';
    document.body.style.setProperty('--cat', color);
    if (page==='review') renderReview();
    else {
      $$('.cat-active').forEach(x=>x.classList.remove('cat-active'));
      $$('.cat-btn').forEach(b=>{ if (b.dataset.cat===ST.cat) b.classList.add('cat-active'); });
      updateStats();
    }
  }

  function updateStats(){
    const scope = R3D_DAILY.cards.filter(eligible);
    const known = scope.filter(c=>(PROG[c.id]||{n:0}).n>0).length;
    const due = scope.filter(c=>(PROG[c.id]||{n:0,due:'9999-01-01'}).n>0 && (PROG[c.id]||{due:'9999-01-01'}).due<=todayStr()).length;
    document.querySelectorAll('[data-stat]').forEach(el=>{
      const k=el.dataset.stat;
      el.textContent = k==='known'?known : (k==='today'?due:'+'+scope.length);
    });
  }

  function renderReview(){
    const title = CATS.find(c=>c.id===ST.cat)?.ar || ST.cat;
    $('#revTitle').textContent = title;
    const col = CAT_COLOR[ST.cat]||'#FFB020';
    document.body.style.setProperty('--cat', col);
    buildQueue();
    const q = queue;
    if (idx>=q.length){ showDone(); return; }
    cur = q[idx++]; budget = ST.batch*1000; mm=0; renderCard(cur);
  }
  function buildQueue(){ queue = R3D_DAILY.cards.filter(eligible); idx=0; }
  function nextCard(){
    stopAudio();
    if (idx>=queue.length){ showDone(); return; }
    cur = queue[idx++]; budget = ST.batch*1000; mm=0; renderCard(cur);
  }
  function renderCard(c){
    const d = ell(c);
    $('#cardFront').textContent = d.zh;
    $('#pinyin').textContent = d.py;
    $('#pinyin').className = 'pinyin' + (d.py?' pinyin-ltr':'');
    $('#cardAr').textContent = d.ar;
    $('#revTitle').textContent = CATS.find(c2=>c2.id===d.cat)?.ar || d.cat;
    const col = CAT_COLOR[d.cat]||'#FFB020';
    $('#sceneCard').style.borderColor = col;
    $('#sceneSvg').innerHTML = sceneSVG(col);
    $('#progressLabel').textContent = idx + ' / ' + queue.length;
    $('#progressFill').style.width = ((idx-1)/queue.length*100) + '%';
    $('#progressLeft').textContent = (ST.mode==='new'?'جديدة':'اليومانية') + ': ' + Math.max(0, queue.length-idx) + ' متبقاة';
    const tcol = TONE_COLOR[d.tone]||'#4dabf7';
    $('#tagsRow').innerHTML = `<span class="tag tag-tone" style="border-color:${tcol};color:${tcol};">${TONE_LABEL[d.tone]||'محايد'}</span>` +
      `<span class="tag tag-level">${d.level==='easy'?'سهل':d.level==='medium'?'متوسط':'صعب'}</span>`;
    const haveAudio = !!AUDIO[c.id];
    $('#audioBtn').style.borderColor = haveAudio ? col : 'rgba(255,255,255,.2)';
    const rgb = hex2rgb(col);
    $('#audioBtn').style.background = haveAudio ? 'rgba('+rgb.join(',')+',.13)' : 'rgba(255,255,255,.13)';
    $('#grade-know').style.background = col;
    $('#grade-know').style.color = hexToDark(col);
    $('#grade-know').style.borderColor = col;
    $('#grade-dunno').style.color = '#ffb3bc';
    $('#grade-hard').style.color = col;
    const el = document.getElementById('r3dAudio'); if (el) el.pause();
    startTimer();
  }
  function hex2rgb(h){ const h2=h.replace('#',''); return [parseInt(h2.slice(0,2),16),parseInt(h2.slice(2,4),16),parseInt(h2.slice(4,6),16)]; }
  function hexToDark(h){ return hex2rgb(h).map(v=>Math.round(v*0.55)).join(','); }
  function startTimer(){
    mm=0; const t0=performance.now();
    const tick=()=>{
      mm=Math.floor((performance.now()-t0)/1000);
      const m=Math.floor(mm/60), s=String(mm%60).padStart(2,'0');
      $('#timer').textContent = m+':'+s;
      if (mm>=budget/1000){ stopAudio(); grade('hard'); return; }
      timerId=requestAnimationFrame?requestAnimationFrame(tick):setTimeout(tick,20);
    };
    timerId=requestAnimationFrame?requestAnimationFrame(tick):setTimeout(tick,20);
  }
  function stopTimer(){ if (timerId){ if(requestAnimationFrame)cancelAnimationFrame(timerId); else clearTimeout(timerId); timerId=null; } }

  function grade(g){
    const c = cur; if (!c) return;
    const p = PROG[c.id]||{n:0,ease:2.5,interval:1,due:'9999-01-01'};
    const cnt = p.n+1, iv = p.interval;
    let e = p.ease, iv2 = iv;
    if (g==='know'){ e = Math.min(2.9, 2.5+0.1*cnt); iv2 = cnt===1?1 : Math.max(1, Math.round(iv2*e)); if (cnt>=5) iv2 = Math.min(30, Math.round(iv2*1.5)); }
    else if (g==='hard'){ e = Math.max(1.3, e-0.08); iv2 = Math.max(1, cnt===0?1:Math.round(iv2/4)); }
    else { e = Math.max(1.3, e-0.2); iv2 = Math.max(1, cnt===0?1:Math.round(iv2/6)); }
    PROG[c.id]={n:cnt, ease:e, interval:iv2, due:addDays(todayStr(), iv2)};
    saveState(); stopTimer(); stopAudio(); nextCard();
  }

  function showDone(){
    stopTimer();
    const done=document.createElement('div');
    done.style.cssText='position:fixed;inset:0;background:rgba(4,3,10,.82);z-index:9;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#eef2ff;gap:14px;padding:24px;';
    const t=document.createElement('div'); t.style.fontSize='42px'; t.innerHTML='🔚';
    const msg=document.createElement('div'); msg.style.fontSize='22px'; msg.style.maxWidth='440px'; msg.style.textAlign='center';
    const q1=queue||[];
    msg.textContent = 'أكملت المراجعة. معروفة: ' + (Object.values(PROG).filter(p=>p.n>0).length) + ' / ' + (R3D_DAILY.cards.length||'?');
    const again=document.createElement('button');
    again.style.cssText='padding:16px 34px;border-radius:20px;background:linear-gradient(135deg,#38d9f8,#22a7e6);color:#04263b;font-size:20px;font-weight:700;border:none;cursor:pointer';
    again.textContent='ابدأ مراجعة أخرى';
    again.addEventListener('click',()=>{ done.remove(); renderReview(); });
    done.appendChild(t); done.appendChild(msg); done.appendChild(again); document.body.appendChild(done);
  }

  function bindReviewNav(){
    $('#backBtn').addEventListener('click',()=>{
      stopAudio(); localStorage.removeItem('r3d-daily-start');
      window.location.href='index.html';
    });
    $('#audioBtn').addEventListener('click',()=>{ playId(cur&&cur.id); });
    $('#grade-dunno').addEventListener('click',()=>grade('dunno'));
    $('#grade-hard').addEventListener('click',()=>grade('hard'));
    $('#grade-know').addEventListener('click',()=>grade('know'));
  }

  const isReview = !!$('#revTitle');
  const page = isReview?'review':'home';
  if (isReview){
    renderAll();
    renderReview();
    bindReviewNav();
  } else {
    homeInit();
  }
})();
