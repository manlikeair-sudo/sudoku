/* 완료 축하 효과 — 캔버스/CSS + 강아지 일러스트(dogs/*.webp|png). 탭하면 닫히고, 움직임 줄이기 설정에서는 부드러운 버전으로 보여 줍니다. */
(function (root) {
  'use strict';
  var IDX_KEY = 'sudoku.fx.idx', DOG_KEY = 'sudoku.fx.dog', DOGN_KEY = 'sudoku.fx.dogn';
  var BOTH_EVERY = 5;                                   // 강아지 순서 5번에 1번은 두 마리가 함께
  // 완료할 때마다 순서대로 돌아가며 보여 줍니다. 강아지는 2번에 1번, 갈색/흰색이 번갈아 나옵니다.
  var SEQ = ['fireworks', 'dog', 'confetti', 'dog', 'balloons', 'dog', 'stars', 'dog'];
  var CHEERS = ['완성! 최고예요 🎉', '정말 잘했어요! 👏', '대단해요! ✨', '오늘도 해냈어요! 🌷'];
  var DOG_CHEER = '완성이에요! 멍멍 🐶💕';
  var PASTEL = ['#FFB3C7', '#FFD3A5', '#FFF1A8', '#BDF2C8', '#A5EDF7', '#A9C8FF', '#CDBFFF', '#FFC8F2'];
  var GOLD = ['#FFE08A', '#FFF3B0', '#FFD1E8', '#CDEBFF', '#FFFFFF'];
  var SPR = {};

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function reducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

  // ---- 효과 순서 (localStorage에 저장) ----
  function next() {
    var idx = parseInt(lsGet(IDX_KEY), 10); if (!(idx >= 0)) idx = 0;
    var effect = SEQ[idx % SEQ.length];
    lsSet(IDX_KEY, String(idx + 1));
    var out = { effect: effect, dog: null, index: idx };
    if (effect === 'dog') {
      var n = parseInt(lsGet(DOGN_KEY), 10); if (!(n >= 0)) n = 0;
      lsSet(DOGN_KEY, String(n + 1));
      out.dog = (n + 1) % BOTH_EVERY === 0 ? 'both' : takeDog();     // 두 마리일 때는 갈색/흰색 번갈아 순서를 건드리지 않음
    }
    return out;
  }
  function takeDog() {
    var d = lsGet(DOG_KEY) === 'white' ? 'white' : 'brown';
    lsSet(DOG_KEY, d === 'brown' ? 'white' : 'brown');
    return d;
  }

  // ---- 스프라이트 ----
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function sprite(color) {
    if (SPR[color]) return SPR[color];
    var c = document.createElement('canvas'); c.width = c.height = 96;
    var x = c.getContext('2d'), g = x.createRadialGradient(48, 48, 0, 48, 48, 46);
    g.addColorStop(0, rgba(color, 0.95)); g.addColorStop(0.6, rgba(color, 0.6)); g.addColorStop(1, rgba(color, 0));
    x.fillStyle = g; x.beginPath(); x.arc(48, 48, 46, 0, 6.2832); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.28)'; x.lineWidth = 2; x.beginPath(); x.arc(48, 48, 33, 0, 6.2832); x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.arc(37, 36, 7, 0, 6.2832); x.fill();
    SPR[color] = c; return c;
  }

  // ---- 상태 ----
  var layer = null, canvas = null, ctx = null, raf = 0, endTimer = 0, outTimer = 0, guardTimer = 0;
  var W = 0, H = 0, DPR = 1, T = 0, last = 0, parts = [], sched = [], cur = null, RM = false;

  function resize() {
    if (!layer) return;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = layer.clientWidth; H = layer.clientHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  // ---- 각 효과 ----
  var EFFECTS = {};

  // a. 뭉글뭉글 불꽃놀이: 둥글고 말랑한 파스텔 방울이 천천히 퍼졌다가 사라집니다. 번쩍임/큰 소리 느낌 없음.
  EFFECTS.fireworks = {
    duration: 7000,
    init: function () {
      var times = RM ? [0, 900, 1900] : [0, 500, 1100, 1700, 2300, 2900, 3600];
      times.forEach(function (t) { sched.push({ at: t, fn: burst }); });
    }
  };
  function burst() {
    var x = rnd(W * 0.15, W * 0.85), y = rnd(H * 0.14, H * 0.46), base = pick(PASTEL), n = RM ? 14 : 26, k = 0, i;
    var sp = Math.min(W, H) / 700, slow = RM ? 0.35 : 1;
    parts.push({ x: x, y: y, vx: 0, vy: 0, age: 0, life: RM ? 2.2 : 1.4, size: 150 * sp + 40, spr: sprite(base), maxA: 0.22, grow: 1.3, drag: 1 });
    for (i = 0; i < n; i++) {
      var a = (i / n) * 6.2832 + rnd(-0.12, 0.12), s = rnd(45, 115) * sp * slow;
      parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, age: 0, life: rnd(1.9, 2.8) * (RM ? 1.4 : 1),
        size: rnd(15, 28) * (0.8 + sp * 0.4), spr: sprite(i % 3 === 0 ? pick(PASTEL) : base), maxA: 0.9, g: 16, drag: 0.982 });
      if (i % 2 === 0) {
        var s2 = s * 0.5;
        parts.push({ x: x, y: y, vx: Math.cos(a + 0.2) * s2, vy: Math.sin(a + 0.2) * s2, age: 0, life: rnd(1.6, 2.3),
          size: rnd(9, 15), spr: sprite(pick(PASTEL)), maxA: 0.8, g: 14, drag: 0.98 });
      }
    }
  }

  // c1. 색종이 비
  EFFECTS.confetti = {
    duration: 7500,
    init: function () {
      var n = RM ? 36 : 90;
      for (var i = 0; i < n; i++) sched.push({ at: rnd(0, 4200), fn: confettiPiece });
    }
  };
  function confettiPiece() {
    parts.push({ kind: 'conf', x: rnd(0, W), y: -20, vy: rnd(60, 120) * (RM ? 0.45 : 1), sway: RM ? 0 : rnd(15, 40), ph: rnd(0, 6.28),
      rot: rnd(0, 6.28), vr: RM ? 0 : rnd(-2, 2), w: rnd(9, 16), h: rnd(6, 11), color: pick(PASTEL), shape: Math.floor(rnd(0, 3)), age: 0, life: 99, maxA: 0.92 });
  }

  // c2. 풍선과 하트
  EFFECTS.balloons = {
    duration: 8000,
    init: function () {
      var i, nb = RM ? 6 : 10, nh = RM ? 8 : 20;
      for (i = 0; i < nb; i++) sched.push({ at: rnd(0, 3500), fn: balloon });
      for (i = 0; i < nh; i++) sched.push({ at: rnd(0, 4200), fn: function () { heart(false); } });
    }
  };
  function balloon() {
    var s = rnd(30, 46);
    parts.push({ kind: 'balloon', x: rnd(W * 0.06, W * 0.94), y: H + s * 3.2, vy: -rnd(70, 115) * (RM ? 0.5 : 1), sway: RM ? 0 : rnd(10, 26), ph: rnd(0, 6.28),
      s: s, color: pick(PASTEL), age: 0, life: 99, maxA: 1 });
  }
  function heart(small) {
    var s = small ? rnd(9, 15) : rnd(12, 24);
    parts.push({ kind: 'heart', x: rnd(W * 0.05, W * 0.95), y: H + 30, vy: -rnd(55, 100) * (RM ? 0.5 : 1), sway: RM ? 0 : rnd(12, 30), ph: rnd(0, 6.28),
      s: s, color: pick(['#FFB3C7', '#FF9DB8', '#FFC8F2', '#FFD3DE']), age: 0, life: 99, maxA: 0.9 });
  }

  // c3. 반짝이 별
  EFFECTS.stars = {
    duration: 7000,
    init: function () {
      [0, 900, 1800].forEach(function (t) { sched.push({ at: t, fn: starWave }); });
    }
  };
  function starWave() {
    var x = rnd(W * 0.25, W * 0.75), y = rnd(H * 0.2, H * 0.5), n = RM ? 10 : 18, sp = Math.min(W, H) / 700;
    for (var i = 0; i < n; i++) {
      var a = rnd(0, 6.2832), s = rnd(40, 150) * sp * (RM ? 0.4 : 1);
      parts.push({ kind: 'star', x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 0.985, g: 6, r: rnd(9, 20) * (0.8 + sp * 0.4),
        color: pick(GOLD), four: Math.random() < 0.55, rot: rnd(0, 6.28), vr: RM ? 0 : rnd(-0.8, 0.8), tw: rnd(3, 6), ph: rnd(0, 6.28),
        age: 0, life: rnd(2.2, 3.2), maxA: 0.95 });
    }
    parts.push({ x: x, y: y, vx: 0, vy: 0, age: 0, life: 1.4, size: 180 * sp + 40, spr: sprite('#FFE9A8'), maxA: 0.2, grow: 1.2, drag: 1 });
  }

  // 강아지 효과: 강아지 주변에 작은 하트와 반짝이, 배경엔 은은한 하트
  function dogSparkle(k) {
    var els = layer ? layer.querySelectorAll('.fxDog') : [];
    if (!els.length) return;
    var b = els[k % els.length].getBoundingClientRect(), lb = layer.getBoundingClientRect();
    var x = b.left - lb.left + rnd(-0.1, 1.1) * b.width, y = b.top - lb.top + rnd(0.05, 0.85) * b.height;
    if (k % 2 === 0) {
      parts.push({ kind: 'heart', x: x, y: y, vy: -rnd(30, 60) * (RM ? 0.5 : 1), sway: RM ? 0 : rnd(8, 18), ph: rnd(0, 6.28), s: rnd(7, 13),
        color: pick(['#FFB3C7', '#FF9DB8', '#FFC8F2', '#FFD3DE']), age: 0, life: rnd(1.7, 2.5), maxA: 0.95 });
    } else {
      parts.push({ kind: 'star', x: x, y: y, vx: rnd(-14, 14), vy: -rnd(4, 22), drag: 0.99, g: 0, r: rnd(6, 12), color: pick(GOLD), four: true, rot: rnd(0, 6.28),
        vr: RM ? 0 : rnd(-0.8, 0.8), tw: rnd(4, 7), ph: rnd(0, 6.28), age: 0, life: rnd(1.1, 1.8), maxA: 0.95 });
    }
  }
  EFFECTS.dog = {
    duration: 9500,
    init: function () {
      var i, n = RM ? 5 : 10, step = RM ? 650 : 230;
      for (i = 0; i < n; i++) sched.push({ at: rnd(400, 6500), fn: function () { heart(true); } });
      for (i = 0; (RM ? 1500 : 1300) + i * step < 8600; i++) (function (k) { sched.push({ at: (RM ? 1500 : 1300) + k * step, fn: function () { dogSparkle(k); } }); })(i);
    }
  };

  // ---- 그리기 ----
  function heartPath(c, s) {
    c.beginPath(); c.moveTo(0, s * 0.35);
    c.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.5, -s * 1.05, 0, -s * 0.4);
    c.bezierCurveTo(s * 0.5, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35); c.closePath();
  }
  function starPath(c, r, four) {
    var i;
    c.beginPath();
    if (four) {
      c.moveTo(0, -r); c.quadraticCurveTo(0, 0, r, 0); c.quadraticCurveTo(0, 0, 0, r);
      c.quadraticCurveTo(0, 0, -r, 0); c.quadraticCurveTo(0, 0, 0, -r);
    } else {
      for (i = 0; i < 10; i++) {
        var rr = i % 2 ? r * 0.5 : r, a = -1.5708 + i * 0.6283;
        if (i) c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      c.closePath();
    }
  }
  function drawPart(p) {
    var f = p.life < 90 ? Math.max(0, 1 - p.age / p.life) : 1;
    var inA = Math.min(1, p.age / 0.25);
    var a = p.maxA * inA * (p.life < 90 ? Math.pow(f, 0.8) : 1);
    if (p.kind === 'conf') {
      if (p.y > H * 0.88) a *= Math.max(0, (H + 30 - p.y) / (H * 0.12 + 30));
      ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
      if (p.shape === 0) { ctx.beginPath(); ctx.arc(0, 0, p.h * 0.55, 0, 6.2832); ctx.fill(); }
      else if (p.shape === 1) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, 3); else ctx.rect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.fill(); }
      else { ctx.fillRect(-p.w * 0.9, -2, p.w * 1.8, 4); }
      ctx.restore();
    } else if (p.kind === 'heart') {
      var pulse = 1 + (RM ? 0 : 0.08 * Math.sin(T * 4 + p.ph));
      ctx.save(); ctx.globalAlpha = a * Math.min(1, Math.max(0, p.y / (H * 0.2))); ctx.translate(p.x, p.y); ctx.scale(pulse, pulse);
      ctx.fillStyle = p.color; heartPath(ctx, p.s); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.arc(-p.s * 0.38, -p.s * 0.42, p.s * 0.14, 0, 6.2832); ctx.fill();
      ctx.restore();
    } else if (p.kind === 'balloon') {
      var s = p.s, rx = s * 0.8, ry = s;
      ctx.save(); ctx.globalAlpha = a * 0.95; ctx.translate(p.x, p.y);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, ry + 6);
      var sw = RM ? 0 : Math.sin(T * 3 + p.ph) * 6;
      ctx.bezierCurveTo(sw, ry + 24, -sw, ry + 40, sw * 0.5, ry + s * 2.6); ctx.stroke();
      var g = ctx.createRadialGradient(-rx * 0.35, -ry * 0.4, s * 0.1, 0, 0, ry * 1.1);
      g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.25, p.color); g.addColorStop(1, p.color);
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.moveTo(0, ry - 1); ctx.lineTo(-6, ry + 8); ctx.lineTo(6, ry + 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-rx * 0.42, -ry * 0.45, rx * 0.16, ry * 0.26, -0.5, 0, 6.2832); ctx.fill();
      ctx.restore();
    } else if (p.kind === 'star') {
      var tw = RM ? 1 : 0.65 + 0.35 * Math.sin(T * p.tw + p.ph);
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.globalAlpha = a * 0.25; ctx.drawImage(sprite('#FFE9A8'), -p.r * 2, -p.r * 2, p.r * 4, p.r * 4);
      ctx.globalAlpha = a * tw; ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.strokeStyle = p.color; ctx.lineJoin = 'round'; ctx.lineWidth = p.four ? 0 : 3;
      starPath(ctx, p.r, p.four); ctx.fill(); if (!p.four) ctx.stroke();
      ctx.restore();
    } else if (p.spr) {
      var sz = p.size * (p.grow ? 1 + (p.grow - 1) * (p.age / p.life) : 1 - 0.3 * (p.age / p.life));
      ctx.globalAlpha = a; ctx.drawImage(p.spr, p.x - sz / 2, p.y - sz / 2, sz, sz); ctx.globalAlpha = 1;
    }
  }

  function frame(now) {
    if (!layer) return;
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; T += dt;
    var i, ms = T * 1000;
    for (i = sched.length - 1; i >= 0; i--) if (sched[i].at <= ms) { var s = sched.splice(i, 1)[0]; s.fn(); }
    ctx.clearRect(0, 0, W, H);
    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.age += dt;
      if (p.drag && p.drag !== 1) { var d = Math.pow(p.drag, dt * 60); p.vx *= d; p.vy *= d; }
      if (p.g) p.vy += p.g * dt;
      if (p.kind === 'conf' || p.kind === 'heart' || p.kind === 'balloon') {
        p.y += (p.vy || 0) * dt; p.x += Math.cos(T * 1.6 + p.ph) * (p.sway || 0) * dt; if (p.vr) p.rot += p.vr * dt;
        if (p.life < 90 && p.age >= p.life) { parts.splice(i, 1); continue; }
        if ((p.vy > 0 && p.y > H + 40) || (p.vy < 0 && p.y < -(p.s || 0) * 4 - 40)) { parts.splice(i, 1); continue; }
      } else {
        p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; if (p.vr) p.rot += p.vr * dt;
        if (p.age >= p.life) { parts.splice(i, 1); continue; }
      }
      drawPart(p);
    }
    raf = requestAnimationFrame(frame);
  }

  // ---- 강아지 (일러스트 스프라이트) ----
  var AR = 281 / 600;                                   // 스프라이트 가로/세로 비율
  function dogHTML(kind, side, delay) {
    return '<div class="fxDog ' + kind + '" data-dog="' + kind + '" data-side="' + side + '" style="--ex:' + (side === 'left' ? '-95vw' : '95vw') + ';--ad:' + (delay || 0) + 's">' +
      '<div class="dogshadow"></div><div class="dogspin"><div class="dogwig"><picture>' +
      '<source type="image/webp" srcset="dogs/dog-' + kind + '.webp">' +
      '<img class="dogimg" src="dogs/dog-' + kind + '.png" alt="" draggable="false"></picture></div></div></div>';
  }
  function dogKinds(which) { return which === 'both' ? ['white', 'brown'] : [which]; }
  function preload() {
    try {
      var h = document.createElement('div'); h.setAttribute('aria-hidden', 'true');
      h.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
      h.innerHTML = dogHTML('white', 'left').replace('class="fxDog', 'class="x') + dogHTML('brown', 'right').replace('class="fxDog', 'class="x');
      document.body.appendChild(h); setTimeout(function () { h.remove(); }, 8000);
    } catch (e) {}
  }

  // ---- 재생 / 정지 ----
  function onTap() { stop(); }
  function placeDogs() {
    if (!layer) return;
    var els = layer.querySelectorAll('.fxDog'); if (!els.length) return;
    var card = document.querySelector('#done .card'), vw = layer.clientWidth, vh = layer.clientHeight;
    var r = card && !card.closest('[hidden]') ? card.getBoundingClientRect() : { top: vh * 0.55, bottom: vh * 0.55, left: vw * 0.5, right: vw * 0.5 };
    var top0 = Math.max(96, vh * 0.05 + 70);              // 응원 문구 아래부터
    var side = Math.min(r.left, vw - r.right), roomA = r.top - top0 - 8;
    var wB = side - 12, hB = Math.min(wB / AR, vh - top0 - 24, 580);
    var hA = Math.min(Math.max(roomA, 0), 330);
    var both = els.length > 1, mode = hB >= 150 && (hB > hA * 1.1 || both) ? 'side' : 'above';
    for (var i = 0; i < els.length; i++) {
      var el = els[i], left = el.getAttribute('data-side') === 'left', w, h, x, y;
      if (mode === 'side') {
        h = hB; w = h * AR;
        x = left ? (r.left - w) / 2 : r.right + (vw - r.right - w) / 2;
        y = Math.max(top0, Math.min(r.bottom, vh - 24) - h);
      } else if (both) {
        h = Math.max(110, Math.min(hA, (vw / 2 - 16) / AR)); w = h * AR;
        x = vw / 2 + (left ? -w - 6 : 6); y = Math.max(top0, r.top - 8 - h);
      } else {
        h = Math.max(110, hA); w = h * AR; x = vw / 2 - w / 2; y = Math.max(top0, r.top - 8 - h);
      }
      el.style.width = Math.round(w) + 'px'; el.style.height = Math.round(h) + 'px';
      el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px';
    }
  }

  function play(opts) {
    stop(true);
    opts = opts || {};
    var pickd = opts.effect ? { effect: opts.effect, dog: opts.dog || (opts.effect === 'dog' ? takeDog() : null) } : next();   // dog: 'brown' | 'white' | 'both'
    if (pickd.effect === 'dog' && !pickd.dog) pickd.dog = takeDog();
    RM = reducedMotion();
    var app = document.getElementById('app') || document.body;
    layer = document.createElement('div'); layer.id = 'fx'; layer.setAttribute('aria-hidden', 'true');
    layer.className = RM ? 'rm' : '';
    canvas = document.createElement('canvas'); layer.appendChild(canvas);
    var cheer = document.createElement('div'); cheer.className = 'fxCheer';
    cheer.textContent = pickd.effect === 'dog' ? DOG_CHEER : CHEERS[(pickd.index || 0) % CHEERS.length];
    layer.appendChild(cheer);
    app.appendChild(layer);
    ctx = canvas.getContext('2d'); resize();
    parts = []; sched = []; T = 0; last = performance.now(); cur = { effect: pickd.effect, dog: pickd.dog };
    var eff = EFFECTS[pickd.effect]; eff.init();
    if (pickd.effect === 'dog') {
      var ks = dogKinds(pickd.dog), html = '';
      for (var k = 0; k < ks.length; k++) html += dogHTML(ks[k], ks[k] === 'white' ? 'left' : 'right', k * 0.35);
      layer.insertAdjacentHTML('beforeend', html); placeDogs();
    }
    window.addEventListener('resize', onResize);
    raf = requestAnimationFrame(frame);
    endTimer = setTimeout(function () { stop(); }, eff.duration);
    guardTimer = setTimeout(function () { document.addEventListener('pointerdown', onTap, true); }, 500);
    return cur;
  }
  function onResize() {
    resize();
    placeDogs();
  }

  function stop(immediate) {
    clearTimeout(endTimer); clearTimeout(guardTimer); cancelAnimationFrame(raf);
    document.removeEventListener('pointerdown', onTap, true);
    window.removeEventListener('resize', onResize);
    var l = layer; layer = null; cur = null; parts = []; sched = [];
    if (!l) return;
    if (immediate) { l.remove(); return; }
    l.classList.add('out'); clearTimeout(outTimer); outTimer = setTimeout(function () { l.remove(); }, 450);
  }

  setTimeout(preload, 2500);
  root.SudokuFX = {
    play: play, stop: stop, next: next, preload: preload, SEQ: SEQ,
    state: function () { return cur ? { running: true, effect: cur.effect, dog: cur.dog } : { running: false }; }
  };
})(window);
