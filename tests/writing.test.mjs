// SEEDSED — tests for the quiet misspelling queue (Brian, 2026-11-07): words he misspells in his own
// sentences come back later as ordinary Word Lab words. He is never corrected and never told.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Store, memoryStorage } from "../app/js/store.js";
import { STARTER } from "../app/js/words.js";
import { wordsFromSentence, distance } from "../app/js/writingwords.js";

const DAY = 864e5;
const clock = () => { let t = new Date(2026, 10, 7, 10).getTime(); const now = () => t; now.add = n => { t += n * DAY; }; return now; };
const finishWord = (s, key) => { s.beginWord(key); let r; do { r = s.submitStep(key, true); } while (!r.done); };
const HIS = ["i help other pepole put thier tent up at the compny campout", "my frinds love to tent camp"];

test("his two real sentences give people, their, company and friends", () => {
  assert.deepEqual(wordsFromSentence(HIS[0], STARTER).map(f => [f.wrong, f.meant, f.level]),
    [["pepole", "people", 1], ["thier", "their", 1], ["compny", "company", 2]]);
  assert.deepEqual(wordsFromSentence(HIS[1], STARTER).map(f => [f.wrong, f.meant]), [["frinds", "friends"]]);
});

test("a swapped pair of letters counts as one change", () => {
  assert.equal(distance("thier", "their"), 1);
  assert.equal(distance("pepole", "people"), 1);
});

test("names, compounds, slang and correct word forms are left alone", () => {
  for (const s of ["Brian went to the store with his friends", "We met Brian at the campout", "we were loving the campfire",
    "the dog chased the cats quickly", "gonna get some stuff", "I bought three tickets"]) assert.deepEqual(wordsFromSentence(s, STARTER), [], s);
});

test("his sentence is saved exactly as he typed it, with nothing marked", () => {
  const s = new Store(memoryStorage(), clock());
  s.addSentence("tent", HIS[0]);
  assert.equal(s.data.sentences[0].text, HIS[0]);
  assert.deepEqual(Object.keys(s.data.sentences[0]).sort(), ["id", "key", "on", "review", "text", "word"]);
});

test("an everyday word comes into the Word Lab a couple of new words later, not straight away", () => {
  const now = clock(), s = new Store(memoryStorage(), now);
  s.data.perDay = 20;
  s.addSentence("tent", "i put thier tent up");
  const first = s.nextWord(); assert.notEqual(s.word(first.key).text, "their");
  finishWord(s, first.key);
  const second = s.nextWord(); assert.notEqual(s.word(second.key).text, "their");
  finishWord(s, second.key);
  const third = s.nextWord();
  assert.equal(s.word(third.key).text, "their");
  assert.equal(third.mode, "lab");
});

test("a harder word waits until he reaches that level", () => {
  const s = new Store(memoryStorage(), clock());
  s.data.perDay = 200;
  s.addSentence("tent", "the compny campout");
  for (let i = 0; i < 6; i++) { const n = s.nextWord(); assert.notEqual(s.word(n.key).text, "company"); finishWord(s, n.key); }
  s.data.level = 2;
  const n = s.nextWord();
  assert.equal(s.word(n.key).text, "company");
});

test("sentences saved before this version are read once when it first loads", () => {
  const storage = memoryStorage(), now = clock();
  const old = new Store(storage, now);
  old.data.sentences = HIS.map((text, i) => ({ id: `${i}`, key: "tent", word: "tent", text, on: "2026-11-07", review: null }));
  delete old.data.writing; delete old.data.writingRead;
  old.save();
  const s = new Store(storage, now);
  assert.deepEqual(s.writingQueue().map(w => w.meant), ["people", "their", "company", "friends"]);
  assert.deepEqual(new Store(storage, now).writingQueue().length, 4, "read only once");
});

test("the helper can take a word off the list", () => {
  const s = new Store(memoryStorage(), clock());
  s.addSentence("tent", "my frinds came");
  s.removeWriting("friends");
  assert.deepEqual(s.writingQueue(), []);
  s.addSentence("tent", "my frinds came again");
  assert.deepEqual(s.writingQueue(), [], "a removed word stays removed");
});

test("he never sees the list: it lives only on the helper screens", () => {
  const app = readFileSync(new URL("../app/js/app.js", import.meta.url), "utf8");
  const useIt = app.match(/function useItCheck\(\) \{[\s\S]*?\n\}/)[0];
  assert.ok(!/writing/i.test(useIt));
  assert.match(app, /"h-writing": viewWriting/);
});
