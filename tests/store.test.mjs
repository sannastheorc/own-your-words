// SEEDSED — tests for saving, the Word Lab queue, reviews, the daily log, goals, certificates and active time.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Store, memoryStorage, ActiveClock, IDLE_MS, REVIEW_DAYS, dayKey } from "../app/js/store.js";
import { evaluateGoal } from "../app/js/goals.js";
import { THREADS, STORIES } from "../app/js/content.js";
import { STARTER } from "../app/js/words.js";

const DAY = 864e5;
const clock = (y = 2026, m = 10, d = 3) => { let t = new Date(y, m, d, 10).getTime(); const now = () => t; now.add = n => { t += n * DAY; }; return now; };
const finishWord = (s, key) => { s.beginWord(key); let r; do { r = s.submitStep(key, true); } while (!r.done); return r; };

test("the queue offers today's new words, then stops unless he asks for more", () => {
  const now = clock(); const s = new Store(memoryStorage(), now);
  s.data.perDay = 2;
  const a = s.nextWord(); assert.equal(a.mode, "lab");
  finishWord(s, a.key);
  const b = s.nextWord(); assert.notEqual(b.key, a.key);
  finishWord(s, b.key);
  assert.equal(s.nextWord(), null, "daily amount done");
  assert.ok(s.nextWord({ extra: true }), "but he can choose more");
});

test("the same day he finishes the routine the word is his, and it survives a reload", () => {
  const now = clock(); const store = memoryStorage(); const s = new Store(store, now);
  const { key } = s.nextWord();
  assert.equal(finishWord(s, key).done, true);
  const again = new Store(store, now);
  assert.equal(again.data.words[key].owned, s.today());
  assert.deepEqual(again.ownedKeys(), [key]);
  assert.deepEqual(again.dayLog().wordsOwned, [key]);
});

test("stopping partway resumes at the same step", () => {
  const now = clock(); const store = memoryStorage(); const s = new Store(store, now);
  const { key } = s.nextWord(); s.beginWord(key); s.submitStep(key, true); s.submitStep(key, true);
  const again = new Store(store, now);
  assert.deepEqual(again.nextWord(), { key, mode: "lab" });
  assert.equal(again.stateOf(key).step, 2);
});

test("owned words come back for a check on a growing schedule; a miss never takes the word away", () => {
  const now = clock(); const s = new Store(memoryStorage(), now);
  const { key } = s.nextWord(); finishWord(s, key);
  now.add(REVIEW_DAYS[0]);
  assert.deepEqual(s.nextWord(), { key, mode: "review" });
  s.submitReview(key, true);
  assert.notEqual(s.nextWord()?.mode, "review");
  now.add(REVIEW_DAYS[1]);
  assert.equal(s.nextWord().mode, "review");
  s.submitReview(key, false);
  assert.equal(s.data.words[key].owned !== null, true);
  now.add(1);
  assert.equal(s.nextWord().mode, "review");
});

test("helper words: come first, get sound-alikes and a gap from his sentence, and no duplicates", () => {
  const s = new Store(memoryStorage(), clock());
  const { item } = s.addMine("Pharmacy", "Where you pick up medicine.", "I need to stop at the pharmacy after work.");
  assert.equal(item.gap, "I need to stop at the ___ after work.");
  assert.ok(item.wrong.includes("farmacy"));
  assert.equal(s.nextWord().key, item.key);
  assert.match(s.addMine("pharmacy").error, /already/);
  assert.ok(s.addMine("123").error);
  assert.equal(s.addMine("because").item.meaning, STARTER.find(w => w.key === "because").meaning, "borrows what we already know");
});

test("own sentences are saved for a person to review; nothing is marked correct by the app", () => {
  const s = new Store(memoryStorage(), clock());
  s.addSentence("tomorrow", "I work tomorrow.");
  assert.equal(s.data.sentences[0].review, null);
  s.reviewSentence(s.data.sentences[0].id, "good");
  assert.equal(s.data.sentences[0].review, "good");
  assert.equal(s.dayLog().sentences, 1);
});

test("active time: gaps while idle don't count, and a pause stops the clock", () => {
  let total = 0;
  const c = new ActiveClock(ms => { total += ms; });
  c.touch(0); c.touch(10000); assert.equal(total, 10000);
  c.touch(10000 + 600000); assert.equal(total, 10000 + IDLE_MS, "10 idle minutes count as 45 seconds at most");
  c.pause(); c.touch(9e9); assert.equal(total, 10000 + IDLE_MS);
});

