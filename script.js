'use strict';
/* ================== PENGATURAN ================== */
const START_LIVES = 5, START_HINTS = 5;
const ROLLBACK = 5;                                // nyawa habis -> mundur 5 soal di level yang sama
const IMAGE_EXT = ['jpg', 'png', 'jpeg', 'webp'];  // foto soal: images/level1/1.jpg ... images/level5/15.jpg
const LEVELS = 5;

/* ================== DATA SOAL: [jawaban, hint, (jawaban alternatif)] ================== */
const DATA = [
  { time: 50, q: [
    ['die Autobahn','die'],['die Hausaufgabe','die'],['teuer','Adjektiv'],['das Wochenende','das'],['suchen','Verb'],
    ['der Kindergarten','der'],['das Kaufhaus','das'],['der Supermarkt','der'],['der Handschuh','der'],['der Badeanzug','der'],
    ['das Schlafzimmer','das'],['die Freizeit','die'],['die Fahrkarte','die'],['der Parkplatz','der'],['Gute Nacht',null] ] },
  { time: 50, q: [
    ['die Waschmaschine','die'],['das Schwimmbad','das'],['reich','Adjektiv'],['die Krankenkasse','die'],['die Hauptstadt','die'],
    ['die Mittagspause','die'],['lernen','Verb'],['der Arbeitsplatz','der'],['der Schneemann','der'],['die Ankunft','die'],
    ['einfach','Adjektiv'],['der Kugelschreiber','der'],['die Sonnenbrille','die'],['der Anschluss','der'],['Auf Wiedersehen',null] ] },
  { time: 100, q: [
    ['der Einfall','der'],['die Ausbildung','die'],['der Strandurlaub','der'],['einladen','Verb'],['die Bankkauffrau','die'],
    ['das Taschentuch','das'],['die Hauptschule','die'],['der Geldautomat','der'],['die Tastatur','die'],['die Hochzeit','die'],
    ['die Geburtstagsparty','die'],['das Feuerwerk','das'],['die Mitternacht','die'],['der Fahrplan','der'],['Herzlichen Glückwunsch',null] ] },
  { time: 150, q: [
    ['das Abenteuer','das'],['der Kopfhörer','der'],['widersprechen','Verb'],['der Standpunkt','der'],['der Handyakku','der'],
    ['die Schwiegereltern','die'],['unfreundlich','Adjektiv'],['der Augenblick','der'],['wertvoll','Adjektiv'],['einsam','Adjektiv'],
    ['der Krankenwagen','der'],['der Schwerpunkt','der'],['die Volkshochschule','die'],['der Fingerabdruck','der'],['Wir buchen eine spontane Reise',null] ] },
  { time: 150, q: [
    ['die Gegenwart','die'],['ungewöhnlich','Adjektiv'],['übernehmen','Verb'],['die Mehrheit','die'],['die Krankenkasse','die'],
    ['das Vorurteil','das'],['der Klimawandel','der'],['die Nachhaltigkeit','die'],['ehrenamtlich','Adjektiv'],['voraussetzen','Verb'],
    ['die Berufsfeuerwehr','die'],['verantwortlich','Adjektiv'],['die Meinungsfreiheit','die'],
    ['die Bewerbungsunterlage','die','die Bewerbungunterlage'],['Wir sparen viel Strom',null,'Wir sparen viel Storm'] ] }
];

/* ================== SIMPAN / MUAT ================== */
const KEY = 'rateDasBild_v2';
const newLv = () => ({ q: 0, lives: START_LIVES, hints: START_HINTS, steps: {} });
const freshState = muted => {
  const levels = {}; for (let n = 1; n <= LEVELS; n++) levels[n] = newLv();
  return { unlocked: [1], levels, muted: !!muted, last: null };
};
function load() {
  const base = freshState(false);
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.levels) { const m = Object.assign(base, s); for (let n = 1; n <= LEVELS; n++) if (!m.levels[n]) m.levels[n] = newLv(); return m; }
  } catch (e) {}
  return base;
}
let S = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const $ = s => document.querySelector(s);

