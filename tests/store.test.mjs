// SEEDSED — tests for saving, the Word Lab queue, reviews, the daily log, goals, certificates and active time.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Store, memoryStorage, ActiveClock, IDLE_MS, REVIEW_DAYS, dayKey } from "../app/js/store.js";
import { evaluateGoal } from "../app/js/goals.js";
import { THREADS, STORIES, READS } from "../app/js/content.js";
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

test("interest words alternate with everyday words, and his own come first", () => {
  const s = new Store(memoryStorage(), clock());
  const first = s.allWords().slice(0, 6);
  assert.deepEqual(first.map(w => !!w.topic), [true, false, true, false, true, false]);
  const { item } = s.addMine("pharmacy");
  assert.equal(s.allWords()[0].key, item.key);
  assert.equal(new Set(s.allWords().map(w => w.key)).size, s.allWords().length);
  s.data.level = 3;
  assert.ok(s.allWords().slice(1, 5).every(w => w.level === 3));
});

test("content additions don't disturb progress: a started word stays next", () => {
  const now = clock(); const store = memoryStorage(); const s = new Store(store, now);
  s.stateOf("said").started = s.today(); s.stateOf("said").step = 3; s.save();
  assert.deepEqual(new Store(store, now).nextWord(), { key: "said", mode: "lab" });
});

test("Read It: every question's right answer is backed by the reading's own words", () => {
  assert.ok(READS.length >= 6);
  assert.equal(new Set(READS.map(r => r.id)).size, READS.length);
  for (const r of READS) {
    assert.ok(r.questions.length >= 3, r.id);
    for (const q of r.questions) {
      assert.ok(q.others.length >= 2 && !q.others.includes(q.right), `${r.id}: ${q.q}`);
      const plain = s => s.toLowerCase().replace(/[^a-z0-9 -]/g, "");
      const long = plain(q.right).split(" ").filter(x => x.length > 3 || /\d/.test(x));
      const keys = long.length ? long : [plain(q.right)];
      const found = keys.filter(k => plain(r.text).includes(k)).length;
      assert.ok(found >= Math.ceil(keys.length / 2), `${r.id}: "${q.right}" isn't backed by the text`);
    }
  }
});

test("baking gets more attention than cooking, as asked", () => {
  const bakeWords = /^(bake|oven|flour|sugar|butter|dough|pie|batter|cake|cookies|muffin|brownies|frosting|yeast|whisk|powder|cupcake|chocolate|biscuit|tablespoon|teaspoon|spatula|preheat|knead|vanilla|cinnamon|ingredient|recipe|measure)$/;
  const words = STARTER.filter(w => w.topic);
  assert.ok(words.filter(w => bakeWords.test(w.text)).length >= 20);
  assert.ok(words.filter(w => w.text === "cook").length === 1);
  const titles = READS.map(r => r.title).join();
  assert.ok((titles.match(/Cookies|Brownies|Muffins|Recipe/g) || []).length >= 4, titles);
});

test("nothing identifying or heavy in the interest content", () => {
  const all = JSON.stringify([THREADS, STORIES, READS, STARTER.filter(w => w.topic)]);
  assert.ok(!/\b(stupid|dumb|fail\w*|retard\w*|disab\w*|caregiver|client|stroke)\b/i.test(all));
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
