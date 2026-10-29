(function () {
  'use strict';
  var E = window.SudokuEngine, G = window.SudokuGame;
  var GAME_KEY = 'sudoku.currentGame.v1', STATS_KEY = 'sudoku.stats.v1', THEME_KEY = 'sudoku.appearance';

  function $(id) { return document.getElementById(id); }
  function load(key) { try { var s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 저장 공간 문제는 무시 */ } }
  function unstore(key) { try { localStorage.removeItem(key); } catch (e) {} }

  // ---- 아이콘 (인라인 SVG) ----
  function svg(p) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>'; }
  var ICON = {
    pause: svg('<path d="M8 5v14M16 5v14" stroke-width="3"/>'),
    play: svg('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>'),
    theme: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>'),
    menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    undo: svg('<path d="M9 7 4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 8h-3"/>'),
    erase: svg('<path d="M7 20h12"/><path d="m5.5 14.5 8-8a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L11.5 18H8z"/><path d="m10 10 5.5 5.5"/>'),
    pencil: svg('<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8L8 19z"/><path d="m14 7 3 3"/>'),
    bulb: svg('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.7.6 1 1.3 1 2.1h5c0-.8.3-1.5 1-2.1A6 6 0 0 0 12 3z"/>'),
    pauseBig: svg('<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M9.5 8v8M14.5 8v8" stroke="var(--panel)" stroke-width="2.4"/>')
  };

  // ---- 상태 ----
  var game = null, selected = null, notesMode = false, paused = false, busy = false;
  var elapsedMs = 0, lastTick = 0, timerId = null, lastSaveSec = 0;
  var stats = load(STATS_KEY) || { bestTimes: {}, solvedCounts: {} };
  if (!stats.bestTimes) stats.bestTimes = {};
  if (!stats.solvedCounts) stats.solvedCounts = {};
  var isNewRecord = false, menuOpenInGame = false;
  var cellEls = [], cellKey = [], padEls = [];

  // ---- 테마 ----
  var THEME_NAMES = { system: '시스템', light: '라이트', dark: '다크' };
  function themeMode() { var t = null; try { t = localStorage.getItem(THEME_KEY); } catch (e) {} return THEME_NAMES[t] ? t : 'system'; }
  function applyTheme() {
    var m = themeMode(), root = document.documentElement;
    if (m === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', m);
    var bg = getComputedStyle(root).getPropertyValue('--bg').trim();
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta && bg) meta.setAttribute('content', bg);
    var segs = $('themeSeg').children;
    for (var i = 0; i < segs.length; i++) {
      var on = segs[i].getAttribute('data-v') === m;
      segs[i].classList.toggle('on', on);
      segs[i].setAttribute('aria-checked', on ? 'true' : 'false');
    }
  }
  function setTheme(m) { try { localStorage.setItem(THEME_KEY, m); } catch (e) {} applyTheme(); }
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', applyTheme);
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 1400);
  }

  // ---- 저장 ----
  function save() {
    if (!game || game.isCompleted) return;
    game.elapsed = elapsedMs / 1000;
    store(GAME_KEY, game);
  }
  function saveStats() { store(STATS_KEY, stats); }

  // ---- 타이머 / 일시정지 ----
  function updateElapsed() {
    var now = Date.now();
    if (lastTick) elapsedMs += Math.max(0, Math.min(now - lastTick, 5000));
    lastTick = now;
  }
  function startTimer() {
    stopTimer(); lastTick = Date.now();
    timerId = setInterval(tick, 250);
  }
  function stopTimer() { if (timerId) clearInterval(timerId); timerId = null; }
  function tick() {
    if (paused || !game) return;
    updateElapsed();
    var s = Math.floor(elapsedMs / 1000);
    renderTimer();
    if (s !== lastSaveSec && s % 10 === 0) { lastSaveSec = s; save(); }
  }
  function pause() {
    if (!game || game.isCompleted) return;
    if (paused) { save(); return; }
    updateElapsed(); stopTimer(); paused = true; save(); render();
  }
  function resume() {
    if (!game || game.isCompleted) return;
    paused = false; startTimer(); render();
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
  window.addEventListener('pagehide', pause);

  // ---- 새 게임 ----
  function startNewGame(diff) {
    if (busy) return;
    busy = true; $('busy').hidden = false;
    setTimeout(function () {   // 안내 문구가 먼저 그려지도록 한 박자 쉼
      var g;
      try { g = G.newGame(diff); } catch (e) { busy = false; $('busy').hidden = true; toast('퍼즐을 만들지 못했어요'); return; }
      game = g; selected = null; notesMode = false; elapsedMs = 0; lastTick = 0; lastSaveSec = 0;
      isNewRecord = false; menuOpenInGame = false; paused = false;
      $('done').hidden = true; $('menu').hidden = true; $('game').hidden = false;
      startTimer(); save();
      busy = false; $('busy').hidden = true;
      layout(); render();
    }, 30);
  }

  var pendingDiff = null;
  function requestNewGame(diff) {
    if (game && !game.isCompleted) { pendingDiff = diff; $('confirm').hidden = false; }
    else startNewGame(diff);
  }

  // ---- 입력 ----
  function select(i) { if (paused) return; selected = i; render(); }
  function afterChange() { if (game.isCompleted) finishGame(); else save(); render(); }

  function tapNumber(n) {
    if (paused || !game || selected === null) return;
    var before = game.isCompleted ? [] : G.completedUnits(game);
    var r = G.input(game, n, selected, notesMode);
    if (r === 'ignored') return;
    if (r === 'blocked') { blockedFeedback(n, selected); return; }
    if (r === 'mistake') shake(selected);
    afterChange();
    if (r === 'placed') pulseNewUnits(before);
  }
  // 메모 모드에서 같은 행/열/박스에 이미 확정된 숫자는 메모할 수 없음: 살짝 흔들고, 이미 있는 칸을 잠깐 알려 줌
  var blkTimer = null;
  function blockedFeedback(n, i) {
    shake(i);
    var b = G.notedBlockers(game, i, n);
    b.forEach(function (j) { cellEls[j].classList.add('blk'); });
    clearTimeout(blkTimer);
    blkTimer = setTimeout(function () { cellEls.forEach(function (c) { c.classList.remove('blk'); }); }, 900);
    toast('같은 줄·칸에 이미 ' + n + '이(가) 있어요');
  }
  // 행/열/박스를 하나 완성하면 해당 칸들이 물결처럼 살짝 반짝임 (게임 전체 완성 때는 큰 축하 효과가 대신함)
  function pulseNewUnits(before) {
    if (!game || game.isCompleted) return;
    var after = G.completedUnits(game), seen = {};
    after.forEach(function (u) {
      if (before.indexOf(u) !== -1) return;
      E.UNITS[u].forEach(function (ci, k) {
        if (seen[ci] === undefined) seen[ci] = k;
      });
    });
    Object.keys(seen).forEach(function (ci) {
      var el = cellEls[ci];
      el.style.setProperty('--pd', (seen[ci] * 55) + 'ms');
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      setTimeout(function () { el.classList.remove('pop'); }, 1100 + seen[ci] * 55);
    });
  }
  function shake(i) {
    var el = cellEls[i]; if (!el) return;
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  }
  function doErase() {
    if (paused || !game || selected === null) return;
    if (G.erase(game, selected) !== 'ignored') afterChange();
  }
  function doUndo() {
    if (paused || !game) return;
    var i = G.undo(game);
    if (i !== null) { selected = i; afterChange(); }
  }
  function doHint() {
    if (paused || !game) return;
    var before = game.isCompleted ? [] : G.completedUnits(game);
    var i = G.hint(game, selected);
    if (i !== null) { selected = i; afterChange(); pulseNewUnits(before); }
  }

  function finishGame() {
    if (!paused) updateElapsed();
    stopTimer();
    var time = elapsedMs / 1000, d = game.difficulty;
    stats.solvedCounts[d] = (stats.solvedCounts[d] || 0) + 1;
    var old = stats.bestTimes[d];
    isNewRecord = !(old !== undefined && old <= time);
    if (isNewRecord) stats.bestTimes[d] = time;
    saveStats(); unstore(GAME_KEY);
    renderDone(); $('done').hidden = false;
    if (window.SudokuFX) { try { window.SudokuFX.play(); } catch (e) { /* 효과 실패는 게임에 영향 없음 */ } }
  }
  function renderDone() {
    var g = game, best = stats.bestTimes[g.difficulty];
    var rows = [['난이도', E.DIFFICULTIES[g.difficulty].title], ['걸린 시간', G.formatTime(elapsedMs / 1000)],
      ['실수', g.mistakes + '회'], ['힌트', g.hintsUsed + '회']];
    if (best !== undefined) rows.push(['최고 기록', G.formatTime(best)]);
    $('doneRows').innerHTML = rows.map(function (r) { return '<div><span>' + r[0] + '</span><span>' + r[1] + '</span></div>'; }).join('');
    $('newRecord').hidden = !isNewRecord;
  }
  function leaveCompleted() {
    if (window.SudokuFX) window.SudokuFX.stop();
    $('done').hidden = true; game = null; selected = null; paused = false;
    showMenu(false);
  }

  // ---- 메뉴 ----
  function showMenu(inGame) {
    menuOpenInGame = inGame;
    $('btnContinue').hidden = !inGame; $('btnCloseMenu').hidden = !inGame;
    renderMenu();
    $('menu').hidden = false; $('menu').scrollTop = 0;
  }
  function renderMenu() {
    $('diffList').innerHTML = E.ORDER.map(function (d) {
      var best = stats.bestTimes[d], n = stats.solvedCounts[d] || 0;
      var sub = best !== undefined ? '최고 기록 ' + G.formatTime(best) + ' · ' + n + '회 완료' : '아직 기록이 없어요';
      return '<button class="diffRow" data-d="' + d + '"><div><div class="dt">' + E.DIFFICULTIES[d].title +
        '</div><div class="ds">' + sub + '</div></div><span class="chev">›</span></button>';
    }).join('');
  }
  function closeMenu() { $('menu').hidden = true; menuOpenInGame = false; }

  // ---- 렌더 ----
  function buildBoard() {
    var b = $('board'), html = '';
    for (var i = 0; i < 81; i++) {
      html += '<div class="cell r' + ((i / 9) | 0) + ' c' + (i % 9) + '" data-i="' + i + '" role="gridcell"></div>';
    }
    b.innerHTML = html;
    cellEls = Array.prototype.slice.call(b.children);
    cellKey = new Array(81).fill(null);
    var pad = '';
    for (var n = 1; n <= 9; n++) pad += '<button class="num" data-n="' + n + '"><b>' + n + '</b><i></i></button>';
    $('pad').innerHTML = pad;
    padEls = Array.prototype.slice.call($('pad').children);
    $('btnUndo').firstChild.innerHTML = ICON.undo;
    $('btnErase').firstChild.innerHTML = ICON.erase;
    $('btnNotes').firstChild.innerHTML = ICON.pencil;
    $('btnHint').firstChild.innerHTML = ICON.bulb;
    $('btnTheme').innerHTML = ICON.theme;
    $('btnMenu').innerHTML = ICON.menu;
    $('pauseBigIcon').innerHTML = ICON.pauseBig;
  }

  function renderTimer() {
    $('timer').textContent = G.formatTime(elapsedMs / 1000);
    $('timer').classList.toggle('paused', paused);
  }

  function render() {
    if (!game) return;
    var conf = G.conflicts(game);
    var selVal = selected !== null ? game.values[selected] : 0;
    var i, el;
    for (i = 0; i < 81; i++) {
      el = cellEls[i];
      var v = game.values[i], nt = game.notes[i];
      var key = v + ':' + nt;
      if (cellKey[i] !== key) {
        cellKey[i] = key;
        if (v) el.textContent = v;
        else if (nt) {
          var h = '<div class="notes">';
          for (var k = 0; k < 9; k++) h += '<span>' + ((nt & (1 << k)) ? k + 1 : '') + '</span>';
          el.innerHTML = h + '</div>';
        } else el.textContent = '';
      }
      var cls = 'cell r' + ((i / 9) | 0) + ' c' + (i % 9);
      if (G.isGiven(game, i)) cls += ' given';
      if (G.isWrong(game, i)) cls += ' wrong';
      if (selected !== null) {
        if (i === selected) cls += ' sel';
        else if (conf[i]) cls += ' conflict';
        else if (selVal && v === selVal) cls += ' same';
        else if (E.row(i) === E.row(selected) || E.col(i) === E.col(selected) || E.box(i) === E.box(selected)) cls += ' peer';
      } else if (conf[i]) cls += ' conflict';
      var keep = '';
      if (el.classList.contains('shake')) keep += ' shake';
      if (el.classList.contains('pop')) keep += ' pop';
      if (el.classList.contains('blk')) keep += ' blk';
      el.className = cls + keep;
      el.setAttribute('aria-label', (E.row(i) + 1) + '행 ' + (E.col(i) + 1) + '열 ' + (v ? v : '빈칸'));
    }
    $('diffName').textContent = E.DIFFICULTIES[game.difficulty].title;
    var m = $('mistakes'); m.textContent = '실수 ' + game.mistakes; m.classList.toggle('bad', game.mistakes > 0);
    renderTimer();
    $('btnPause').innerHTML = paused ? ICON.play : ICON.pause;
    $('btnPause').setAttribute('aria-label', paused ? '계속' : '일시정지');
    $('pauseCover').hidden = !paused;
    $('stage').classList.toggle('paused', paused);
    $('btnUndo').disabled = game.undoStack.length === 0;
    $('btnNotes').classList.toggle('active', notesMode);
    $('notesLabel').textContent = notesMode ? '메모 켬' : '메모';
    for (i = 0; i < 9; i++) {
      var rem = 9 - G.placedCount(game, i + 1), p = padEls[i];
      p.classList.toggle('done', rem <= 0);
      p.disabled = rem <= 0;
      p.lastChild.textContent = rem > 0 ? rem : '';
      p.setAttribute('aria-label', (i + 1) + ', 남은 개수 ' + Math.max(0, rem));
    }
  }

  // ---- 레이아웃 (세로/가로) ----
  function layout() {
    var stage = $('stage'), root = document.documentElement.style;
    if ($('game').hidden) return;
    var w = stage.clientWidth, h = stage.clientHeight, land = w > h;
    stage.classList.toggle('land', land); stage.classList.toggle('port', !land);
    var board, padh, toolh = land ? 64 : 72;
    if (land) {
      board = Math.max(240, Math.min(h, w * 0.62));
      var panelw = Math.max(280, w - board - 20);
      root.setProperty('--panelw', panelw + 'px');
      padh = Math.min(100, (panelw - 24) / 3, (board - 220) / 3 - 12);
    } else {
      padh = w > 700 ? 84 : (w > 500 ? 64 : 52);
      var fixed = 56 + toolh + padh + 16 * 3;
      board = Math.max(240, Math.min(w, h - fixed));
      if (w <= 500) toolh = 60;
    }
    board = Math.floor(board);
    root.setProperty('--board', board + 'px');
    root.setProperty('--padh', Math.floor(Math.max(44, padh)) + 'px');
    root.setProperty('--toolh', toolh + 'px');
    root.setProperty('--cellfs', Math.floor(board / 9 * 0.6) + 'px');
    root.setProperty('--notefs', Math.max(9, Math.floor(board / 9 * 0.27)) + 'px');
  }
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', function () { setTimeout(layout, 120); });

  // ---- 이벤트 ----
  function on(id, fn) { $(id).addEventListener('click', fn); }
  $('board').addEventListener('click', function (e) {
    var c = e.target.closest ? e.target.closest('.cell') : null;
    if (c) select(+c.getAttribute('data-i'));
  });
  $('pad').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.num') : null;
    if (b && !b.disabled) tapNumber(+b.getAttribute('data-n'));
  });
  on('btnUndo', doUndo); on('btnErase', doErase); on('btnHint', doHint);
  on('btnNotes', function () { if (!paused) { notesMode = !notesMode; render(); } });
  on('btnPause', function () { paused ? resume() : pause(); });
  on('btnResume', resume);
  on('btnTheme', function () {
    var order = ['system', 'light', 'dark'], n = order[(order.indexOf(themeMode()) + 1) % 3];
    setTheme(n); toast('화면 모드: ' + THEME_NAMES[n]);
  });
  on('btnMenu', function () { pause(); showMenu(true); });
  on('btnContinue', function () { closeMenu(); resume(); });
  on('btnCloseMenu', function () { closeMenu(); });
  on('btnDoneNew', leaveCompleted);
  on('confirmNo', function () { pendingDiff = null; $('confirm').hidden = true; });
  on('confirmYes', function () { var d = pendingDiff; pendingDiff = null; $('confirm').hidden = true; if (d) startNewGame(d); });
  $('diffList').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.diffRow') : null;
    if (b) requestNewGame(b.getAttribute('data-d'));
  });
  $('themeSeg').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button') : null;
    if (b) setTheme(b.getAttribute('data-v'));
  });

  // 확대/길게 눌러 선택 방지
  ['gesturestart', 'gesturechange', 'gestureend', 'contextmenu', 'selectstart', 'dragstart'].forEach(function (t) {
    document.addEventListener(t, function (e) { e.preventDefault(); }, { passive: false });
  });
  document.addEventListener('touchmove', function (e) {
    if ((e.touches && e.touches.length > 1) && e.cancelable) e.preventDefault();
  }, { passive: false });

  // ---- 시작 ----
  buildBoard();
  applyTheme();
  var saved = load(GAME_KEY);
  if (G.validSaved(saved)) {
    game = saved; elapsedMs = (saved.elapsed || 0) * 1000; paused = true; lastTick = 0;
    $('game').hidden = false; layout(); render();   // 다시 열면 일시정지 상태로 시작
  } else {
    unstore(GAME_KEY); showMenu(false);
  }

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    var hadController = !!navigator.serviceWorker.controller, updatePending = false;
    // 새 버전이 준비되면, 일시정지/메뉴 상태일 때 자동으로 새로고침 (게임은 자동 저장되어 그대로 이어짐)
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController) { hadController = true; return; }
      updatePending = true; maybeReload();
    });
    window.__maybeReload = maybeReload;
    function maybeReload() {
      if (!updatePending) return;
      var idle = $('game').hidden || paused || !$('menu').hidden;
      if (idle && $('done').hidden) { save(); location.reload(); }
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) setTimeout(maybeReload, 50); });
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  // 테스트/디버그용 (화면에는 영향 없음)
  window.__sudoku = { celebrate: function (o) { return window.SudokuFX.play(o); }, get game() { return game; }, get selected() { return selected; }, get paused() { return paused; } };
})();
