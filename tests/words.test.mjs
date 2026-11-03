// SEEDSED — tests for the starter words and the pure spelling logic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { STARTER } from "../app/js/words.js";
import { COMMON_WORDS } from "../app/js/commonwords.js";
import { groupOf, ROUTINE, stepsFor, nextStep, same, compareLetters, soundAlikes, crackFeedback, gapChoices, typoSentence, checkOwnSentence } from "../app/js/spelling.js";

const seq = () => { let x = 0.37; return () => (x = (x * 9301 + 49297) % 233280 / 233280); };
const word = t => STARTER.find(w => w.text === t);

test("every starter word has a meaning, a gap sentence and at least 3 made-up spellings", () => {
  assert.ok(STARTER.length >= 80, `only ${STARTER.length}`);
  assert.equal(new Set(STARTER.map(w => w.key)).size, STARTER.length);
  for (const w of STARTER) {
    assert.ok(w.meaning.length > 5, w.text);
    assert.ok(w.gap.split("___").length === 2, `${w.text}: one gap`);
    assert.equal(w.wrong.length, 3, w.text);
    assert.equal(new Set([w.text.toLowerCase(), ...w.wrong.map(x => x.toLowerCase())]).size, 4, `${w.text}: all different`);
    for (const x of w.wrong) assert.ok(!COMMON_WORDS.has(x.toLowerCase()), `${w.text}: "${x}" is a real word`);
    assert.ok(!new RegExp(`\\b${w.text}\\b`, "i").test(w.meaning), `${w.text}: the meaning shouldn't use the word`);
  }
});

test("nothing heavy or childish in the words, meanings or sentences", () => {
  const heavy = /\b(stroke|sick|pain|hurt|die|died|dead|death|kill|stupid|dumb|fail\w*|retard\w*|slow learner|cute|mommy|daddy|bunny|puppy)\b/i;
  for (const w of STARTER) assert.ok(!heavy.test(`${w.text} ${w.meaning} ${w.gap}`), w.text);
});

test("routine order: learn the meaning, copy twice, memory twice, pick the spelling, then the last typed try", () => {
  assert.deepEqual(ROUTINE, ["learn", "copy", "copy", "memory", "memory", "pick", "final"]);
  assert.deepEqual(stepsFor({ wrong: ["a"] }).includes("pick"), false, "too few sound-alikes: skip the pick step");
  const w = word("tomorrow");
  let step = 0;
  for (let i = 0; i < 6; i++) { const r = nextStep(w, step, true); assert.equal(r.done, false); step = r.step; }
  assert.equal(stepsFor(w)[step], "final");
  assert.equal(nextStep(w, step, true).done, true);
});

test("routine: a miss goes back one step, with no way to lose the word or fall behind the first spelling step", () => {
  const w = word("tomorrow");
  assert.deepEqual(nextStep(w, 6, false), { step: 5, done: false });
  assert.deepEqual(nextStep(w, 1, false), { step: 1, done: false });
});

test("comparing ignores capitals and marks the letters that differ", () => {
  assert.ok(same(" wednesday", "Wednesday"));
  assert.ok(!same("wensday", "Wednesday"));
  assert.deepEqual(compareLetters("tomorow", "tomorrow").map(x => x.ok), [true, true, true, true, true, false, false]);
});

test("sound-alikes for helper words: different, not real words, and common patterns covered", () => {
  for (const [w, wanted] of [["pharmacy", "farmacy"], ["coffee", "cofee"], ["night", "nite"], ["station", "stashun"], ["tomorrow", "tomorow"]]) {
    const out = soundAlikes(w);
    assert.ok(out.length >= 1 && out.length <= 3, w);
    assert.ok(out.includes(wanted), `${w}: ${out}`);
    for (const x of out) assert.ok(x !== w && !COMMON_WORDS.has(x), x);
  }
  assert.ok(soundAlikes("Brenda").every(x => x !== "brenda"));
});

test("Code Crack marks right place, wrong place and not in the word, handling repeats fairly", () => {
  const marks = (g, t) => crackFeedback(g, t).map(x => x.mark).join(" ");
  assert.equal(marks("water", "water"), "right right right right right");
  assert.equal(marks("tewar", "water"), "near near near near right");
  assert.equal(marks("llama", "water"), "no no near no no");
  assert.equal(marks("sheet", "there"), "no right right near near", "two e's in both");
  assert.equal(marks("eerie", "there").split(" ").filter(m => m !== "no").length, 3);
});

test("fill the gap: the right word plus others of a different kind, so only one fits", () => {
  const w = word("because");
  const c = gapChoices(w, STARTER, seq());
  assert.equal(c.length, 4);
  assert.ok(c.includes("because"));
  assert.equal(new Set(c).size, 4);
  for (const t of c.filter(x => x !== "because")) assert.notEqual(word(t).kind, w.kind);
  for (const x of STARTER) for (const t of gapChoices(x, STARTER, seq()).filter(o => o !== x.text)) assert.notEqual(groupOf(word(t)), groupOf(x), `${x.text} / ${t}`);
});

test("spot the typo: exactly one misspelled word, keeping the capital at the start of a sentence", () => {
  const t = typoSentence(word("tomorrow"), seq());
  assert.ok(word("tomorrow").wrong.includes(t.wrong));
  assert.equal(t.words[t.at], t.wrong + ".".repeat(t.words[t.at].endsWith(".") ? 1 : 0));
  assert.ok(!t.words.join(" ").includes("tomorrow"));
  assert.match(typoSentence(word("where"), seq()).wrong, /^[A-Z]/);
});

test("his own sentence: checks the word is there, spelled right, in a real sentence, and no more", () => {
  assert.equal(checkOwnSentence("I will see you tomorrow.", "tomorrow").ok, true);
  assert.equal(checkOwnSentence("tomorrow", "tomorrow").ok, false, "needs to be a sentence");
  assert.equal(checkOwnSentence("I will see you tomorow.", "tomorrow").hasWord, false);
  assert.equal(checkOwnSentence("Tomorrow is Friday.", "tomorrow").ok, true, "capitals are fine");
  assert.equal(checkOwnSentence("the tomorrowland ride", "tomorrow").hasWord, false, "whole word only");
});