/* ================== RUMPUT (background dibuat otomatis) ================== */
(function grass() {
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'); g.fillStyle = '#3a7a1c'; g.fillRect(0, 0, N, N); g.lineCap = 'round';
  for (let i = 0; i < 16000; i++) {
    const x = Math.random() * N, y = Math.random() * N, len = 6 + Math.random() * 11, a = -Math.PI / 2 + (Math.random() - .5) * 1.1;
    g.strokeStyle = `hsl(${82 + Math.random() * 22},${50 + Math.random() * 25}%,${20 + Math.random() * 30}%)`;
    g.lineWidth = .8 + Math.random() * .9;
    for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) {
      g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + dx + Math.cos(a) * len, y + dy + Math.sin(a) * len); g.stroke();
    }
  }
  document.body.style.backgroundImage = `url(${c.toDataURL()})`;
})();

/* ================== AUDIO ================== */
/* Musik tiap level berbeda (tempo, nada dasar, tangga nada, melodi). Soal 15 memakai versi "tegang" dari musik level itu. */
const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10];
const THEMES = {
  0: { bpm: 100, prog: [48, 45, 41, 43], minor: false, wave: 'triangle', lv: .10, mel: [4, null, 2, null, 0, null, 2, null] },     // menu
  1: { bpm: 112, prog: [48, 45, 41, 43], minor: false, wave: 'square',   lv: .07, mel: [7, null, 9, null, 7, null, 5, null] },
  2: { bpm: 122, prog: [50, 47, 43, 45], minor: false, wave: 'sawtooth', lv: .04, mel: [4, 6, 7, null, 9, 7, 6, null] },
  3: { bpm: 104, prog: [45, 41, 48, 43], minor: true,  wave: 'square',   lv: .07, mel: [7, null, 6, 4, 7, null, 9, null] },
  4: { bpm: 128, prog: [52, 48, 45, 47], minor: true,  wave: 'sawtooth', lv: .04, mel: [9, null, 7, null, 6, 7, 9, 11] },
  5: { bpm: 96,  prog: [43, 40, 45, 38], minor: false, wave: 'sine',     lv: .13, mel: [4, 2, 4, 7, null, 9, 7, null] }
};
const Snd = {
  ctx: null, want: { mode: 'calm', level: 0 }, key: '', step: 0, next: 0, timer: null, bpm: 112, base: 112, muted: S.muted,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const x = this.ctx = new C();
    this.music = x.createGain(); this.sfx = x.createGain();
    this.music.connect(x.destination); this.sfx.connect(x.destination); this.applyMute();
    const b = x.createBuffer(1, x.sampleRate * .5, x.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.noise = b;
    this.start();
  },
  applyMute() { if (!this.ctx) return; this.music.gain.value = this.muted ? 0 : .22; this.sfx.gain.value = this.muted ? 0 : .6; },
  toggle() {
    this.muted = !this.muted; S.muted = this.muted; save(); this.applyMute();
    if (this.muted && 'speechSynthesis' in window) speechSynthesis.cancel();
    $('#muteBtn').textContent = this.muted ? '🔇' : '🔊';
  },
  f: m => 440 * Math.pow(2, (m - 69) / 12),
  tone(f, t, d, type, vol, dest, f2) {
    const x = this.ctx, o = x.createOscillator(), g = x.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + d + .05);
  },
  hat(t, vol) {
    const x = this.ctx, s = x.createBufferSource(), g = x.createGain(), h = x.createBiquadFilter();
    s.buffer = this.noise; h.type = 'highpass'; h.frequency.value = 7000; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .05);
    s.connect(h); h.connect(g); g.connect(this.music); s.start(t); s.stop(t + .06);
  },
  setMode(mode, level) {
    this.want = { mode, level: level || 0 };
    if (this.key === mode + (level || 0) && this.timer) return; // musik sama -> tidak diulang
    this.start();
  },
  start() {
    clearInterval(this.timer); this.timer = null;
    if (!this.ctx) return;
    const w = this.want, T = THEMES[w.level];
    this.mode = w.mode; this.lvl = w.level; this.key = w.mode + w.level;
    this.base = this.bpm = w.mode === 'tense' ? T.bpm + 38 : T.bpm;
    this.step = 0; this.next = this.ctx.currentTime + .1;
    this.timer = setInterval(() => { while (this.next < this.ctx.currentTime + .2) { this.play(this.step++, this.next); this.next += 60 / this.bpm / 2; } }, 30);
  },
  play(n, t) {
    const T = THEMES[this.lvl], e = 60 / this.bpm / 2, s = n % 32, bar = Math.floor(s / 8), f = this.f, M = this.music;
    if (this.mode === 'calm') {
      const root = T.prog[bar], sc = T.minor ? MIN : MAJ, third = T.minor ? 3 : 4;
      if (s % 4 === 0) this.tone(f(root), t, e * 3.5, 'triangle', .5, M);
      this.tone(f(root + 24 + [0, third, 7, third][s % 4]), t, e * 1.6, 'sine', .22, M);
      const d = T.mel[s % 8];
      if (d != null) this.tone(f(root + 12 + sc[d % 7] + 12 * Math.floor(d / 7)), t, e * 1.8, T.wave, T.lv, M);
      if (s % 2) this.hat(t, .04);
    } else {
      const root = T.prog[bar] - 12, sd = s % 8;
      this.tone(f(sd === 7 ? root + 3 : root), t, e * .9, 'sawtooth', .3, M);
      if (s % 4 === 0) this.tone(130, t, .2, 'sine', .7, M, 40);
      if (sd === 0 || sd === 3 || sd === 6) this.tone(f([root + 48, root + 51, root + 47][(s / 3 | 0) % 3]), t, e * .5, 'square', .06, M);
      this.hat(t, s % 2 ? .07 : .04);
    }
  },
  /* suara ucapan Jerman (Web Speech API bawaan browser) */
  say(text) {
    if (this.muted || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = 'de-DE'; u.rate = .95; u.volume = 1;
      const v = speechSynthesis.getVoices().find(v => /^de/i.test(v.lang)); if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  },
  click() { if (this.ctx) this.tone(660, this.ctx.currentTime, .06, 'square', .12); },
  tick() { if (this.ctx) this.tone(1100, this.ctx.currentTime, .05, 'sine', .25); },
  hint() { if (!this.ctx) return; const t = this.ctx.currentTime; this.tone(1200, t, .3, 'sine', .3); this.tone(1600, t + .1, .4, 'sine', .25); },
  correct() { if (!this.ctx) return; const t = this.ctx.currentTime; [523, 659, 784, 1047].forEach((q, i) => this.tone(q, t + i * .09, .3, 'triangle', .4)); },
  wrong() { if (!this.ctx) return; const t = this.ctx.currentTime; this.tone(220, t, .4, 'sawtooth', .35, null, 70); this.tone(165, t + .05, .4, 'square', .15, null, 60); },
  lose() { if (!this.ctx) return; const t = this.ctx.currentTime; [392, 330, 262, 196].forEach((q, i) => this.tone(q, t + i * .22, .5, 'triangle', .45)); },
  win() { if (!this.ctx) return; const t = this.ctx.currentTime; [523, 659, 784, 1047, 784, 1047, 1319].forEach((q, i) => this.tone(q, t + i * .13, .45, 'triangle', .4)); }
};
$('#muteBtn').textContent = Snd.muted ? '🔇' : '🔊';
$('#muteBtn').onclick = () => Snd.toggle();
document.addEventListener('pointerdown', () => Snd.init());
document.addEventListener('click', e => { if (e.target.closest('.btn,.tile,.lamp') && !e.target.closest('.grey')) Snd.click(); });
document.addEventListener('visibilitychange', () => {
  if (!Snd.ctx) return;
  if (document.hidden) { Snd.ctx.suspend(); if ('speechSynthesis' in window) speechSynthesis.cancel(); } else Snd.ctx.resume();
});
if ('speechSynthesis' in window) speechSynthesis.getVoices();

