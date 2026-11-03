// SEEDSED — tests for Block Drop's rules and how lessons unlock it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { COLS, ROWS, newGame, move, rotate, tick, hardDrop, fits, unlockedLevel, wordsToNextLevel, dropMs, MAX_LEVEL } from "../app/js/blocks.js";
import { Store, memoryStorage } from "../app/js/store.js";

const seq = () => { let x = 0.37; return () => (x = (x * 9301 + 49297) % 233280 / 233280); };

test("levels unlock by owning words; speed rises but stays playable", () => {
  assert.deepEqual([0, 2, 3, 6, 30, 500].map(unlockedLevel), [1, 1, 2, 3, MAX_LEVEL, MAX_LEVEL]);
  assert.deepEqual([0, 1, 3].map(wordsToNextLevel), [3, 2, 3]);
  assert.ok(dropMs(1) > dropMs(5) && dropMs(MAX_LEVEL) >= 110);
});

test("pieces stay on the board and can't go through landed blocks", () => {
  const g = newGame(1, seq());
  for (let i = 0; i < 30; i++) move(g, -1);
  assert.ok(g.piece.x >= 0);
  for (let i = 0; i < 30; i++) move(g, 1);
  assert.ok(g.piece.x + g.piece.shape[0].length <= COLS);
  for (let i = 0; i < 40; i++) rotate(g);
  assert.ok(fits(g, g.piece.shape, g.piece.x, g.piece.y));
});

test("a full row clears, scores by level, and everything above drops down", () => {
  const g = newGame(2, () => 0.2); // the square
  g.board[ROWS - 1] = Array(COLS).fill(1);
  g.board[ROWS - 1][g.piece.x] = 0; g.board[ROWS - 1][g.piece.x + 1] = 0;
  g.board[ROWS - 2][0] = 3;
  hardDrop(g);
  assert.equal(g.lines, 1);
  assert.equal(g.score, 200);
  assert.equal(g.board[ROWS - 1][0], 3, "row above moved down");
  assert.equal(g.board.length, ROWS);
});

test("stacking to the top ends the game instead of crashing", () => {
  const g = newGame(1, seq());
  for (let i = 0; i < 200 && !g.over; i++) hardDrop(g);
  assert.equal(g.over, true);
  assert.equal(tick(g), false);
  assert.equal(move(g, 1), false);
});

test("plays are earned by lessons and spent to play; the game adds nothing to practice numbers", () => {
  const s = new Store(memoryStorage());
  assert.equal(s.usePlay(), false, "no free plays");
  s.bump("gaps");
  s.addSentence("tomorrow", "I work tomorrow.");
  assert.equal(s.data.arcade.plays, 2);
  const before = JSON.stringify(s.summaryOf());
  assert.equal(s.usePlay(), true);
  assert.equal(s.recordScore(500), true);
  assert.equal(s.recordScore(100), false);
  assert.equal(JSON.stringify(s.summaryOf()), before, "report numbers unchanged");
  s.bump("activeMs", 0);
  const key = s.nextWord().key; s.beginWord(key); let r; do { r = s.submitStep(key, true); } while (!r.done);
  assert.equal(s.data.arcade.plays, 2, "owning a word earns one");
});
