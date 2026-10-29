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

  // ---- 강아지 (SVG) : 옆모습 전신 파피용 ----
  // 오른쪽을 보고 달리는/뛰는 작은 파피용. 가는 네 다리, 비단결 털(술), 등 위로 말려 올라간 깃털 꼬리, 나비 같은 큰 귀.
  function dogSVG(kind) {
    var brown = kind === 'brown', id = '-' + kind;
    var C = brown ? {
      head: '#D9822E', headHi: '#F0A95B', headLo: '#B8641F', earA: '#E3924A', earB: '#BF6A24', earIn: '#F6D2A6', strand: '#A9571A',
      body: '#FFFFFF', bodyLo: '#EFE5D8', line: '#DCCDB9', patchA: '#E8993F', patchB: '#C4701F', far: '#EFE6DA', farLine: '#D8C9B4',
      nose: '#1B181B', eye: '#241917', brow: '#F2B877', tail: '#FFFFFF', tailLo: '#EADFCF'
    } : {
      head: '#FFF8EC', headHi: '#FFFFFF', headLo: '#EBDCC6', earA: '#FFF9EF', earB: '#F1E2CC', earIn: '#F7BDB8', strand: '#E2CFB3',
      body: '#FFF8EC', bodyLo: '#EFE2CE', line: '#E6D6BF', patchA: '#F3D0A8', patchB: '#E6B98B', far: '#F3E8D6', farLine: '#E0D0B8',
      nose: '#85544F', eye: '#2F1C18', brow: '#EFC9A0', tail: '#FFFAF2', tailLo: '#EEDFC8'
    };
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" class="dogsvg" aria-hidden="true">';
    s += '<defs>' +
      '<linearGradient id="gb' + id + '" gradientUnits="userSpaceOnUse" x1="0" y1="150" x2="0" y2="242"><stop offset="0" stop-color="' + C.body + '"/><stop offset="1" stop-color="' + C.bodyLo + '"/></linearGradient>' +
      '<linearGradient id="gp' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + C.patchA + '"/><stop offset="1" stop-color="' + C.patchB + '"/></linearGradient>' +
      '<linearGradient id="gh' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + C.headHi + '"/><stop offset=".55" stop-color="' + C.head + '"/><stop offset="1" stop-color="' + C.headLo + '"/></linearGradient>' +
      '<linearGradient id="ge' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + C.earA + '"/><stop offset="1" stop-color="' + C.earB + '"/></linearGradient>' +
      '<linearGradient id="gt' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + C.tail + '"/><stop offset="1" stop-color="' + C.tailLo + '"/></linearGradient>' +
      '<clipPath id="cb' + id + '"><path d="M205,158 C170,152 130,154 108,170 C92,182 94,214 112,226 C140,240 190,240 232,230 C252,224 260,200 252,184 C246,168 228,160 205,158 Z"/></clipPath>' +
      '</defs>';
    s += '<ellipse cx="190" cy="297" rx="140" ry="9" fill="#000" opacity=".13"/>';
    s += '<g class="dogbow">';
    // ---- 꼬리 (등 위로 휘어 올라간 깃털 꼬리) ----
    s += '<g class="tail"><g transform="translate(116 186) scale(.82) translate(-116 -186)">';
    if (brown) {
      s += '<path d="M116,186 C90,180 66,152 64,122 L54,116 C58,108 66,104 70,100 L62,90 C74,84 84,78 92,72 L88,60 C104,60 116,54 128,52 L128,42 C144,48 156,52 168,58 L174,48 C186,58 200,70 204,86 L214,84 C214,100 208,112 200,124 C188,106 168,96 146,100 C126,104 116,124 122,150 C124,164 122,176 116,186 Z" fill="url(#gt' + id + ')" stroke="' + C.line + '" stroke-width="2.2" stroke-linejoin="round"/>';
      s += '<path d="M116,186 C100,182 86,170 78,154 C96,160 110,166 122,150 C124,164 122,176 116,186 Z" fill="url(#gp' + id + ')"/>';
    } else {
      s += '<path d="M116,186 C88,180 64,154 62,126 L50,124 C54,114 62,108 68,106 L58,96 C70,90 80,84 88,78 L82,66 C98,66 112,60 124,56 L126,44 C140,50 154,54 166,60 L174,50 C188,60 202,72 206,88 L216,88 C214,104 206,114 196,122 L204,126 C196,140 178,146 164,138 C152,130 156,116 168,116 C160,104 142,104 132,116 C122,132 126,158 124,170 C122,176 120,182 116,186 Z" fill="url(#gt' + id + ')" stroke="' + C.line + '" stroke-width="2.2" stroke-linejoin="round"/>';
    }
    s += '<path d="M72,126 C74,98 104,72 142,70 M92,128 C94,108 114,86 144,84 M166,70 C186,74 196,86 198,98" fill="none" stroke="' + C.tailLo + '" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>';
    s += '</g></g>';
    // ---- 먼 쪽 다리 ----
    function leg(cls, d, px, py, fill, line, fur) {
      return '<g class="leg ' + cls + '">' + (fur || '') +
        '<path d="' + d + '" fill="none" stroke="' + line + '" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="' + d + '" fill="none" stroke="' + fill + '" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<ellipse cx="' + px + '" cy="' + py + '" rx="13" ry="6.4" fill="' + fill + '" stroke="' + line + '" stroke-width="2.2"/>' +
        '<path d="M' + (px - 3) + ',' + (py - 3) + ' v5 M' + (px + 3) + ',' + (py - 3) + ' v5" stroke="' + line + '" stroke-width="1.6" stroke-linecap="round"/></g>';
    }
    s += leg('legFH', 'M156,216 C148,236 140,250 138,262 L138,286', 146, 290, C.far, C.farLine);
    s += leg('legFF', 'M256,216 L264,258 L268,286', 276, 290, C.far, C.farLine);
    // ---- 몸 ----
    s += '<g class="dbody">';
    s += '<path d="M206,160 C232,152 250,136 256,116 L284,134 C284,160 276,188 262,206 C246,232 222,236 206,228 Z" fill="url(#gb' + id + ')"/>';
    s += '<path d="M284,134 C284,160 276,188 262,206" fill="none" stroke="' + C.line + '" stroke-width="2.2" stroke-linecap="round"/>';
    s += '<path d="M205,158 C170,152 130,154 108,170 C92,182 94,214 112,226 C140,240 190,240 232,230 C252,224 260,200 252,184 C246,168 228,160 205,158 Z" fill="url(#gb' + id + ')" stroke="' + C.line + '" stroke-width="2.2"/>';
    s += '<g clip-path="url(#cb' + id + ')">';
    if (brown) {
      s += '<path d="M86,150 L226,150 C232,168 222,184 204,188 C188,192 176,184 160,192 C146,200 130,204 114,216 C98,226 90,214 86,200 Z" fill="url(#gp' + id + ')"/>';
      s += '<path d="M176,150 L188,150 L166,194 L156,196 Z" fill="#FFFFFF"/>';
    } else {
      s += '<path d="M96,160 C124,152 160,152 186,160 C170,172 150,176 132,180 C114,184 100,192 94,204 Z" fill="' + C.patchA + '" opacity=".55"/>';
    }
    s += '<path d="M100,226 C140,244 200,244 250,226 L250,246 L100,246 Z" fill="' + C.bodyLo + '" opacity=".6"/>';
    s += '<path d="M120,176 q10,-6 22,-4 M150,170 q12,-5 24,-2 M180,168 q10,-3 22,0" fill="none" stroke="' + (brown ? '#B8681F' : C.line) + '" stroke-width="2" stroke-linecap="round" opacity=".45"/>';
    s += '</g>';
    // 뒷다리 허벅지 술(깃털)
    s += '<path d="M112,206 L100,214 L110,216 L102,230 L114,226 L112,238 L124,224 C132,216 136,208 136,198 Z" fill="' + (brown ? 'url(#gp' + id + ')' : C.body) + '" stroke="' + C.line + '" stroke-width="1.8" stroke-linejoin="round"/>';
    s += '</g>';
    // ---- 가까운 쪽 다리 ----
    s += leg('legNH', 'M138,212 C128,234 118,248 116,262 L114,286', 122, 290, brown ? '#FFFFFF' : C.body, C.line);
    s += leg('legNF', 'M234,222 L240,260 L242,286', 252, 290, brown ? '#FFFFFF' : C.body, C.line);
    // ---- 머리 (목 + 얼굴 + 귀) ----
    s += '<g class="head">';
    if (brown) s += '<path d="M208,158 C230,150 248,136 258,114 L246,108 C240,132 226,146 206,150 Z" fill="url(#gp' + id + ')"/>';
    else s += '<path d="M208,158 C230,150 248,136 258,114 L248,110 C242,130 228,144 210,150 Z" fill="' + C.patchA + '" opacity=".6"/>';
    // 가슴 술
    s += '<path d="M268,196 L276,204 L262,212 L268,224 L252,222 L252,238 L238,230 L230,246 L222,232 L208,240 L210,226 C236,226 258,216 268,196 Z" fill="#FFFFFF" stroke="' + C.line + '" stroke-width="1.8" stroke-linejoin="round"/>';
    s += '<path d="M244,222 q-2,8 -6,14 M258,214 q0,8 -4,14 M228,230 q-2,6 -6,10" fill="none" stroke="' + C.bodyLo + '" stroke-width="2" stroke-linecap="round"/>';
    // 먼 쪽 귀
    s += '<g class="earF">';
    if (brown) {
      s += '<path d="M288,96 C310,92 336,76 342,48 L354,44 C350,38 344,34 338,34 L342,22 C332,20 324,22 318,28 L316,14 C306,16 298,24 296,34 L290,26 C284,38 284,54 284,72 Z" fill="' + C.earA + '" stroke="' + C.strand + '" stroke-width="1.8" stroke-linejoin="round"/>';
      s += '<path d="M344,52 C350,62 350,74 347,84 M334,62 C339,72 339,82 336,90" fill="none" stroke="' + C.strand + '" stroke-width="2" stroke-linecap="round" opacity=".6"/>';
    } else {
      s += '<path d="M284,96 C288,64 308,36 334,24 C342,52 330,82 308,100 Z" fill="' + C.earB + '" stroke="' + C.line + '" stroke-width="1.8" stroke-linejoin="round"/>';
      s += '<path d="M334,24 C338,34 338,44 334,54 C326,48 322,40 322,32 Z" fill="' + C.patchB + '" opacity=".9"/>';
    }
    s += '</g>';
    // 얼굴
    var headD = 'M246,114 C246,90 262,84 278,86 C294,88 304,100 308,112 L334,128 C340,132 340,140 334,144 C326,150 308,148 296,146 C286,154 268,156 256,148 C246,140 244,126 246,114 Z';
    s += '<path d="' + headD + '" fill="url(#gh' + id + ')" stroke="' + (brown ? C.headLo : C.line) + '" stroke-width="2.2" stroke-linejoin="round"/>';
    if (brown) {
      s += '<path d="M276,88 C284,85 292,88 294,96 C296,108 304,118 326,128 L336,132 C336,138 328,140 318,138 C300,134 290,128 284,118 C278,108 274,98 276,88 Z" fill="#FFFFFF"/>';   // 이마 흰 줄
      s += '<path d="M296,134 C308,136 326,140 336,138 C340,146 324,152 304,150 C296,150 290,146 288,140 Z" fill="#FFFFFF"/>';                                                         // 흰 주둥이
    } else {
      s += '<path d="M248,114 C248,92 262,86 278,88 C288,89 296,93 301,100 C290,104 283,112 285,124 C272,124 256,134 250,126 C248,122 248,118 248,114 Z" fill="' + C.patchA + '" opacity=".95"/>';
      s += '<ellipse cx="294" cy="112" rx="16" ry="15" fill="' + C.patchA + '" opacity=".75"/>';
      s += '<path d="M276,88 C284,85 292,88 294,96 C296,108 304,118 326,128 L336,132 C336,138 328,140 318,138 C300,134 290,128 284,118 C278,108 274,98 276,88 Z" fill="#FFFDF8"/>';
      s += '<path d="M296,134 C308,136 326,140 336,138 C340,146 324,152 304,150 C296,150 290,146 288,140 Z" fill="#FFFDF8"/>';
    }
    // 볼 술
    s += '<path d="M258,146 L246,154 L257,156 L249,168 L263,162 L266,150 Z" fill="' + (brown ? 'url(#gh' + id + ')' : '#FFFFFF') + '" stroke="' + (brown ? C.headLo : C.line) + '" stroke-width="1.6" stroke-linejoin="round"/>';
    // 눈, 눈썹 점
    s += '<circle cx="298" cy="97" r="3.4" fill="' + C.brow + '"/>';
    s += '<g class="eyes"><ellipse cx="294" cy="113" rx="8.6" ry="9.6" fill="' + C.eye + '"/><circle cx="297.5" cy="108.6" r="3.4" fill="#fff"/><circle cx="291" cy="117.5" r="1.6" fill="#fff"/></g>';
    s += '<ellipse cx="282" cy="134" rx="8" ry="5.5" fill="#FF9DB1" opacity=".45"/>';
    // 입 + 혀 + 코
    s += '<path d="M334,144 C324,155 310,153 302,146 C312,147 324,147 334,144 Z" fill="#8B2E3F"/>';
    s += '<g class="tongue"><path d="M314,149 C312,163 320,172 329,164 C332,158 330,152 328,149 Z" fill="#FF8FA3"/><path d="M321,152 v10" stroke="#E5667F" stroke-width="1.8" stroke-linecap="round"/></g>';
    s += '<path d="M334,143 C326,150 312,150 304,145" fill="none" stroke="' + C.eye + '" stroke-width="2.2" stroke-linecap="round"/>';
    s += '<ellipse cx="338" cy="133" rx="8.4" ry="7" fill="' + C.nose + '"/><ellipse cx="335.5" cy="130.5" rx="3" ry="1.8" fill="#fff" opacity=".6"/>';
    // 가까운 쪽 귀
    s += '<g class="earN">';
    if (brown) {
      s += '<path d="M276,98 C252,102 222,84 214,54 L202,48 C206,42 214,38 220,36 L216,24 C226,22 236,24 242,30 L244,16 C254,18 262,26 266,36 L274,26 C280,38 282,54 284,72 Z" fill="url(#ge' + id + ')" stroke="' + C.strand + '" stroke-width="2" stroke-linejoin="round"/>';
      s += '<path d="M270,92 C252,94 234,80 228,60 C242,62 258,72 272,88 Z" fill="' + C.earIn + '" opacity=".95"/>';
      s += '<path d="M214,58 C206,70 204,82 207,92 M224,64 C218,76 218,88 221,98 M236,72 C231,82 231,92 234,100" fill="none" stroke="' + C.strand + '" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>';
      s += '<path d="M222,34 C230,40 234,48 232,56 M244,24 C250,34 250,44 246,50" fill="none" stroke="#F8C48A" stroke-width="2" stroke-linecap="round" opacity=".8"/>';
    } else {
      s += '<path d="M262,100 C248,76 246,42 262,10 C286,28 300,58 296,94 Z" fill="url(#ge' + id + ')" stroke="' + C.line + '" stroke-width="2" stroke-linejoin="round"/>';
      s += '<path d="M262,10 C272,16 278,26 284,38 C272,40 260,36 253,27 C256,20 258,15 262,10 Z" fill="' + C.patchA + '"/>';
      s += '<path d="M268,90 C262,70 262,50 268,32 C282,48 288,68 286,90 Z" fill="' + C.earIn + '"/>';
      s += '<path d="M262,98 l-9,6 l10,-1 M254,84 l-7,5 M296,92 l5,8" fill="none" stroke="' + C.strand + '" stroke-width="2" stroke-linecap="round" opacity=".7"/>';
    }
    s += '</g>';
    s += '</g>';
    s += '</g></svg>';
    return s;
  }

  // ---- 재생 / 정지 ----
  function onTap() { stop(); }
  function placeDog(dogEl) {
    var card = document.querySelector('#done .card'), vw = layer.clientWidth, vh = layer.clientHeight;
    var r = card && !card.closest('[hidden]') ? card.getBoundingClientRect() : { top: vh * 0.5, bottom: vh * 0.5, left: vw * 0.5, right: vw * 0.5 };
    var above = r.top, side = Math.min(r.left, vw - r.right), size, x, y;
    var top0 = Math.max(96, vh * 0.05 + 70);          // 응원 문구 아래부터
    var room = above - top0 - 8, AS = 0.8;
    if (room >= 150 || above >= side) {
      size = Math.max(150, Math.min(420, room / AS, vw * 0.7));
      x = vw / 2 - size / 2; y = top0 + Math.max(0, (room - size * AS) / 2);
    } else {
      size = Math.max(150, Math.min(380, side - 16));
      x = Math.max(4, (r.left - size) / 2); y = vh / 2 - size * AS / 2;
    }
    dogEl.style.width = size + 'px'; dogEl.style.height = size * AS + 'px';
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
