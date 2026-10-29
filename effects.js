/* 완료 축하 효과 — 캔버스/CSS/SVG만 사용 (외부 자산 없음). 탭하면 닫히고, 움직임 줄이기 설정에서는 부드러운 버전으로 보여 줍니다. */
(function (root) {
  'use strict';
  var IDX_KEY = 'sudoku.fx.idx', DOG_KEY = 'sudoku.fx.dog';
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
    if (effect === 'dog') out.dog = takeDog();
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

  // 강아지 효과: 배경은 은은한 하트와 반짝이만
  EFFECTS.dog = {
    duration: 9000,
    init: function () {
      var i, n = RM ? 6 : 14;
      for (i = 0; i < n; i++) sched.push({ at: rnd(400, 6500), fn: function () { heart(true); } });
      if (!RM) sched.push({ at: 300, fn: starWave });
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
        if ((p.vy > 0 && p.y > H + 40) || (p.vy < 0 && p.y < -(p.s || 0) * 4 - 40)) { parts.splice(i, 1); continue; }
      } else {
        p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; if (p.vr) p.rot += p.vr * dt;
        if (p.age >= p.life) { parts.splice(i, 1); continue; }
      }
      drawPart(p);
    }
    raf = requestAnimationFrame(frame);
  }

  // ---- 강아지 (SVG) ----
  function dogSVG(kind) {
    var brown = kind === 'brown';
    var ear = brown ? '#A5622F' : '#FFFFFF', earEdge = brown ? '#7C4520' : '#CFCFDC', earIn = brown ? '#F2CDB5' : '#FFD9E0';
    var head = brown ? '#A5622F' : '#FFFFFF', line = brown ? '#7C4520' : '#CFCFDC', body = '#FFFFFF';
    var earPath = 'M90,70 C70,80 38,74 22,48 Q10,44 14,36 Q4,30 12,22 Q6,14 18,10 Q20,2 32,6 Q38,4 44,12 C62,22 78,40 92,56 Z';
    var earInner = 'M86,64 C70,70 46,64 32,44 Q26,32 34,24 Q42,22 50,32 C64,42 76,50 86,60 Z';
    function earG(id, flip) {
      return '<g class="' + id + '"' + (flip ? ' transform="translate(240,0) scale(-1,1)"' : '') + '>' +
        '<g class="earflap"><g transform="translate(90 62) scale(1.12 1.22) translate(-90 -62)">' +
        '<path d="' + earPath + '" fill="' + ear + '" stroke="' + earEdge + '" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="' + earInner + '" fill="' + earIn + '" opacity=".9"/>' +
        '<path d="M16,30 Q26,24 30,34 M22,16 Q32,16 36,24 M30,8 Q40,10 42,18" fill="none" stroke="' + earEdge + '" stroke-width="2" stroke-linecap="round" opacity=".55"/>' +
        '</g></g></g>';
    }
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 270" class="dogsvg" aria-hidden="true">';
    // 몸
    s += '<g class="dbody">';
    s += '<ellipse cx="120" cy="204" rx="52" ry="52" fill="' + (brown ? '#A5622F' : body) + '" stroke="' + line + '" stroke-width="2.5"/>';
    s += '<ellipse cx="120" cy="214" rx="32" ry="40" fill="#FFFFFF"/>';
    s += '<path d="M96,190 q6,10 12,0 q6,10 12,0 q6,10 12,0 q6,10 12,0" fill="none" stroke="#E4E4EE" stroke-width="2.5" stroke-linecap="round"/>';
    s += '</g>';
    // 박수 치는 앞발
    s += '<g class="pawL"><ellipse cx="80" cy="190" rx="14" ry="22" fill="#FFFFFF" stroke="' + line + '" stroke-width="2.5" transform="rotate(18 80 190)"/><path d="M74,176 v6 M81,174 v7" stroke="#E0E0EA" stroke-width="2" stroke-linecap="round"/></g>';
    s += '<g class="pawR"><ellipse cx="160" cy="190" rx="14" ry="22" fill="#FFFFFF" stroke="' + line + '" stroke-width="2.5" transform="rotate(-18 160 190)"/><path d="M166,176 v6 M159,174 v7" stroke="#E0E0EA" stroke-width="2" stroke-linecap="round"/></g>';
    // 귀 + 머리
    s += earG('earL', false) + earG('earR', true);
    s += '<ellipse cx="120" cy="104" rx="54" ry="48" fill="' + head + '" stroke="' + line + '" stroke-width="2.5"/>';
    if (brown) {
      s += '<path d="M112,58 Q120,52 128,58 L134,104 Q120,128 106,104 Z" fill="#FFFFFF"/>';           // 이마 흰 줄
      s += '<ellipse cx="90" cy="122" rx="22" ry="17" fill="#FFFFFF"/><ellipse cx="150" cy="122" rx="22" ry="17" fill="#FFFFFF"/>';
    }
    s += '<ellipse cx="120" cy="124" rx="31" ry="25" fill="#FFFFFF"/>';
    if (!brown) s += '<path d="M104,62 q16,-8 32,0" fill="none" stroke="#E6E6EF" stroke-width="3" stroke-linecap="round"/>';
    // 눈썹 점(황갈색), 눈, 볼
    s += '<circle cx="100" cy="82" r="4" fill="' + (brown ? '#E8B07A' : '#EFE3D6') + '"/><circle cx="140" cy="82" r="4" fill="' + (brown ? '#E8B07A' : '#EFE3D6') + '"/>';
    s += '<g class="eyes"><ellipse cx="100" cy="100" rx="7.5" ry="10" fill="#2A2530"/><ellipse cx="140" cy="100" rx="7.5" ry="10" fill="#2A2530"/>' +
      '<circle cx="102.5" cy="96" r="3" fill="#fff"/><circle cx="142.5" cy="96" r="3" fill="#fff"/><circle cx="98" cy="104" r="1.4" fill="#fff"/><circle cx="138" cy="104" r="1.4" fill="#fff"/></g>';
    s += '<circle cx="82" cy="120" r="8" fill="#FFB3C7" opacity=".55"/><circle cx="158" cy="120" r="8" fill="#FFB3C7" opacity=".55"/>';
    // 코, 입, 혀
    s += '<path d="M106,126 Q120,150 134,126 Z" fill="#8B2E3F"/>';
    s += '<g class="tongue"><ellipse cx="120" cy="138" rx="8" ry="8.5" fill="#FF8FA3"/><path d="M120,132 v8" stroke="#E5667F" stroke-width="1.8" stroke-linecap="round"/></g>';
    s += '<path d="M120,120 v6 M120,126 Q112,130 106,126 M120,126 Q128,130 134,126" fill="none" stroke="#2A2530" stroke-width="2.4" stroke-linecap="round"/>';
    s += '<ellipse cx="120" cy="116" rx="9.5" ry="7" fill="#2A2530"/><ellipse cx="116.5" cy="113.5" rx="3" ry="1.8" fill="#fff" opacity=".7"/>';
    s += '</svg>';
    return s;
  }

  // ---- 재생 / 정지 ----
  function onTap() { stop(); }
  function placeDog(dogEl) {
    var card = document.querySelector('#done .card'), vw = layer.clientWidth, vh = layer.clientHeight;
    var r = card && !card.closest('[hidden]') ? card.getBoundingClientRect() : { top: vh * 0.5, bottom: vh * 0.5, left: vw * 0.5, right: vw * 0.5 };
    var above = r.top, side = Math.min(r.left, vw - r.right), size, x, y;
    var top0 = Math.max(96, vh * 0.05 + 70);          // 응원 문구 아래부터
    var room = above - top0 - 8;
    if (room >= 150 || above >= side) {
      size = Math.max(110, Math.min(300, room / 1.125, vw * 0.5));
      x = vw / 2 - size / 2; y = top0 + Math.max(0, (room - size * 1.125) / 2);
    } else {
      size = Math.max(120, Math.min(320, side - 20, vh * 0.5));
      x = (r.left - size) / 2; y = vh / 2 - size / 2;
    }
    dogEl.style.width = size + 'px'; dogEl.style.height = size * 1.125 + 'px';
    dogEl.style.left = Math.round(x) + 'px'; dogEl.style.top = Math.round(y) + 'px';
  }

  function play(opts) {
    stop(true);
    opts = opts || {};
    var pickd = opts.effect ? { effect: opts.effect, dog: opts.dog || (opts.effect === 'dog' ? takeDog() : null) } : next();
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
      var d = document.createElement('div'); d.className = 'fxDog ' + pickd.dog; d.setAttribute('data-dog', pickd.dog);
      d.innerHTML = '<div class="dogspin">' + dogSVG(pickd.dog) + '</div>';
      layer.appendChild(d); placeDog(d);
    }
    window.addEventListener('resize', onResize);
    raf = requestAnimationFrame(frame);
    endTimer = setTimeout(function () { stop(); }, eff.duration);
    guardTimer = setTimeout(function () { document.addEventListener('pointerdown', onTap, true); }, 500);
    return cur;
  }
  function onResize() {
    resize();
    var d = layer && layer.querySelector('.fxDog'); if (d) placeDog(d);
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

  root.SudokuFX = {
    play: play, stop: stop, next: next, dogSVG: dogSVG, SEQ: SEQ,
    state: function () { return cur ? { running: true, effect: cur.effect, dog: cur.dog } : { running: false }; }
  };
})(window);