/* ================== UTIL UI ================== */
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('#screen-' + id).classList.add('active');
  if (id !== 'game') { stopTimer(); Snd.setMode('calm', 0); }
}
function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800); }
let fbT;
const FB_IMG = { ok: 'Gambar_1.png', bad: 'Gambar_2.png', over: 'Gambar_3.png' };
Object.values(FB_IMG).forEach(src => { new Image().src = src; });   // preload
function feedback(kind, onOk) {
  const f = $('#fb'), btn = $('#fbBtn'); clearTimeout(fbT);
  $('#fbImg').src = FB_IMG[kind];
  if (onOk) {   // layar dengan tombol OK (Game Over)
    f.className = 'fb show hasbtn';
    btn.onclick = () => { f.className = 'fb'; onOk(); };
  } else {
    f.className = 'fb show'; fbT = setTimeout(() => f.classList.remove('show'), 1250);
  }
}
function modal(title, text, buttons) {
  $('#mTitle').textContent = title; $('#mText').textContent = text; const b = $('#mBtns'); b.innerHTML = '';
  buttons.forEach(o => { const x = document.createElement('button'); x.className = 'btn ' + (o.cls || ''); x.textContent = o.label; x.onclick = () => { $('#modal').classList.remove('show'); o.fn && o.fn(); }; b.append(x); });
  $('#modal').classList.add('show');
}
const norm = s => s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[!.?,]/g, '');

