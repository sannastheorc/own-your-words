// SEEDSED — blocks.js
// Purpose: BLOCK DROP, the reward game: falling shapes, pure rules only. It teaches nothing by itself.
//          Lessons earn plays and owning words unlocks faster levels (rules below, applied by store.js).
// Boundaries: no drawing, timers or storage. Its own name and look; not affiliated with any brand.
//          Time here is never counted as practice.

export const COLS = 12, ROWS = 18;
export const PLAYS_PER_LESSON = 1, WORDS_PER_LEVEL = 3, MAX_LEVEL = 10;

const SHAPES = [
  [[1, 1, 1, 1]], [[1, 1], [1, 1]], [[0, 1, 0], [1, 1, 1]], [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]], [[0, 1, 1], [1, 1, 0]], [[1, 1, 0], [0, 1, 1]]
];

export const unlockedLevel = ownedWords => Math.min(MAX_LEVEL, 1 + Math.floor(ownedWords / WORDS_PER_LEVEL));
export const wordsToNextLevel = ownedWords => (unlockedLevel(ownedWords) >= MAX_LEVEL ? 0 : WORDS_PER_LEVEL - (ownedWords % WORDS_PER_LEVEL));
export const dropMs = level => Math.max(110, 760 - (level - 1) * 70);

const rotated = shape => shape[0].map((_, x) => shape.map(row => row[x]).reverse());

function spawn(g) {
  const i = Math.floor(g.rng() * SHAPES.length);
  g.piece = { shape: SHAPES[i], color: i + 1, x: Math.floor((COLS - SHAPES[i][0].length) / 2), y: 0 };
  if (!fits(g, g.piece.shape, g.piece.x, g.piece.y)) g.over = true;
}

export function fits(g, shape, x, y) {
  return shape.every((row, r) => row.every((on, c) => !on || (x + c >= 0 && x + c < COLS && y + r < ROWS && (y + r < 0 || !g.board[y + r][x + c]))));
}

export function newGame(level = 1, rng = Math.random) {
  const g = { board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)), level, score: 0, lines: 0, over: false, rng, piece: null };
  spawn(g);
  return g;
}

export function move(g, dx) {
  if (!g.over && fits(g, g.piece.shape, g.piece.x + dx, g.piece.y)) { g.piece.x += dx; return true; }
  return false;
}

export function rotate(g) {
  if (g.over) return false;
  const s = rotated(g.piece.shape);
  for (const kick of [0, -1, 1, -2, 2]) {
    if (fits(g, s, g.piece.x + kick, g.piece.y)) { g.piece.shape = s; g.piece.x += kick; return true; }
  }
  return false;
}

// One step down; lands the piece, clears full rows and brings the next one when it can't fall.
export function tick(g) {
  if (g.over) return false;
  if (fits(g, g.piece.shape, g.piece.x, g.piece.y + 1)) { g.piece.y++; return true; }
  g.piece.shape.forEach((row, r) => row.forEach((on, c) => { if (on) g.board[g.piece.y + r][g.piece.x + c] = g.piece.color; }));
  const kept = g.board.filter(row => row.some(v => !v));
  const cleared = ROWS - kept.length;
  g.board = [...Array.from({ length: cleared }, () => Array(COLS).fill(0)), ...kept];
  g.lines += cleared;
  g.score += [0, 100, 300, 500, 800][cleared] * g.level;
  spawn(g);
  return false;
}

export function hardDrop(g) {
  if (g.over) return;
  while (tick(g));
}
