/* 스도쿠 엔진 — SudokuApp/Logic/SudokuEngine.swift 의 JS 포팅 (생성기·풀이기·난이도 판정) */
(function (root) {
  'use strict';

  var DIFFICULTIES = {
    easy:   { title: '쉬움',   targetClues: 40, acceptableClues: 42, singlesOnly: true },
    medium: { title: '보통',   targetClues: 33, acceptableClues: 36, singlesOnly: true },
    hard:   { title: '어려움', targetClues: 29, acceptableClues: 32, singlesOnly: false },
    expert: { title: '전문가', targetClues: 24, acceptableClues: 27, singlesOnly: false }
  };
  var ORDER = ['easy', 'medium', 'hard', 'expert'];

  function row(i) { return (i / 9) | 0; }
  function col(i) { return i % 9; }
  function box(i) { return ((i / 27) | 0) * 3 + (((i % 9) / 3) | 0); }
  function popcount(x) { var c = 0; while (x) { x &= x - 1; c++; } return c; }
  function ctz(x) { var n = 0; while (!(x & 1)) { x >>= 1; n++; } return n; }

  var PEERS = [], UNITS = [];
  (function () {
    var i, j, r, c, b;
    for (i = 0; i < 81; i++) {
      var p = [];
      for (j = 0; j < 81; j++) {
        if (j !== i && (row(i) === row(j) || col(i) === col(j) || box(i) === box(j))) p.push(j);
      }
      PEERS.push(p);
    }
    for (r = 0; r < 9; r++) { var u = []; for (c = 0; c < 9; c++) u.push(r * 9 + c); UNITS.push(u); }
    for (c = 0; c < 9; c++) { var u2 = []; for (r = 0; r < 9; r++) u2.push(r * 9 + c); UNITS.push(u2); }
    for (b = 0; b < 9; b++) { var u3 = []; for (i = 0; i < 81; i++) if (box(i) === b) u3.push(i); UNITS.push(u3); }
  })();

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ---- Solver ----
  function makeState(grid) {
    if (!grid || grid.length !== 81) return null;
    var st = { cells: grid.slice(), rm: new Array(9).fill(0), cm: new Array(9).fill(0), bm: new Array(9).fill(0) };
    for (var i = 0; i < 81; i++) {
      var v = grid[i];
      if (v === 0) continue;
      if (!(v >= 1 && v <= 9)) return null;
      var bit = 1 << (v - 1), r = row(i), c = col(i), b = box(i);
      if ((st.rm[r] | st.cm[c] | st.bm[b]) & bit) return null;
      st.rm[r] |= bit; st.cm[c] |= bit; st.bm[b] |= bit;
    }
    return st;
  }

  function search(st, limit, randomize, out) {
    var best = -1, bestMask = 0, bestCount = 10, i;
    for (i = 0; i < 81; i++) {
      if (st.cells[i] !== 0) continue;
      var avail = ~(st.rm[row(i)] | st.cm[col(i)] | st.bm[box(i)]) & 0x1FF;
      var n = popcount(avail);
      if (n < bestCount) {
        best = i; bestMask = avail; bestCount = n;
        if (n <= 1) break;
      }
    }
    if (best === -1) {
      out.count++;
      if (!out.first) out.first = st.cells.slice();
      return;
    }
    if (bestCount === 0) return;
    var digits = [];
    for (var d = 1; d <= 9; d++) if (bestMask & (1 << (d - 1))) digits.push(d);
    if (randomize) shuffle(digits);
    var r = row(best), c = col(best), b = box(best);
    for (var k = 0; k < digits.length; k++) {
      var dd = digits[k], bit = 1 << (dd - 1);
      st.cells[best] = dd; st.rm[r] |= bit; st.cm[c] |= bit; st.bm[b] |= bit;
      search(st, limit, randomize, out);
      st.cells[best] = 0; st.rm[r] &= ~bit; st.cm[c] &= ~bit; st.bm[b] &= ~bit;
      if (out.count >= limit) return;
    }
  }

  function countSolutions(grid, limit) {
    var st = makeState(grid);
    if (!st) return 0;
    var out = { count: 0, first: null };
    search(st, limit || 2, false, out);
    return out.count;
  }

  function solve(grid) {
    var st = makeState(grid);
    if (!st) return null;
    var out = { count: 0, first: null };
    search(st, 1, false, out);
    return out.first;
  }

  function randomSolution() {
    var st = makeState(new Array(81).fill(0));
    var out = { count: 0, first: null };
    search(st, 1, true, out);
    return out.first;
  }

  // "유일한 후보"와 "유일한 자리"만으로 끝까지 풀리는지
  function solvableBySingles(grid) {
    var g = grid.slice(), rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0), i;
    for (i = 0; i < 81; i++) if (g[i] !== 0) {
      var bit = 1 << (g[i] - 1);
      rows[row(i)] |= bit; cols[col(i)] |= bit; boxes[box(i)] |= bit;
    }
    function cand(i) { return ~(rows[row(i)] | cols[col(i)] | boxes[box(i)]) & 0x1FF; }
    function place(i, d) {
      var bit = 1 << (d - 1);
      g[i] = d; rows[row(i)] |= bit; cols[col(i)] |= bit; boxes[box(i)] |= bit;
    }
    for (;;) {
      var placed = false, empties = 0;
      for (i = 0; i < 81; i++) {
        if (g[i] !== 0) continue;
        empties++;
        var c = cand(i);
        if (c === 0) return false;
        if (popcount(c) === 1) { place(i, ctz(c) + 1); placed = true; }
      }
      if (empties === 0) return true;
      if (placed) continue;
      outer:
      for (var u = 0; u < UNITS.length; u++) {
        var unit = UNITS[u];
        for (var d = 0; d < 9; d++) {
          var pos = -1, n = 0, already = false;
          for (var k = 0; k < 9; k++) {
            var idx = unit[k];
            if (g[idx] === d + 1) { already = true; break; }
            if (g[idx] === 0 && (cand(idx) & (1 << d))) { n++; pos = idx; }
          }
          if (already) continue;
          if (n === 1) { place(pos, d + 1); placed = true; break outer; }
        }
      }
      if (!placed) return false;
    }
  }

  // ---- Generator ----
  function carve(solution, diff) {
    var cfg = DIFFICULTIES[diff], puzzle = solution.slice(), clues = 81;
    var order = [];
    for (var i = 0; i < 81; i++) order.push(i);
    shuffle(order);
    for (var k = 0; k < 81; k++) {
      if (clues <= cfg.targetClues) break;
      var idx = order[k], saved = puzzle[idx];
      puzzle[idx] = 0;
      var ok = countSolutions(puzzle, 2) === 1;
      if (ok && cfg.singlesOnly) ok = solvableBySingles(puzzle);
      if (ok) clues--; else puzzle[idx] = saved;
    }
    return puzzle;
  }

  function clueCount(p) { var c = 0; for (var i = 0; i < 81; i++) if (p[i] !== 0) c++; return c; }

  function generate(diff) {
    var cfg = DIFFICULTIES[diff], best = null, fallback = null;
    for (var t = 0; t < 60; t++) {
      var solution = randomSolution();
      var puzzle = carve(solution, diff);
      var cand = { puzzle: puzzle, solution: solution };
      var gradeOK = solvableBySingles(puzzle) === cfg.singlesOnly;
      var clues = clueCount(puzzle);
      if (gradeOK && clues <= cfg.acceptableClues) return cand;
      if (gradeOK && (!best || clues < clueCount(best.puzzle))) best = cand;
      if (!fallback || clues < clueCount(fallback.puzzle)) fallback = cand;
    }
    return best || fallback;
  }

  var api = {
    DIFFICULTIES: DIFFICULTIES, ORDER: ORDER, PEERS: PEERS, UNITS: UNITS,
    row: row, col: col, box: box, countSolutions: countSolutions, solve: solve,
    randomSolution: randomSolution, solvableBySingles: solvableBySingles,
    carve: carve, generate: generate, clueCount: clueCount
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SudokuEngine = api;

  // Web Worker 로 쓰일 때: {difficulty} 를 받으면 퍼즐을 만들어 돌려준다.
  if (typeof WorkerGlobalScope !== 'undefined' && root instanceof WorkerGlobalScope) {
    root.onmessage = function (e) { root.postMessage(generate(e.data.difficulty)); };
  }
})(typeof self !== 'undefined' ? self : this);
