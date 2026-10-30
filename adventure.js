/* 모험(레벨) 모드 — 장(챕터)별 그림 조각 공개, 선물 상자, 스티커북, 보드 색.
   진행 상황은 localStorage('sudoku.adv.v1')에만 저장되며 기존 저장/기록에는 손대지 않습니다. */
(function () {
  'use strict';
  var KEY = 'sudoku.adv.v1';
  var LEVELS = 20, MILES = [4, 8, 12, 20];
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function reducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // =============================================================== 데이터
  var DOG_NAME = { brown: '토리', white: '캐피' };
  var DOG = { brown: 'dogs/dog-brown.webp', white: 'dogs/dog-white.webp' };

  // 난이도 곡선: [쉬움 마지막 레벨, 보통 마지막 레벨] (그 뒤는 어려움). 전문가 난이도는 모험에서 쓰지 않아요.
  var CURVE = [[20, 20], [6, 20], [0, 20], [0, 8], [0, 0]];
  function diffFor(c, l) { var k = CURVE[c - 1]; return l <= k[0] ? 'easy' : (l <= k[1] ? 'medium' : 'hard'); }
  var DIFF_KO = { easy: '쉬움', medium: '보통', hard: '어려움', expert: '전문가' };

  var STICKERS = {
    s1: { name: '산책 나온 토리', dogs: ['brown'], emo: '🌼', bg: ['#C8F0C0', '#8ED88F'] },
    s2: { name: '들판의 캐피', dogs: ['white'], emo: '🌿', bg: ['#FFE0EC', '#FFB7D0'] },
    s3: { name: '신난 토리', dogs: ['brown'], emo: '🐾', bg: ['#FFF0C2', '#FFD27A'] },
    s4: { name: '탁 트인 곳의 캐피', dogs: ['white'], emo: '🌾', bg: ['#FFE3D3', '#FFB99A'] },
    s5: { name: '졸린 토리', dogs: ['brown'], emo: '💤', bg: ['#C9F0FF', '#7DD6EE'] },
    s6: { name: '쿨쿨 캐피', dogs: ['white'], emo: '🌙', bg: ['#D8F4F4', '#9FE0E2'] },
    s7: { name: '꿈나라 토리', dogs: ['brown'], emo: '☁️', bg: ['#E4EEFF', '#B7CFF7'] },
    s8: { name: '새근새근 캐피', dogs: ['white'], emo: '😴', bg: ['#EBE3FF', '#C7B8F5'] },
    s9: { name: '식물 사이 토리', dogs: ['brown'], emo: '🏠', bg: ['#FFE8C6', '#FFC98C'] },
    s10: { name: '토리와 캐피', dogs: ['brown', 'white'], emo: '💕', bg: ['#FFD9E6', '#FFA9C8'] }
  };
  var EFFECT_INFO = {
    petals: { name: '꽃잎 날리기', emo: '🌸' }, paws: { name: '발자국 총총', emo: '🐾' }, bubbles: { name: '비눗방울', emo: '🫧' },
    snow: { name: '눈꽃 내리기', emo: '❄️' }, fireflies: { name: '반딧불이', emo: '✨' }
  };
  var THEMES = {
    basic: { name: '기본 파랑', sw: ['#E8EDF7', '#8FB4F2', '#1F5FD6'] },
    mint: { name: '새싹 초록', sw: ['#E3F3E6', '#8FD3A3', '#2E8B57'],
      light: { '--peer': '#E3F3E6', '--same': '#B7E3C0', '--sel': '#8FD3A3', '--accent': '#2E8B57', '--user': '#1F7A4A' },
      dark: { '--peer': '#20322A', '--same': '#2F5A42', '--sel': '#3F7A58', '--accent': '#6FD39A', '--user': '#7FE0A8' } },
    peach: { name: '복숭아', sw: ['#FFEDE1', '#FFB48A', '#E4703A'],
      light: { '--peer': '#FFEDE1', '--same': '#FFD2B8', '--sel': '#FFB48A', '--accent': '#E4703A', '--user': '#D2562A' },
      dark: { '--peer': '#36261F', '--same': '#6A4332', '--sel': '#8C5A40', '--accent': '#FFA173', '--user': '#FFB48D' } },
    sea: { name: '바다 하늘', sw: ['#E1F2F7', '#86CDE2', '#1A8FB0'],
      light: { '--peer': '#E1F2F7', '--same': '#B5E1EE', '--sel': '#86CDE2', '--accent': '#1A8FB0', '--user': '#1578A0' },
      dark: { '--peer': '#1F3038', '--same': '#2C5566', '--sel': '#3B7388', '--accent': '#5CC6E6', '--user': '#7FD5F0' } },
    lav: { name: '눈꽃 보라', sw: ['#EEE9F9', '#B7A6EA', '#7B5CD6'],
      light: { '--peer': '#EEE9F9', '--same': '#D3C8F2', '--sel': '#B7A6EA', '--accent': '#7B5CD6', '--user': '#6A49C8' },
      dark: { '--peer': '#2A2638', '--same': '#473F73', '--sel': '#5E52A0', '--accent': '#A894F2', '--user': '#BBA9FF' } },
    rose: { name: '포근한 분홍', sw: ['#FBE9EF', '#EEA3BC', '#D6457A'],
      light: { '--peer': '#FBE9EF', '--same': '#F6C7D6', '--sel': '#EEA3BC', '--accent': '#D6457A', '--user': '#C3306A' },
      dark: { '--peer': '#38242D', '--same': '#6E3B50', '--sel': '#8E4C69', '--accent': '#FF8AB1', '--user': '#FF9FC0' } }
  };
  var THEME_KEYS = ['basic', 'mint', 'peach', 'sea', 'lav', 'rose'];

  // 장마다 선물 4개: 레벨 4 = 스티커, 8 = 새 축하 효과, 12 = 스티커, 20 = 보드 색
  var CHAPTERS = [
    { name: '공원 산책', desc: '반짝이는 공원에서 토리와 신나는 산책', who: '토리', fx: 'petals', theme: 'mint', st: ['s1', 's2'], seeds: [[590, 430], [60, 50], [590, 60], [60, 430], [300, 235, 11000]] },
    { name: '들판 나들이', desc: '탁 트인 들판에서 캐피와 산책', who: '캐피', fx: 'paws', theme: 'peach', st: ['s3', 's4'], seeds: [[590, 60], [60, 60], [60, 430], [590, 430], [320, 270, 11000]] },
    { name: '포근한 낮잠', desc: '체크무늬 쿠션 위에서 캐피가 쿨쿨', who: '캐피', fx: 'bubbles', theme: 'sea', st: ['s5', 's6'], seeds: [[60, 430], [60, 60], [590, 60], [590, 430], [320, 270, 11000]] },
    { name: '소파 위 단잠', desc: '분홍 소파에서 캐피가 새근새근', who: '캐피', fx: 'snow', theme: 'lav', st: ['s7', 's8'], seeds: [[590, 60], [60, 60], [60, 430], [590, 430], [310, 280, 11000]] },
    { name: '우리 집', desc: '식물 가득한 우리 집, 토리가 방긋', who: '토리', fx: 'fireflies', theme: 'rose', st: ['s9', 's10'], seeds: [[60, 430], [590, 430], [60, 60], [590, 60], [300, 280, 11000]] }
  ];
  function rewardFor(c, l) {
    var ch = CHAPTERS[c - 1], i = MILES.indexOf(l);
    if (i === 0) return { type: 'sticker', id: ch.st[0] };
    if (i === 1) return { type: 'effect', id: ch.fx };
    if (i === 2) return { type: 'sticker', id: ch.st[1] };
    return { type: 'theme', id: ch.theme };
  }
  function rewardName(r) {
    return r.type === 'sticker' ? STICKERS[r.id].name : r.type === 'effect' ? EFFECT_INFO[r.id].name : THEMES[r.id].name;
  }

  // =============================================================== 그림 (가족 일러스트 5장 — art/chN.webp = 4:3 지도용, chN-full = 전체, chN-th = 작은 미리보기)
  var uidN = 0;
  function sceneSVG(c, full) {
    return '<svg class="scene" viewBox="0 0 640 480" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><image href="art/ch' + c + '.webp" width="640" height="480" preserveAspectRatio="xMidYMid slice"/></svg>';
  }

  // 보로노이 조각: 5개 점으로 그림을 나눔 (0번 = 처음부터 보이는 조각, 1~4번 = 레벨 4/8/12/20에서 열림)
  function clip(poly, a, b, c) { // a*x + b*y <= c 인 쪽을 남김
    var out = [], n = poly.length, i;
    for (i = 0; i < n; i++) {
      var P = poly[i], Q = poly[(i + 1) % n], dp = a * P[0] + b * P[1] - c, dq = a * Q[0] + b * Q[1] - c;
      if (dp <= 0) out.push(P);
      if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) { var t = dp / (dp - dq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
    }
    return out;
  }
  function cells(seeds) {
    return seeds.map(function (s, i) {
      var poly = [[-2, -2], [642, -2], [642, 482], [-2, 482]];
      seeds.forEach(function (o, j) {
        if (i === j) return;
        poly = clip(poly, o[0] - s[0], o[1] - s[1], (o[0] * o[0] + o[1] * o[1] - s[0] * s[0] - s[1] * s[1] - (o[2] || 0) + (s[2] || 0)) / 2);
      });
      return poly;
    });
  }
  function centroid(poly) {
    var A = 0, cx = 0, cy = 0, n = poly.length;
    for (var i = 0; i < n; i++) {
      var p = poly[i], q = poly[(i + 1) % n], f = p[0] * q[1] - q[0] * p[1];
      A += f; cx += (p[0] + q[0]) * f; cy += (p[1] + q[1]) * f;
    }
    A /= 2; return A ? [cx / (6 * A), cy / (6 * A)] : poly[0];
  }
  function coversSVG(c, visibleFrom, liftSet, flat) {
    var gid = 'pp' + (++uidN);   // visibleFrom: 이 레벨 이상(= 아직 안 열린) 조각만 그림
    var cl = cells(CHAPTERS[c - 1].seeds), html = '';
    MILES.forEach(function (m, k) {
      if (!visibleFrom(m)) return;
      var poly = cl[k + 1], cen = centroid(poly), pts = poly.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
      html += '<g class="cover' + (liftSet && liftSet[m] ? ' pre' : '') + '" data-l="' + m + '" style="transform-origin:' + cen[0].toFixed(0) + 'px ' + cen[1].toFixed(0) + 'px">' +
        '<polygon points="' + pts + '" fill="' + (flat ? '#E8D3A6' : 'url(#' + gid + ')') + '" stroke="#B48A55" stroke-width="3.5" stroke-dasharray="3 9" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<text x="' + cen[0].toFixed(0) + '" y="' + cen[1].toFixed(0) + '" class="cvNum" text-anchor="middle" dominant-baseline="central">' + m + '</text></g>';
    });
    return '<svg class="covers" viewBox="0 0 640 480" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>' +
      '<linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EFDDB7"/><stop offset="1" stop-color="#E2CB9C"/></linearGradient></defs>' + html + '</svg>';
  }

  // 스티커
  function stickerHTML(id, size, locked) {
    var s = STICKERS[id], face = '';
    if (locked) return '<div class="stk lock" style="--s:' + size + 'px" role="img" aria-label="아직 못 받은 스티커"><div class="stkFace"><b>?</b></div></div>';
    if (s.dogs.length === 1) face = '<i style="background-image:url(' + DOG[s.dogs[0]] + ')"></i>';
    else face = '<i class="l" style="background-image:url(' + DOG[s.dogs[0]] + ')"></i><i class="r" style="background-image:url(' + DOG[s.dogs[1]] + ')"></i>';
    return '<div class="stk" role="img" aria-label="스티커: ' + esc(s.name) + '" style="--s:' + size + 'px"><div class="stkFace" style="background:linear-gradient(160deg,' + s.bg[0] + ',' + s.bg[1] + ')">' + face + '</div><span class="stkEmo">' + s.emo + '</span></div>';
  }

  // =============================================================== 저장
  function defState() { return { v: 1, cleared: [0, 0, 0, 0, 0], gifts: {}, theme: 'basic', chap: 0, pend: [] }; }
  var S = defState();
  (function load() {
    try {
      var raw = lsGet(KEY); if (!raw) return;
      var o = JSON.parse(raw), d = defState();
      if (Array.isArray(o.cleared)) for (var i = 0; i < 5; i++) d.cleared[i] = Math.max(0, Math.min(LEVELS, o.cleared[i] | 0));
      if (o.gifts && typeof o.gifts === 'object') d.gifts = o.gifts;
      if (THEMES[o.theme]) d.theme = o.theme;
      if (o.chap >= 0 && o.chap < 5) d.chap = o.chap | 0;
      if (Array.isArray(o.pend)) d.pend = o.pend.filter(function (p) { return p && p.c >= 1 && p.c <= 5 && p.l >= 1 && p.l <= LEVELS; });
      S = d;
    } catch (e) { S = defState(); }
  })();
  function save() { lsSet(KEY, JSON.stringify(S)); }
  function giftKey(c, l) { return c + '-' + l; }
  function ownedEffects() {
    var out = [];
    CHAPTERS.forEach(function (ch, i) { if (S.gifts[giftKey(i + 1, 8)] === 2) out.push(ch.fx); });
    return out;
  }
  function ownsTheme(t) { if (t === 'basic') return true; var c = THEME_KEYS.indexOf(t); return S.gifts[giftKey(c, 20)] === 2; }
  function ownsSticker(id) {
    for (var i = 0; i < 5; i++) {
      if (CHAPTERS[i].st[0] === id && S.gifts[giftKey(i + 1, 4)] === 2) return true;
      if (CHAPTERS[i].st[1] === id && S.gifts[giftKey(i + 1, 12)] === 2) return true;
    }
    return false;
  }
  function totalCleared() { return S.cleared.reduce(function (a, b) { return a + b; }, 0); }
  function syncFx() { if (window.SudokuFX && SudokuFX.setExtras) SudokuFX.setExtras(ownedEffects()); }
  function readyGifts() { return Object.keys(S.gifts).filter(function (k) { return S.gifts[k] === 1; }); }

  // =============================================================== 보드 색
  function isDark() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t === 'dark';
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  var APPLIED = [];
  function applyBoard() {
    var root = document.documentElement, th = THEMES[ownsTheme(S.theme) ? S.theme : 'basic'];
    APPLIED.forEach(function (k) { root.style.removeProperty(k); }); APPLIED = [];
    var set = th.light && (isDark() ? th.dark : th.light);
    if (!set) return;
    Object.keys(set).forEach(function (k) { root.style.setProperty(k, set[k]); APPLIED.push(k); });
  }

  // =============================================================== 앱과 연결
  var App = null;           // app.js 가 window.SudokuApp 로 넘겨 줌
  function A() { App = App || window.SudokuApp; return App; }
  function chapterLocked(c) { return c > 1 && S.cleared[c - 2] < LEVELS; }
  function nextTarget() { // 다음에 깰 레벨
    for (var c = 1; c <= 5; c++) if (S.cleared[c - 1] < LEVELS) return { c: c, l: S.cleared[c - 1] + 1 };
    return null;
  }
  // 메뉴 카드의 작은 액자: 지금 장의 그림 (열린 조각만 보임)
  function thumbHTML(c, full) {
    var done = S.cleared[c - 1];
    return '<span class="acThumb">' + sceneSVG(c) + (full ? '' : coversSVG(c, function (m) { return m > done; }, null, true)) + '</span>';
  }
  function summary() {
    var t = nextTarget();
    if (!t) return { title: '모험을 모두 마쳤어요 🎉', sub: '스티커북을 보거나 다시 놀아 보세요', ready: readyGifts().length, thumb: thumbHTML(5, true) };
    return { title: '모험 · ' + t.c + '장 ' + CHAPTERS[t.c - 1].name, sub: '레벨 ' + t.l + ' · 전체 ' + totalCleared() + '/100', ready: readyGifts().length, thumb: thumbHTML(t.c, false) };
  }
  function labelFor(adv) { return adv ? adv.c + '장 · 레벨 ' + adv.l + ' · ' + DIFF_KO[diffFor(adv.c, adv.l)] : null; }

  // 한 판을 끝냈을 때 (app.js 에서 호출): 진행도 저장하고 결과 요약을 돌려줌
  function onFinish(game) {
    var a = game.adv, c = a.c, l = a.l, cl = S.cleared[c - 1];
    var info = { c: c, l: l, diff: diffFor(c, l), replay: l <= cl, milestone: MILES.indexOf(l) >= 0, chapterDone: l === LEVELS, gift: false };
    if (info.replay) return info;
    S.cleared[c - 1] = l;
    if (info.milestone && !S.gifts[giftKey(c, l)]) { S.gifts[giftKey(c, l)] = 1; info.gift = true; }
    S.pend.push({ c: c, l: l }); S.chap = c - 1;
    if (!info.milestone && l < LEVELS) info.next = { c: c, l: l + 1 };
    info.reward = info.gift ? rewardName(rewardFor(c, l)) : null;
    save(); return info;
  }

  // =============================================================== 지도 화면
  var selLevel = 0, selChap = -1, mapToken = 0, running = false;
  function curPage() { return S.chap + 1; }
  function shownCleared(c) { return S.cleared[c - 1] - S.pend.filter(function (p) { return p.c === c; }).length; }
  var COLX = [70, 185, 300, 415, 530], ROWY = [55, 165, 275, 385];
  function nodePos(l) { var i = l - 1, r = (i / 5) | 0, k = i % 5; return [COLX[r % 2 ? 4 - k : k], ROWY[r]]; }

  var CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.8l4.2 4.2L18.6 7.6" stroke-width="3.4"/></svg>';
  var lifted = {};   // 이번에 이미 벗겨 낸 조각 (선물 창 뒤에서 다시 덮이지 않게)
  function render() {
    var c = curPage(), ch = CHAPTERS[c - 1], shown = shownCleared(c), locked = chapterLocked(c);
    if (selChap !== c) { selChap = c; selLevel = Math.min(LEVELS, shown + 1); }
    var pendSet = {}; S.pend.forEach(function (p) { if (p.c === c && MILES.indexOf(p.l) >= 0 && !lifted[c + '-' + p.l]) pendSet[p.l] = true; });
    var done = S.cleared[c - 1];
    // 그림 + 덮개 (덮개는 아직 안 열린 조각만; 막 열릴 조각은 'pre' 로 먼저 보여 줌)
    var picDone = !locked && done >= LEVELS && !S.pend.some(function (p) { return p.c === c; });
    var pic = '<div class="advPic' + (picDone ? ' done' : '') + '"' + (picDone ? ' data-act="pc" data-id="' + c + '" role="button" tabindex="0" aria-label="' + esc(c + '장 그림 크게 보기 — ' + CHAPTERS[c - 1].name) + '"' : ' role="img" aria-label="' + esc(c + '장 ' + CHAPTERS[c - 1].name + ' 그림 — ' + CHAPTERS[c - 1].who + ' (조각을 열어 보세요)') + '"') + '>' + sceneSVG(c) + coversSVG(c, function (m) { return locked || m > done || pendSet[m]; }, pendSet) +
      (locked ? '<div class="advLock"><b>🔒</b><span>' + (c - 1) + '장을 끝내면 열려요</span></div>' : '') + '</div>';
    // 진행 막대
    var gifts = MILES.map(function (m) {
      var st = S.gifts[giftKey(c, m)], cls = st === 2 ? 'opened' : (st === 1 && m <= shown ? 'ready' : (m <= shown ? '' : 'wait'));
      var inPend = pendSet[m];
      if (inPend) cls = 'wait';
      return '<button class="advGift ' + cls + '" data-act="gift" data-l="' + m + '" style="left:' + (m / LEVELS * 100) + '%" aria-label="레벨 ' + m + ' 선물">' +
        '<span class="gl">' + m + '</span><span class="gi">' + (st === 2 ? '🎀' : '🎁') + '</span></button>';
    }).join('');
    var bar = '<div class="advBar"><div class="advLv">레벨 <b id="advLvN">' + shown + '</b>/' + LEVELS + '</div><div class="advTrackWrap"><div class="advTrack"><div class="fill" id="advFill" style="width:' + (shown / LEVELS * 100) + '%"></div>' + gifts + '</div></div></div>';
    // 길
    var d = 'M70 55 H530 A55 55 0 0 1 530 165 H70 A55 55 0 0 0 70 275 H530 A55 55 0 0 1 530 385 H70';
    var nodes = '';
    for (var l = 1; l <= LEVELS; l++) {
      var pos = nodePos(l), st = locked ? 'lock' : (l <= shown ? 'done' : (l === shown + 1 ? 'cur' : 'lock'));
      var cls = 'nd ' + st + (l === selLevel && !locked ? ' sel' : '') + (MILES.indexOf(l) >= 0 ? ' mile' : '');
      nodes += '<button class="' + cls + '" data-act="node" data-l="' + l + '" style="left:' + (pos[0] / 6) + '%;top:' + (pos[1] / 4.4) + '%" aria-label="레벨 ' + l + (st === 'done' ? ' 완료' : st === 'cur' ? ' 지금 할 차례' : ' 잠김') + '">' +
        (st === 'done' ? CHECK : '<span>' + l + '</span>') + (MILES.indexOf(l) >= 0 ? '<i class="ng">🎁</i>' : '') + '</button>';
    }
    var path = '<div class="advPath"><svg viewBox="0 0 600 440" aria-hidden="true"><path d="' + d + '" class="trk0"/><path d="' + d + '" class="trk1"/></svg>' + nodes + '</div>';
    var allDone = !nextTarget();
    var playLbl = locked ? '잠겨 있어요' : (selLevel <= shown ? '다시 하기' : (resumable(c, selLevel) ? '이어하기' : '플레이'));
    var play = '<button class="advPlay" id="advPlay" data-act="play"' + (locked ? ' disabled' : '') + '><span class="pl">' + playLbl + '</span>' +
      (locked ? '' : '<span class="ps">레벨 ' + selLevel + ' · ' + DIFF_KO[diffFor(c, selLevel)] + '</span>') + '</button>';
    var head = '<div class="advHead"><button class="advRound" data-act="back" aria-label="뒤로">‹</button><div class="advTitle"><div class="at1">' + c + '장 · ' + esc(ch.name) + '</div><div class="at2">' + esc(ch.desc) + '</div></div>' +
      '<button class="advRound adAlbum" data-act="album" aria-label="스티커북">📒' + (readyGifts().length ? '<i class="dot"></i>' : '') + '</button></div>';
    var pager = '<div class="advPager"><button class="advRound" data-act="prev" aria-label="이전 장"' + (c === 1 ? ' disabled' : '') + '>‹</button><div class="pg">' + c + '/5</div><button class="advRound" data-act="next" aria-label="다음 장"' + (c === 5 ? ' disabled' : '') + '>›</button></div>';
    $('advBody').innerHTML = head + '<div class="advPage"><div class="advLeft">' + pic + bar + '</div><div class="advRight">' + path + play + '</div></div>' + pager;
    if (allDone && !S.pend.length) { /* 모두 마침 */ }
    fitPath();
  }
  function fitPath() { /* CSS 로 처리 */ }
  function resumable(c, l) {
    var a = A() && A().unfinishedAdv(); return !!(a && a.c === c && a.l === l);
  }
  function setChapter(c) { S.chap = Math.max(0, Math.min(4, c - 1)); save(); selChap = -1; render(); }

  function show() {
    $('adv').hidden = false; $('album').hidden = true;
    mapToken++;
    render(); $('adv').scrollTop = 0;
    var tok = mapToken; setTimeout(function () { if (tok === mapToken) runPend(); }, 500);
  }
  function hide() { mapToken++; running = false; $('adv').hidden = true; $('album').hidden = true; }

  // ---- 막 깬 레벨 보여 주기 -> 그림 조각 열기 -> 선물 ----
  function runPend() {
    if (running || $('adv').hidden) return; running = true;
    var tok = mapToken, rm = reducedMotion();
    function T(fn, ms) { setTimeout(function () { if (tok === mapToken) fn(); }, ms); }
    function step() {
      var p = S.pend[0];
      if (!p) { running = false; render(); return; }
      if (p.c !== curPage()) { S.chap = p.c - 1; selChap = -1; render(); T(step, 400); return; }
      var c = p.c, l = p.l, nd = document.querySelector('.nd[data-l="' + l + '"]');
      // 1) 길의 마디가 체크로 바뀌고 막대가 차오름
      if (nd) { nd.className = 'nd done pop'; nd.innerHTML = CHECK + (MILES.indexOf(l) >= 0 ? '<i class="ng">🎁</i>' : ''); }
      var nx = document.querySelector('.nd[data-l="' + (l + 1) + '"]'); if (nx) nx.classList.add('bounce');
      $('advFill').style.width = (l / LEVELS * 100) + '%'; $('advLvN').textContent = l;
      var finish = function () {
        S.pend.shift(); save();
        if (l === LEVELS) {
          banner(c, function () {
            if (c < 5) { S.chap = c; selChap = -1; render(); }
            T(step, 500);
          });
        } else { selLevel = Math.min(LEVELS, l + 1); T(step, 450); }
      };
      if (MILES.indexOf(l) < 0) {
        T(function () { S.pend.shift(); save(); selLevel = Math.min(LEVELS, l + 1); render(); T(step, 350); }, 900);
        return;
      }
      // 2) 그림 조각 열기
      T(function () {
        var cv = document.querySelector('.cover[data-l="' + l + '"]');
        lifted[c + '-' + l] = true;
        if (cv) { cv.classList.remove('pre'); cv.classList.add(rm ? 'liftRM' : 'lift'); sparkles(cv); }
        // 3) 선물
        T(function () {
          var key = giftKey(c, l);
          if (S.gifts[key] === 1) openGift(c, l, function () { selLevel = Math.min(LEVELS, l + 1); render(); T(finish, 300); });
          else finish();
        }, rm ? 900 : 1500);
      }, 900);
    }
    step();
  }
  function sparkles(cv) {
    var svg = cv.ownerSVGElement, bb = cv.getBBox(), cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2, ns = 'http://www.w3.org/2000/svg', rm = reducedMotion();
    var g = document.createElementNS(ns, 'g'); g.setAttribute('class', 'sparks'); svg.appendChild(g);
    var cols = ['#FFE08A', '#FFC8F2', '#BDF2C8', '#A5EDF7', '#FFFFFF'];
    for (var i = 0; i < (rm ? 6 : 16); i++) {
      var a = i / 16 * 6.283 + Math.random() * .4, d = 50 + Math.random() * 90, st = document.createElementNS(ns, 'path');
      st.setAttribute('d', 'M0 -10 Q0 0 10 0 Q0 0 0 10 Q0 0 -10 0 Q0 0 0 -10Z');
      st.setAttribute('fill', cols[i % cols.length]); st.setAttribute('class', 'sp');
      st.style.cssText = 'transform-origin:0 0;--dx:' + (Math.cos(a) * d).toFixed(0) + 'px;--dy:' + (Math.sin(a) * d - 20).toFixed(0) + 'px;--dl:' + (i * 25) + 'ms;--sc:' + (0.8 + Math.random() * 0.9).toFixed(2);
      st.setAttribute('transform', 'translate(' + cx.toFixed(0) + ' ' + cy.toFixed(0) + ')');
      var w = document.createElementNS(ns, 'g'); w.setAttribute('transform', 'translate(' + cx.toFixed(0) + ' ' + cy.toFixed(0) + ')'); st.removeAttribute('transform'); w.appendChild(st); g.appendChild(w);
    }
    setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); }, 2200);
  }
  function showPostcard(c) {
    var ch = CHAPTERS[c - 1], el = $('postcard');
    if (!el) { el = document.createElement('div'); el.id = 'postcard'; el.className = 'overlay'; el.hidden = true; document.body.appendChild(el); }
    el.innerHTML = '<div class="pcCard"><div class="pcPhoto"><img src="art/ch' + c + '-full.webp" alt="' + esc(c + '장 ' + ch.name + ' — ' + ch.who) + '"></div>' +
      '<div class="pcCap"><b>' + c + '장 · ' + esc(ch.name) + '</b><span>' + esc(ch.desc) + '</span></div><button class="primary pill" id="pcOk">닫기</button></div>';
    el.hidden = false;
    var close = function () { el.hidden = true; el.innerHTML = ''; };
    $('pcOk').onclick = close; el.onclick = function (e) { if (e.target === el) close(); };
  }
  function banner(c, done) {
    var el = $('advBanner'); el.innerHTML = '<div class="bnCard"><div class="bnPic"><img src="art/ch' + c + '.webp" alt="' + esc(CHAPTERS[c - 1].name + ' 그림') + '"></div><h3>' + c + '장 그림 완성!</h3><p>' + (c < 5 ? '다음 장이 열렸어요' : '토리와 캐피랑 모든 모험을 마쳤어요 🎉') + '</p><button class="primary pill" id="bnOk">좋아요</button></div>';
    el.hidden = false;
    $('bnOk').onclick = function () { el.hidden = true; done(); };
    if (window.SudokuFX) try { SudokuFX.play({ effect: 'stars' }); } catch (e) {}
  }

  // =============================================================== 선물 상자
  function openGift(c, l, done) {
    var key = giftKey(c, l), rw = rewardFor(c, l), el = $('gift'), rm = reducedMotion(), opened = false;
    el.hidden = false;
    el.innerHTML = '<div class="gCard"><div class="gTitle">' + c + '장 · 레벨 ' + l + ' 선물이 도착했어요!</div>' +
      '<button class="giftBox ' + (rm ? 'rm' : '') + '" id="giftBox" aria-label="선물 상자 열기"><span class="gGlow"></span><span class="gLid"><i class="b1"></i><i class="b2"></i></span><span class="gBody"><i class="rib"></i></span><span class="gSp" id="gSp"></span></button>' +
      '<div class="gHint" id="gHint">상자를 톡 눌러 보세요</div><div class="gReward" id="gReward" hidden></div>' +
      '<div class="gBtns"><button class="textBtn" id="gLater">나중에 열기</button><button class="primary pill" id="gOk" hidden>좋아요!</button></div></div>';
    function finishOpen() {
      S.gifts[key] = 2;
      if (rw.type === 'theme') { S.theme = rw.id; applyBoard(); }
      if (rw.type === 'effect') syncFx();
      save();
      var h = '';
      if (rw.type === 'sticker') h = stickerHTML(rw.id, 120) + '<div class="rn">' + esc(STICKERS[rw.id].name) + '</div><div class="rs">스티커북에 붙였어요! 📒</div>';
      else if (rw.type === 'effect') h = '<div class="rEmo">' + EFFECT_INFO[rw.id].emo + '</div><div class="rn">새 축하 효과 · ' + esc(EFFECT_INFO[rw.id].name) + '</div><div class="rs">앞으로 퍼즐을 끝낼 때 나와요 ✨</div>';
      else h = '<div class="rSw">' + THEMES[rw.id].sw.map(function (c2) { return '<i style="background:' + c2 + '"></i>'; }).join('') + '</div><div class="rn">새 판 색 · ' + esc(THEMES[rw.id].name) + '</div><div class="rs">지금 바로 바꿨어요. 스티커북에서 언제든 바꿀 수 있어요</div>';
      $('gReward').innerHTML = h; $('gReward').hidden = false; $('gHint').hidden = true; $('gLater').hidden = true; $('gOk').hidden = false;
      $('giftBox').classList.add('done');
      if (rw.type === 'effect' && window.SudokuFX) try { SudokuFX.play({ effect: rw.id }); } catch (e) {}
    }
    function burst() {
      var sp = $('gSp'), h = '', cols = ['#FFE08A', '#FFC8F2', '#BDF2C8', '#A5EDF7', '#FFFFFF', '#FFB3C7'];
      for (var i = 0; i < (rm ? 6 : 18); i++) {
        var a = i / 18 * 6.283 + (i % 2) * 0.15, d = 90 + (i % 3) * 38;
        h += '<i style="--dx:' + (Math.cos(a) * d).toFixed(0) + 'px;--dy:' + (Math.sin(a) * d - 40).toFixed(0) + 'px;--dl:' + (i * 20) + 'ms;background:' + cols[i % cols.length] + '"></i>';
      }
      sp.innerHTML = h; sp.className = 'gSp go';
    }
    $('giftBox').onclick = function () {
      if (opened) return; opened = true;
      var box = $('giftBox'); $('gHint').textContent = '두근두근…'; $('gLater').hidden = true;
      box.classList.add('shake');
      setTimeout(function () { box.classList.remove('shake'); box.classList.add('open'); burst(); setTimeout(finishOpen, rm ? 100 : 650); }, rm ? 300 : 900);
    };
    $('gLater').onclick = function () { el.hidden = true; el.innerHTML = ''; if (done) done(true); };
    $('gOk').onclick = function () { el.hidden = true; el.innerHTML = ''; if (window.SudokuFX) SudokuFX.stop(); render(); if (done) done(false); };
  }

  // =============================================================== 스티커북
  function showAlbum() {
    var h = '<div class="advHead"><button class="advRound" data-act="albumBack" aria-label="뒤로">‹</button><div class="advTitle"><div class="at1">스티커북</div><div class="at2">선물로 받은 보상을 모아요</div></div><span class="advRound ghost"></span></div>';
    var ids = Object.keys(STICKERS), have = ids.filter(ownsSticker).length;
    h += '<div class="alSec"><h3>스티커 <small>' + have + '/' + ids.length + '</small></h3><div class="alGrid">';
    ids.forEach(function (id, i) {
      var c = ((i / 2) | 0) + 1, l = i % 2 ? 12 : 4, own = ownsSticker(id);
      h += '<button class="alTile' + (own ? '' : ' locked') + '" data-act="stk" data-id="' + id + '">' + stickerHTML(id, 104, !own) + '<span class="alName">' + (own ? esc(STICKERS[id].name) : c + '장 레벨 ' + l) + '</span></button>';
    });
    h += '</div></div>';
    var efs = ownedEffects();
    h += '<div class="alSec"><h3>축하 효과 <small>' + efs.length + '/5</small></h3><div class="alGrid">';
    CHAPTERS.forEach(function (ch, i) {
      var own = efs.indexOf(ch.fx) >= 0, e = EFFECT_INFO[ch.fx];
      h += '<button class="alTile' + (own ? '' : ' locked') + '" data-act="fx" data-id="' + ch.fx + '"><span class="alEmo">' + (own ? e.emo : '❔') + '</span><span class="alName">' + (own ? esc(e.name) + '<br><em>눌러서 보기</em>' : (i + 1) + '장 레벨 8') + '</span></button>';
    });
    h += '</div></div>';
    h += '<div class="alSec"><h3>판 색 <small>골라서 바꿔요</small></h3><div class="alGrid">';
    THEME_KEYS.forEach(function (k, i) {
      var own = ownsTheme(k), t = THEMES[k], cur = (ownsTheme(S.theme) ? S.theme : 'basic') === k;
      h += '<button class="alTile' + (own ? '' : ' locked') + (cur ? ' cur' : '') + '" data-act="theme" data-id="' + k + '"><span class="alSw">' + t.sw.map(function (c2) { return '<i style="background:' + (own ? c2 : '#CBB89B') + '"></i>'; }).join('') + '</span><span class="alName">' + (own ? esc(t.name) + (cur ? '<br><em>사용 중 ✓</em>' : '') : i + '장 레벨 20') + '</span></button>';
    });
    h += '</div></div>';
    h += '<div class="alSec"><h3>완성한 그림 <small>' + S.cleared.filter(function (n) { return n >= LEVELS; }).length + '/5</small></h3><div class="alGrid pics">';
    CHAPTERS.forEach(function (ch, i) {
      var own = S.cleared[i] >= LEVELS;
      h += (own ? '<button class="alPic" data-act="pc" data-id="' + (i + 1) + '" aria-label="' + esc((i + 1) + '장 ' + ch.name + ' 그림 크게 보기') + '"><span class="alFrame"><img src="art/ch' + (i + 1) + '-th.webp" alt="' + esc(ch.name + ' — ' + ch.who) + '" loading="lazy"></span>' :
        '<div class="alPic locked"><span class="alFrame"><span class="alQ">🔒</span></span>') + '<span class="alName">' + (i + 1) + '장 ' + esc(ch.name) + '</span>' + (own ? '</button>' : '</div>') + '\n';
    });
    h += '</div></div>';
    $('albumBody').innerHTML = h; $('album').hidden = false; $('album').scrollTop = 0;
  }
  function toast(m) { if (A() && A().toast) A().toast(m); }

  // =============================================================== 이벤트
  function onAdvClick(e) {
    var b = e.target.closest ? e.target.closest('[data-act]') : null; if (!b || b.disabled) return;
    var act = b.getAttribute('data-act'), l = +b.getAttribute('data-l') || 0, c = curPage();
    if (act === 'back') { hide(); if (A()) A().afterMapBack(); }
    else if (act === 'album') showAlbum();
    else if (act === 'pc') showPostcard(+b.getAttribute('data-id'));
    else if (act === 'prev') setChapter(c - 1);
    else if (act === 'next') { if (chapterLocked(c + 1)) { setChapter(c + 1); toast('앞 장을 먼저 끝내면 열려요'); } else setChapter(c + 1); }
    else if (act === 'node') {
      if (running) return;
      var shown = shownCleared(c);
      if (chapterLocked(c) || l > shown + 1) { toast('앞의 레벨을 먼저 깨 주세요'); return; }
      selLevel = l; render();
    }
    else if (act === 'gift') {
      if (running) return;
      var st = S.gifts[giftKey(c, l)], shown2 = shownCleared(c);
      if (st === 1 && l <= shown2) openGift(c, l, function () { render(); });
      else if (st === 2) toast('열어 본 선물이에요 · ' + rewardName(rewardFor(c, l)));
      else toast('레벨 ' + l + '을 깨면 선물을 받아요 🎁');
    }
    else if (act === 'play') {
      if (running || chapterLocked(c)) return;
      if (A()) A().playLevel(c, selLevel, diffFor(c, selLevel));
    }
  }
  function onAlbumClick(e) {
    var b = e.target.closest ? e.target.closest('[data-act]') : null; if (!b) return;
    var act = b.getAttribute('data-act'), id = b.getAttribute('data-id');
    if (act === 'pc') showPostcard(+id);
    else if (act === 'albumBack') { $('album').hidden = true; if (!$('adv').hidden) render(); else if (A()) A().afterMapBack(); }
    else if (act === 'stk') {
      if (!ownsSticker(id)) { toast('선물 상자에서 만날 수 있어요 🎁'); return; }
      b.classList.remove('wig'); void b.offsetWidth; b.classList.add('wig'); toast(STICKERS[id].name);
    }
    else if (act === 'fx') {
      if (ownedEffects().indexOf(id) < 0) { toast('레벨 8 선물에서 만날 수 있어요 🎁'); return; }
      if (window.SudokuFX) SudokuFX.play({ effect: id });
    }
    else if (act === 'theme') {
      if (!ownsTheme(id)) { toast('레벨 20 선물에서 만날 수 있어요 🎁'); return; }
      S.theme = id; save(); applyBoard(); showAlbum(); var sc = $('album').scrollTop; $('album').scrollTop = sc;
    }
  }
  function init() {
    $('adv').addEventListener('click', onAdvClick);
    $('album').addEventListener('click', onAlbumClick);
    applyBoard(); syncFx();
    if (A() && A().refreshMenu) A().refreshMenu();
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', applyBoard);
    }
  }

  window.SudokuAdv = {
    open: show, close: hide, summary: summary, labelFor: labelFor, diffFor: diffFor, onFinish: onFinish, applyBoard: applyBoard,
    isOpen: function () { return !$('adv').hidden || !$('album').hidden; },
    state: function () { return JSON.parse(JSON.stringify(S)); }, CHAPTERS: CHAPTERS, MILES: MILES
  };
  init();
})();