/* ================== MENU ================== */
$('#bPlay').onclick = () => { renderPlay(); show('play'); };
$('#bHelp').onclick = () => show('help');
$('#bHelpBack').onclick = () => show('menu');
$('#bPlayBack').onclick = () => show('menu');
$('#bGridBack').onclick = () => { renderPlay(); show('play'); };
$('#bReset').onclick = () => modal('Zurücksetzen?', 'Semua jawaban & progres akan dihapus. Lanjutkan?', [
  { label: 'Ja', cls: 'red', fn: () => { S = freshState(Snd.muted); save(); toast('Alles zurückgesetzt!'); } },
  { label: 'Nein' }]);

function renderPlay() {
  const box = $('#lvlList'); box.innerHTML = '';
  for (let n = 1; n <= LEVELS; n++) {
    const open = S.unlocked.includes(n), L = S.levels[n], b = document.createElement('button');
    b.className = 'btn lvl' + (open ? '' : ' grey');
    b.innerHTML = `<i class="ico ${open ? 'star' : 'lock'}"></i><span>Level ${n}</span>` + (open && L.q > 0 ? `<em>${L.q}/15</em>` : '');
    b.onclick = () => { if (!open) { Snd.wrong(); shake(b); return; } openGrid(n); };
    box.append(b);
  }
}
function openGrid(n) {
  G.level = n; S.last = n; save(); $('#gridTitle').textContent = 'LEVEL ' + n;
  const L = S.levels[n], box = $('#tiles'); box.innerHTML = '';
  for (let i = 0; i < 15; i++) {
    const open = i <= L.q, b = document.createElement('button');
    b.className = 'btn tile' + (i === 14 && open ? ' red' : '') + (!open ? ' grey' : '') + (i < L.q ? ' done' : '') + (i === L.q ? ' cur' : '');
    b.textContent = i + 1;
    b.onclick = () => { if (!open) { Snd.wrong(); shake(b); return; } startQuestion(n, i); };
    box.append(b);
  }
  show('grid');
}

