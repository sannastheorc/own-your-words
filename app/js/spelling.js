// SEEDSED — spelling.js
// Purpose: pure spelling logic: the word routine, comparing what he typed, generating sound-alike
//          misspellings for words the helper adds, and the checks behind the games.
// Boundaries: no storage, no UI, no audio. Never claims to judge meaning: a computer offline can't
//             tell whether his own sentence uses a word well, so checkOwnSentence checks only that
//             the word is there, spelled right, in a real sentence. A person reviews the rest.

import { COMMON_WORDS } from "./commonwords.js";

// ---- The routine for each word
export const ROUTINE = ["learn", "copy", "copy", "memory", "memory", "pick", "final"];

export function stepsFor(word) {
  return ROUTINE.filter(s => s !== "pick" || (word.wrong && word.wrong.length >= 2));
}

// A pass moves on one step. A miss goes back one step, never below the first spelling step.
export function nextStep(word, step, ok) {
  const steps = stepsFor(word);
  if (ok) return step + 1 >= steps.length ? { step: steps.length, done: true } : { step: step + 1, done: false };
  return { step: Math.max(1, step - 1), done: false };
}

export const same = (typed, target) => normal(typed) === normal(target);
export const normal = s => String(s || "").trim().toLowerCase();

// Letter-by-letter comparison for the "compare" view: [{ ch, ok }] for what he typed.
export function compareLetters(typed, target) {
  const a = normal(typed), b = normal(target);
  return [...a].map((ch, i) => ({ ch, ok: b[i] === ch }));
}

// ---- Sound-alike misspellings for helper-added words
const RULES = [
  [/ph/, "f"], [/ck/, "k"], [/ight/, "ite"], [/tion/, "shun"], [/ee/, "ea"], [/ea/, "ee"], [/ai/, "ay"], [/ay/, "ai"],
  [/oo/, "ou"], [/wh/, "w"], [/^kn/, "n"], [/^wr/, "r"], [/gh/, ""], [/er$/, "ur"], [/or$/, "er"], [/ar$/, "er"],
  [/le$/, "el"], [/y$/, "ie"], [/ie$/, "y"], [/c(?=[aou])/, "k"], [/s(?=[aeiou])/, "z"], [/([bdfglmnprstz])\1/, "$1"],
  [/([aeiou])([bdglmnprt])(?=[aeiou])/, "$1$2$2"], [/e$/, ""], [/ce$/, "se"], [/se$/, "ce"]
];

export function soundAlikes(word, count = 3) {
  const lower = normal(word);
  const out = [];
  const seen = new Set([lower]);
  for (const [re, to] of RULES) {
    if (out.length >= count) break;
    const v = lower.replace(re, to);
    if (v.length >= 2 && !seen.has(v) && !COMMON_WORDS.has(v)) { seen.add(v); out.push(v); }
  }
  return out;
}

// ---- Code Crack: green right place, yellow in the word elsewhere, gray not in it.
export function crackFeedback(guess, target) {
  const g = [...normal(guess)], t = [...normal(target)];
  const marks = g.map(() => "no");
  const left = {};
  t.forEach((ch, i) => { if (g[i] === ch) marks[i] = "right"; else left[ch] = (left[ch] || 0) + 1; });
  g.forEach((ch, i) => { if (marks[i] !== "right" && left[ch] > 0) { marks[i] = "near"; left[ch]--; } });
  return g.map((ch, i) => ({ ch, mark: marks[i] }));
}

// ---- Fill the gap: the right word plus choices from a clearly different group of words, so only one
// fits. Describing words swap too easily ("Are you ready/okay to leave?"), so they're one group.
const GROUP = { adjective: "describe", adverb: "describe", word: "describe", time: "describe", amount: "describe", place: "describe",
  noun: "thing", pronoun: "thing", mine: "thing", verb: "doing", helper: "doing", question: "question", joining: "joining" };
export const groupOf = word => GROUP[word.kind] || "thing";

export function gapChoices(word, pool, rng = Math.random, count = 3) {
  const others = pool.filter(p => p.key !== word.key && groupOf(p) !== groupOf(word));
  const picked = [];
  const copy = others.slice();
  while (picked.length < count && copy.length) picked.push(copy.splice(Math.floor(rng() * copy.length), 1)[0].text);
  return shuffle([word.text, ...picked], rng);
}

export function shuffle(list, rng = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---- Spot the typo: a sentence with one word misspelled.
export function typoSentence(word, rng = Math.random) {
  const full = word.gap.replace("___", word.text);
  const wrong = word.wrong[Math.floor(rng() * word.wrong.length)];
  const sentenceStart = word.gap.startsWith("___");
  const shown = sentenceStart ? wrong[0].toUpperCase() + wrong.slice(1) : wrong;
  return { full, words: word.gap.replace("___", shown).split(" "), wrong: shown, right: word.text, at: word.gap.split(" ").findIndex(t => t.includes("___")) };
}

// ---- His own sentence: what a computer can honestly check.
export function checkOwnSentence(text, word) {
  const clean = String(text || "").trim();
  const tokens = clean.toLowerCase().match(/[a-z']+/g) || [];
  const hasWord = normal(word).split(" ").every(p => tokens.includes(p));
  return { hasWord, wordCount: tokens.length, ok: hasWord && tokens.length >= 3 };
}