test("the daily summary reports real counts and time", () => {
  const now = clock(); const s = new Store(memoryStorage(), now);
  s.addActive(18 * 60000); s.bump("puzzles"); s.bump("stories", 2);
  finishWord(s, s.nextWord().key);
  const d = s.summaryOf();
  assert.deepEqual([d.minutes, d.wordsOwned, d.activities], [18, 1, 3]);
  assert.equal(s.dayLog(dayKey(now() - DAY)).activeMs, 0, "another day is separate");
});

test("goals: weekly goals track each week; a week of effort counts even if the target wasn't hit", () => {
  const log = { "2026-11-02": { activeMs: 60000 }, "2026-11-03": { activeMs: 60000 }, "2026-11-04": { activeMs: 60000 }, "2026-11-09": { activeMs: 60000 } };
  const ev = evaluateGoal({ type: "days", target: 3 }, log, "2026-11", "2026-11-10");
  assert.deepEqual(ev.weeks.slice(0, 2).map(w => [w.value, w.met]), [[3, true], [1, false]]);
  assert.equal(ev.reached, false);
  assert.equal(ev.title, "Practise 3 days a week");
  assert.equal(ev.weeks.length, 5, "November has 5 weekly blocks");
});

test("goals: reaching one stamps the date and issues exactly one certificate with that date", () => {
  const now = clock(); const s = new Store(memoryStorage(), now);
  s.setGoal(0, { type: "words", target: 1 });
  const r = finishWord(s, s.nextWord().key);
  assert.equal(r.wins.length, 1);
  assert.equal(r.wins[0].title, "Goal Reached");
  assert.equal(r.wins[0].on, s.today());
  assert.equal(s.goalsFor()[0].reachedOn, s.today());
  now.add(1);
  finishWord(s, s.nextWord().key);
  assert.equal(s.data.certs.length, 1, "not issued twice");
});

test("goals: a helper can check off a goal that isn't about reading", () => {
  const s = new Store(memoryStorage(), clock());
  s.setGoal(0, { type: "custom", text: "Cook a meal each week" });
  for (const w of [0, 1]) assert.deepEqual(s.toggleCheck(0, w), []);
  assert.equal(s.toggleCheck(0, 2)[0].detail, "Cook a meal each week");
});

test("milestones: certificates at 10 owned words", () => {
  const s = new Store(memoryStorage(), clock());
  s.data.perDay = 20;
  let wins = [];
  for (let i = 0; i < 10; i++) wins = finishWord(s, s.nextWord().key).wins;
  assert.match(wins[0].detail, /Spelled 10 words from memory/);
});

test("the month report states only measured numbers and says what it is", () => {
  const now = clock(); const s = new Store(memoryStorage(), now);
  s.data.name = "Test";
  s.addActive(30 * 60000); s.bump("gaps", 4); s.addSentence("tomorrow", "I work tomorrow.");
  s.setGoal(0, { type: "minutes", target: 20 });
  const r = s.monthReport();
  assert.match(r, /Days practised: 1/);
  assert.match(r, /Active practice minutes: 30 /);
  assert.match(r, /Own sentences written: 1 \(reviewed by helper: 0\)/);
  assert.match(r, /Week 1: 30/);
  assert.match(r, /Not an official record/);
});

test("corrupt or foreign saved data starts fresh, and a failed save never throws", () => {
  const st = memoryStorage(); st.setItem("own-your-words/data", "{bad");
  assert.deepEqual(new Store(st).data.mine, []);
  const s = new Store({ getItem: () => null, setItem: () => { throw new Error("full"); } });
  s.bump("puzzles");
  assert.equal(s.saveError.message, "full");
});

test("content: threads and stories are complete, and every story path reaches the end", () => {
  for (const t of THREADS) {
    assert.ok(t.steps.some(x => x.type === "choose") && t.steps.some(x => x.type === "typed"), t.id);
    for (const x of t.steps.filter(x => x.type === "choose")) assert.ok(x.options.includes(x.right) && x.why, t.id);
    for (const x of t.steps.filter(x => x.type === "typed")) assert.ok(STARTER.some(w => w.text === x.word), `${t.id}: ${x.word}`);
  }
  for (const st of STORIES) {
    const ids = new Set(st.nodes.map(n => n.id));
    const seen = new Set(); const walk = id => { if (seen.has(id)) return; seen.add(id); assert.ok(ids.has(id), `${st.id}: ${id}`); st.nodes.find(n => n.id === id).options.forEach(o => walk(o.to)); };
    walk(st.start);
    assert.equal(seen.size, ids.size, `${st.id}: no unreachable pages`);
    assert.ok(st.nodes.some(n => !n.options.length), `${st.id}: has an ending`);
  }
});