/* ================== GAME ================== */
const G = { level: 1, idx: 0, review: false, busy: false, timerId: null, endAt: 0, lastSec: null };
const heartSVG = '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.4-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.6-8 11-8 11z"/></svg>';
const cur = () => S.levels[G.level];
const item = () => DATA[G.level - 1].q[G.idx];
const ans = () => item()[0];

function drawHearts() {
  const L = cur(); $('#lives').innerHTML = '';
  for (let i = 0; i < START_LIVES; i++) { const h = document.createElement('span'); h.className = 'heart' + (i < L.lives ? '' : ' lost'); h.innerHTML = heartSVG; $('#lives').append(h); }
  $('#hintCount').textContent = G.idx === 14 ? '–' : L.hints;
  $('#lamp').classList.toggle('off', G.idx === 14 || G.review);
}
function loadImage() {
  const img = $('#qimg'), ph = $('#ph'); let k = 0;
  const base = `images/level${G.level}/${G.idx + 1}.`;
  img.style.display = 'none'; ph.style.display = 'block';
  img.onload = () => { img.style.display = 'block'; ph.style.display = 'none'; };
  img.onerror = () => { if (++k < IMAGE_EXT.length) img.src = base + IMAGE_EXT[k]; };
  img.src = base + IMAGE_EXT[0];
}
function startQuestion(level, idx) {
  stopTimer(); G.level = level; G.idx = idx; G.busy = false; S.last = level; save();
  const L = cur(); G.review = idx < L.q;
  const card = $('#card'), inp = $('#answer'), timed = idx === 14 && !G.review;
  card.className = 'card' + (timed ? ' timed' : '');
  $('#fb').className = 'fb';
  inp.disabled = G.review; inp.value = G.review ? ans() : '';
  $('#bCheck').textContent = G.review ? 'Weiter' : 'Prüfen';
  const c = $('#counter'); c.className = 'counter' + (timed ? ' timer' : ''); c.textContent = `${idx + 1}/15`;
  drawHearts(); loadImage(); renderHint(); show('game');
  if (timed) { Snd.setMode('tense', level); startTimer(); } else { Snd.setMode('calm', level); if (!G.review) setTimeout(() => inp.focus(), 50); }
}

/* ---- hint: 1 = jenis kata/artikel, 2 = jumlah huruf, 3-5 = huruf dibuka ---- */
function parts(a) { const m = a.match(/^(der|die|das) (.+)$/i); return m ? m[2] : a; }
function revealOrder(word) {
  const ix = [...word].map((c, i) => i).filter(i => word[i] !== ' '), o = [ix[0], ix[ix.length - 1], ix[Math.floor(ix.length / 2)]];
  const first = [...new Set(o)]; return first.concat(ix.filter(i => !first.includes(i)));
}
function renderHint() {
  const s = $('#hintStrip'), L = cur(), a = ans(), h = item()[1];
  if (G.review) { s.style.display = 'block'; s.innerHTML = '✔ ' + a; return; }
  const step = L.steps[G.idx] || 0;
  if (!h || step === 0) { s.style.display = 'none'; return; }
  let html = '💡 Hinweis: <b>' + h + '</b>';
  if (step >= 2) {
    const w = parts(a), rev = revealOrder(w).slice(0, Math.max(0, step - 2)), n = [...w].filter(c => c !== ' ').length;
    const pat = [...w].map((c, i) => c === ' ' ? '&nbsp;&nbsp;' : rev.includes(i) ? c.toUpperCase() : '_').join(' ');
    html += `<br><span class="pat">${pat}</span> (${n})`;
  }
  s.style.display = 'block'; s.innerHTML = html;
}
$('#lamp').onclick = () => {
  if (G.review || G.busy) return;
  if (G.idx === 14) { toast('Bei Frage 15 gibt es keine Hinweise!'); return; }
  const L = cur(), step = L.steps[G.idx] || 0;
  if (step >= 5) { toast('Alle Hinweise dieser Frage benutzt'); return; }
  if (L.hints <= 0) { toast('Keine Hinweise mehr in diesem Level!'); Snd.wrong(); shake($('#lamp')); return; }
  L.hints--; L.steps[G.idx] = step + 1; save(); Snd.hint(); drawHearts(); renderHint();
};

