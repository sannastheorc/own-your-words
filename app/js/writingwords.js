// SEEDSED — writingwords.js
// Purpose: QUIET MISSPELLING FINDER. Reads a sentence he wrote and finds words he likely meant to spell
//          differently ("pepole" -> "people"), so they can come back later as ordinary Word Lab words.
// Input:  his sentence as typed, and the starter words. Output: [{ wrong, meant, level }].
// Boundaries: pure. Never changes his sentence and never tells him anything. When it isn't sure (a name,
//             slang, a made-up compound, two equally likely words) it stays quiet and queues nothing.

import { COMMON_WORDS } from "./commonwords.js";

// Everyday words the common-word list leaves out, because that list keeps one form per word.
const EXTRA = new Set(("a an is are was were am be been being has had have does did done doing went gone got gotten made said " +
  "came saw seen took taken gave given knew known thought told found left felt kept brought bought sold sent spent " +
  "built began begun ran sat stood heard held paid met lost meant read wrote written ate eaten drank drunk drove driven " +
  "my your his her its our their me him them us mine yours hers ours theirs myself yourself himself herself itself ourselves themselves " +
  "this these those they we he she it you i im ive id ill youre theyre were dont doesnt didnt cant wont isnt arent wasnt " +
  "children men women feet teeth mice better best worse worst more most less least " +
  // Everyday talk that isn't a misspelling.
  "gonna wanna gotta kinda sorta yeah yep nope okay lol cuz yall aint dunno lemme gimme hey hmm ugh").split(" "));

const LETTERS = /^[a-z]+$/;
const isBase = w => COMMON_WORDS.has(w) || EXTRA.has(w);

// A correctly spelled form of a known word: plurals, -ed, -ing, -er, -est, -ly, and their spelling changes.
function knownForm(w, starter) {
  if (isBase(w) || starter.has(w)) return true;
  const stems = [];
  for (const [end, add] of [["ies", "y"], ["ied", "y"], ["ier", "y"], ["iest", "y"], ["es", ""], ["s", ""], ["ed", ""], ["ed", "e"],
    ["ing", ""], ["ing", "e"], ["er", ""], ["er", "e"], ["est", ""], ["est", "e"], ["ly", ""], ["ily", "y"]]) {
    if (w.endsWith(end) && w.length - end.length >= 2) {
      const stem = w.slice(0, -end.length) + add;
      stems.push(stem);
      if (!add && /([bdgklmnprt])\1$/.test(stem)) stems.push(stem.slice(0, -1)); // stopped -> stop
    }
  }
  return stems.some(s => isBase(s) || starter.has(s));
}

// Two known words written as one, like "campout": not a misspelling.
const compound = (w, starter) => [...Array(w.length - 5).keys()].map(i => i + 3).some(i => knownForm(w.slice(0, i), starter) && knownForm(w.slice(i), starter));

// Edit distance that counts swapped neighbours as one change ("thier" -> "their").
export function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    const cost = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}

const sharedStart = (a, b) => { let n = 0; while (n < a.length && a[n] === b[n]) n++; return n; };

// The one word he most likely meant, or null when there is no clear single answer.
export function meantWord(w, starter) {
  const pool = new Set([...COMMON_WORDS, ...EXTRA, ...starter, ...[...COMMON_WORDS].map(c => c + "s")]);
  let best = [], key = null;
  for (const c of pool) {
    if (!LETTERS.test(c) || c[0] !== w[0] || Math.abs(c.length - w.length) > 2) continue;
    const d = distance(w, c);
    if (d > 2) continue;
    const k = [d, -sharedStart(w, c)];
    if (!key || k[0] < key[0] || (k[0] === key[0] && k[1] < key[1])) { key = k; best = [c]; }
    else if (k[0] === key[0] && k[1] === key[1]) best.push(c);
  }
  return best.length === 1 ? best[0] : null;
}

// How hard a word is, on the app's own levels: 1 everyday, 2 common, 3 harder.
export function writingLevel(meant, starterWords) {
  const byText = t => starterWords.find(s => s.text === t);
  const s = byText(meant) || (meant.endsWith("s") ? byText(meant.slice(0, -1)) : null);
  if (s) return s.level;
  return meant.length <= 5 ? 1 : meant.length <= 7 ? 2 : 3;
}

// Words in his sentence that he likely meant to spell differently.
export function wordsFromSentence(text, starterWords) {
  const starter = new Set(starterWords.map(s => s.text.toLowerCase()));
  const found = [];
  for (const raw of String(text || "").split(/[^A-Za-z']+/)) {
    const token = raw.replace(/'/g, "");
    if (token.length < 3 || /[A-Z]/.test(token)) continue; // short words, names and capitals stay untouched
    const w = token.toLowerCase();
    if (!LETTERS.test(w) || knownForm(w, starter) || compound(w, starter)) continue;
    const meant = meantWord(w, starter);
    if (meant && !found.some(f => f.meant === meant)) found.push({ wrong: w, meant, level: writingLevel(meant, starterWords) });
  }
  return found;
}
