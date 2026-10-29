/* 한 판의 게임 상태 — SudokuApp/Logic/GameModel.swift 의 JS 포팅 */
(function (root) {
  'use strict';
  var E = root.SudokuEngine || require('./engine.js');
  var PEERS = E.PEERS;

  function newGame(diff) {
    var p = E.generate(diff);
    return {
      difficulty: diff, puzzle: p.puzzle, solution: p.solution,
      values: p.puzzle.slice(), notes: new Array(81).fill(0),
      mistakes: 0, hintsUsed: 0, elapsed: 0, isCompleted: false, undoStack: []
    };
  }

  function isGiven(g, i) { return g.puzzle[i] !== 0; }
  function isLocked(g, i) { return isGiven(g, i) || g.values[i] === g.solution[i]; }
  function isWrong(g, i) { return g.values[i] !== 0 && g.values[i] !== g.solution[i]; }

  function conflicts(g) {
    var s = {};
    for (var i = 0; i < 81; i++) {
      if (!g.values[i]) continue;
      var p = PEERS[i];
      for (var k = 0; k < p.length; k++) {
        if (g.values[p[k]] === g.values[i]) { s[i] = true; s[p[k]] = true; }
      }
    }
    return s;
  }

  function placedCount(g, n) {
    var c = 0;
    for (var i = 0; i < 81; i++) if (g.values[i] === n && g.solution[i] === n) c++;
    return c;
  }

  function clearPeerNotes(g, i, n, changes) {
    var bit = 1 << (n - 1), p = PEERS[i];
    for (var k = 0; k < p.length; k++) {
      var j = p[k];
      if (g.notes[j] & bit) {
        changes.push({ index: j, value: g.values[j], notes: g.notes[j] });
        g.notes[j] &= ~bit;
      }
    }
  }

  function updateCompletion(g) {
    for (var i = 0; i < 81; i++) if (g.values[i] !== g.solution[i]) return;
    g.isCompleted = true;
  }

  // 반환: 'ignored' | 'noted' | 'placed' | 'mistake' | 'erased'
  function input(g, n, i, notesMode) {
    if (!(n >= 1 && n <= 9) || !(i >= 0 && i < 81) || g.isCompleted || isLocked(g, i)) return 'ignored';
    if (notesMode) {
      if (g.values[i] !== 0) return 'ignored';
      g.undoStack.push({ changes: [{ index: i, value: 0, notes: g.notes[i] }] });
      g.notes[i] ^= (1 << (n - 1));
      return 'noted';
    }
    if (g.values[i] === n) return erase(g, i);
    var changes = [{ index: i, value: g.values[i], notes: g.notes[i] }];
    clearPeerNotes(g, i, n, changes);
    g.undoStack.push({ changes: changes });
    g.values[i] = n;
    g.notes[i] = 0;
    var wrong = n !== g.solution[i];
    if (wrong) g.mistakes++;
    updateCompletion(g);
    return wrong ? 'mistake' : 'placed';
  }

  function erase(g, i) {
    if (!(i >= 0 && i < 81) || g.isCompleted || isLocked(g, i)) return 'ignored';
    if (g.values[i] === 0 && g.notes[i] === 0) return 'ignored';
    g.undoStack.push({ changes: [{ index: i, value: g.values[i], notes: g.notes[i] }] });
    g.values[i] = 0;
    g.notes[i] = 0;
    return 'erased';
  }

  // 마지막 동작을 되돌림. 실수 횟수는 되돌리지 않음. 되돌린 칸 번호 또는 null
  function undo(g) {
    if (g.isCompleted || !g.undoStack.length) return null;
    var move = g.undoStack.pop();
    for (var k = move.changes.length - 1; k >= 0; k--) {
      var ch = move.changes[k];
      g.values[ch.index] = ch.value;
      g.notes[ch.index] = ch.notes;
    }
    return move.changes[0].index;
  }

  function hint(g, selected) {
    if (g.isCompleted) return null;
    function needsFill(i) { return !isGiven(g, i) && g.values[i] !== g.solution[i]; }
    var target = null, i;
    if (selected !== null && selected !== undefined && selected >= 0 && selected < 81 && needsFill(selected)) target = selected;
    if (target === null) {
      var cands = [];
      for (i = 0; i < 81; i++) if (needsFill(i)) cands.push(i);
      if (!cands.length) return null;
      target = cands[Math.floor(Math.random() * cands.length)];
    }
    var n = g.solution[target];
    var changes = [{ index: target, value: g.values[target], notes: g.notes[target] }];
    clearPeerNotes(g, target, n, changes);
    g.undoStack.push({ changes: changes });
    g.values[target] = n;
    g.notes[target] = 0;
    g.hintsUsed++;
    updateCompletion(g);
    return target;
  }

  function formatTime(sec) {
    var t = Math.max(0, Math.floor(sec)), h = (t / 3600) | 0, m = ((t % 3600) / 60) | 0, s = t % 60;
    function two(v) { return v < 10 ? '0' + v : '' + v; }
    return h > 0 ? h + ':' + two(m) + ':' + two(s) : two(m) + ':' + two(s);
  }

  function validSaved(g) {
    function arr(a) { return Array.isArray(a) && a.length === 81; }
    return g && E.DIFFICULTIES[g.difficulty] && arr(g.puzzle) && arr(g.solution) && arr(g.values) && arr(g.notes) &&
      Array.isArray(g.undoStack) && !g.isCompleted;
  }

  var api = {
    newGame: newGame, isGiven: isGiven, isLocked: isLocked, isWrong: isWrong, conflicts: conflicts,
    placedCount: placedCount, input: input, erase: erase, undo: undo, hint: hint,
    formatTime: formatTime, validSaved: validSaved
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SudokuGame = api;
})(typeof self !== 'undefined' ? self : this);