/* ---- timer (soal 15) ---- */
function startTimer() { G.endAt = Date.now() + DATA[G.level - 1].time * 1000; G.lastSec = null; drawTimer(); G.timerId = setInterval(drawTimer, 200); }
function stopTimer() { clearInterval(G.timerId); G.timerId = null; }
function drawTimer() {
  const r = Math.max(0, Math.ceil((G.endAt - Date.now()) / 1000)), c = $('#counter');
  c.textContent = `⏱ ${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`;
  if (r !== G.lastSec) { G.lastSec = r; if (r <= 10 && r > 0) Snd.tick(); Snd.bpm = r <= 10 ? Snd.base + 35 : Snd.base; c.classList.toggle('low', r <= 10); }
  if (r <= 0) { stopTimer(); if (!penalty('Zeit abgelaufen!')) startTimer(); }
}

/* ---- jawab ---- */
function penalty(title) {
  const L = cur(); L.lives--; save(); drawHearts(); const card = $('#card');
  card.classList.add('bad'); setTimeout(() => card.classList.remove('bad'), 500); shake($('#answer'));
  if (L.lives <= 0) { G.busy = true; stopTimer(); Snd.lose(); setTimeout(gameOver, 700); return true; }
  Snd.wrong(); Snd.say(title + ' Versuch es noch einmal!');
  feedback('bad');
  toast(`Noch ${L.lives} ${L.lives === 1 ? 'Leben' : 'Leben'}`);
  return false;
}
function submit() {
  if (G.busy) return;
  if (G.review) { G.idx < 14 ? startQuestion(G.level, G.idx + 1) : openGrid(G.level); return; }
  const v = norm($('#answer').value); if (!v) return;
  const ok = item().filter((x, i) => i !== 1 && x).map(norm);
  if (ok.includes(v)) {
    G.busy = true; stopTimer(); Snd.correct(); Snd.say('Wunderbar!'); feedback('ok');
    $('#card').classList.add('ok'); $('#answer').value = ans();
    const L = cur(); L.q = Math.max(L.q, G.idx + 1); save();
    setTimeout(() => G.idx < 14 ? startQuestion(G.level, G.idx + 1) : levelComplete(), 1200);
  } else { penalty('Fast!'); $('#answer').select(); }
}
$('#bCheck').onclick = submit;
$('#answer').addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
$('#bGameBack').onclick = () => { if (!G.busy) openGrid(G.level); };

/* Nyawa habis: mundur 5 soal (di level yang sama), soal setelahnya terkunci lagi, nyawa kembali penuh */
function gameOver() {
  const n = G.level, back = Math.max(0, G.idx - ROLLBACK);
  feedback('over', () => {
    const L = S.levels[n]; L.q = Math.min(L.q, back); L.lives = START_LIVES;
    save(); G.busy = false; openGrid(n);
  });
}
function levelComplete() {
  const n = G.level; Snd.win(); stopTimer();
  if (n < LEVELS && !S.unlocked.includes(n + 1)) S.unlocked.push(n + 1);
  save();
  modal(n < LEVELS ? 'Level geschafft!' : 'Glückwunsch!', n < LEVELS ? `Level ${n + 1} ist freigeschaltet!` : 'Du hast alle Level geschafft. Toll gemacht!',
    [{ label: 'Weiter', fn: () => { G.busy = false; renderPlay(); show('play'); } }]);
}

/* ================== LANJUT DARI TERAKHIR ================== */
if (S.last && S.levels[S.last] && S.levels[S.last].q > 0) openGrid(S.last);
