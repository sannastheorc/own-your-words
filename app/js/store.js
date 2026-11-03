// SEEDSED — store.js
// Purpose: REMEMBER everything on this phone: each word's place in the routine, owned words and their
//          review schedule, the daily log (active time and counts), goals, sentences and certificates.
//          Saves after every change so nothing is lost on close.
// Input:  an injected storage and clock. Output: the queue of what to practise and honest totals.
// Boundaries: no UI, no audio. Nothing leaves the phone. Numbers come only from what actually happened.

import { STARTER } from "./words.js";
import { stepsFor, nextStep, soundAlikes, normal } from "./spelling.js";
import { evaluateGoal, GOAL_TYPES, ACTIVITY_FIELDS } from "./goals.js";
import { PLAYS_PER_LESSON } from "./blocks.js";

const KEY = "own-your-words/data";
export const REVIEW_DAYS = Object.freeze([1, 3, 7, 14, 30, 60]);
export const OWN_MILESTONES = Object.freeze([10, 25, 50, 100, 150, 200]);
const DAY = 864e5;

export const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function memoryStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}

const empty = () => ({ version: 1, name: "", askedName: false, level: 1, perDay: 3, words: {}, mine: [], log: {}, goals: {}, certs: [], sentences: [], readings: [], arcade: { plays: 0, best: 0 }, done: { threads: [], stories: [], readings: [] } });

export class Store {
  constructor(storage, now = () => Date.now()) {
    this.storage = storage;
    this.now = now;
    this.saveError = null;
    this.data = this.#load();
  }

  #load() {
    try {
      const d = JSON.parse(this.storage.getItem(KEY));
      return d && d.version === 1 ? { ...empty(), ...d, arcade: { ...empty().arcade, ...(d.arcade || {}) }, done: { ...empty().done, ...(d.done || {}) } } : empty();
    } catch { return empty(); }
  }

  save() {
    try { this.storage.setItem(KEY, JSON.stringify(this.data)); this.saveError = null; } catch (e) { this.saveError = e; }
  }

  today() { return dayKey(this.now()); }
  month() { return this.today().slice(0, 7); }
  dayLog(d = this.today()) { return (this.data.log[d] ||= { activeMs: 0, steps: 0, wordsOwned: [], reviews: 0, puzzles: 0, typos: 0, gaps: 0, threads: 0, stories: 0, readings: 0, sentences: 0 }); }
  bump(field, n = 1) {
    this.dayLog()[field] = (this.dayLog()[field] || 0) + n;
    if (ACTIVITY_FIELDS.includes(field)) this.earnPlay();
    this.save();
    return this.checkGoals();
  }

  // ---- Block Drop: finished lessons earn plays. A reward only: nothing here is counted as practice.
  earnPlay() { this.data.arcade.plays += PLAYS_PER_LESSON; }
  usePlay() {
    if (this.data.arcade.plays <= 0) return false;
    this.data.arcade.plays--;
    this.save();
    return true;
  }
  recordScore(score) { if (score > this.data.arcade.best) { this.data.arcade.best = score; this.save(); return true; } return false; }
  addActive(ms) { if (ms > 0) { this.dayLog().activeMs += ms; this.save(); } }

  // ---- Words
  allWords() {
    return [...this.data.mine, ...STARTER.filter(w => w.level >= this.data.level), ...STARTER.filter(w => w.level < this.data.level)];
  }
  word(key) { return this.allWords().find(w => w.key === key) || null; }
  stateOf(key) { return (this.data.words[key] ||= { step: 0, started: null, owned: null, review: null, misses: 0 }); }
  ownedKeys() { return Object.keys(this.data.words).filter(k => this.data.words[k].owned && this.word(k)); }
  startedWords() { return this.allWords().filter(w => this.data.words[w.key]?.started); }

  // What's next in the Word Lab: reviews first, then unfinished words, then today's new words.
  nextWord({ extra = false } = {}) {
    const now = this.now();
    const due = this.ownedKeys().map(k => ({ k, due: this.data.words[k].review?.due ?? Infinity })).filter(x => x.due <= now).sort((a, b) => a.due - b.due);
    if (due.length) return { key: due[0].k, mode: "review" };
    const words = this.allWords();
    const open = words.find(w => { const s = this.data.words[w.key]; return s?.started && !s.owned; });
    if (open) return { key: open.key, mode: "lab" };
    const startedToday = Object.values(this.data.words).filter(s => s.started === this.today()).length;
    if (startedToday >= this.data.perDay && !extra) return null;
    const fresh = words.find(w => !this.data.words[w.key]?.started);
    return fresh ? { key: fresh.key, mode: "lab" } : null;
  }

  // The current step of a word in the routine, marking it started.
  beginWord(key) {
    const s = this.stateOf(key);
    if (!s.started) { s.started = this.today(); this.save(); }
    return s.step;
  }

  // One step of the routine finished. Returns { step, done, wins }.
  submitStep(key, ok) {
    const word = this.word(key);
    const s = this.stateOf(key);
    const r = nextStep(word, s.step, ok);
    s.step = r.step;
    if (!ok) s.misses++;
    this.dayLog().steps++;
    let wins = [];
    if (r.done) {
      s.owned = this.today();
      s.review = { level: 0, due: this.now() + REVIEW_DAYS[0] * DAY };
      this.dayLog().wordsOwned.push(key);
      this.earnPlay();
      wins = [...this.#milestones(), ...this.checkGoals()];
    }
    this.save();
    return { ...r, wins };
  }

  // A later check on an owned word. A miss only brings it back sooner; a word is never taken away.
  submitReview(key, ok) {
    const s = this.stateOf(key);
    const level = ok ? Math.min((s.review?.level ?? 0) + 1, REVIEW_DAYS.length - 1) : 0;
    s.review = { level, due: this.now() + REVIEW_DAYS[level] * DAY };
    this.dayLog().reviews++;
    this.save();
    return this.checkGoals();
  }

  addMine(text, meaning = "", gap = "") {
    const clean = String(text || "").replace(/\s+/g, " ").trim().slice(0, 40);
    const key = normal(clean);
    if (!/^[a-z' -]+$/.test(key)) return { error: "Use letters only." };
    if (this.data.mine.some(w => w.key === `mine:${key}`)) return { error: `"${clean}" is already on the list.` };
    const starter = STARTER.find(w => w.key.toLowerCase() === key);
    const sentence = gap.trim() ? (gap.includes("___") ? gap.trim() : gap.trim().replace(new RegExp(`\\b${clean}\\b`, "i"), "___")) : "";
    const item = { key: `mine:${key}`, text: clean, wrong: starter?.wrong || soundAlikes(clean), kind: "mine", meaning: meaning.trim() || starter?.meaning || "", gap: sentence.includes("___") ? sentence : starter?.gap || "", level: 0, source: "mine" };
    this.data.mine.push(item);
    this.save();
    return { item };
  }
  removeMine(key) {
    this.data.mine = this.data.mine.filter(w => w.key !== key);
    this.save();
  }

  // ---- His own sentences. The app checks spelling of the word; a person judges the meaning.
  addSentence(key, text) {
    this.data.sentences.push({ id: `${this.now()}`, key, word: this.word(key)?.text || key, text, on: this.today(), review: null });
    this.dayLog().sentences++;
    this.earnPlay();
    this.save();
    return this.checkGoals();
  }
  reviewSentence(id, verdict) {
    const s = this.data.sentences.find(x => x.id === id);
    if (s) { s.review = verdict; this.save(); }
  }

  // ---- Helper's readings from his books
  addReading(title, text, questions) {
    const r = { id: `r${this.now()}`, title: title.trim() || "Reading", text: text.trim(), questions };
    this.data.readings.push(r);
    this.save();
    return r;
  }
  removeReading(id) { this.data.readings = this.data.readings.filter(r => r.id !== id); this.save(); }

  // ---- Goals and certificates
  goalsFor(month = this.month()) { return (this.data.goals[month] ||= []); }
  setGoal(index, goal, month = this.month()) {
    const list = this.goalsFor(month);
    if (goal) list[index] = goal; else list.splice(index, 1);
    this.save();
  }
  toggleCheck(index, week, month = this.month()) {
    const g = this.goalsFor(month)[index];
    g.checks = g.checks || [];
    g.checks = g.checks.includes(week) ? g.checks.filter(w => w !== week) : [...g.checks, week];
    this.save();
    return this.checkGoals();
  }

  // Stamps any goal newly reached today, once, and issues its certificate.
  checkGoals() {
    const wins = [];
    const month = this.month();
    for (const g of this.goalsFor(month)) {
      const ev = evaluateGoal(g, this.data.log, month, this.today());
      if (ev.reached && !g.reachedOn) {
        g.reachedOn = this.today();
        wins.push(this.addCert(`goal:${month}:${ev.title}`, "Goal Reached", ev.title));
      }
    }
    this.save();
    return wins.filter(Boolean);
  }
  #milestones() {
    const n = this.ownedKeys().length;
    return OWN_MILESTONES.filter(m => m === n).map(m => this.addCert(`own:${m}`, "Words I Own", `Spelled ${m} words from memory, no hints and no autocorrect`)).filter(Boolean);
  }
  addCert(id, title, detail) {
    if (this.data.certs.some(c => c.id === id)) return null;
    const cert = { id, title, detail, on: this.today() };
    this.data.certs.push(cert);
    this.save();
    return cert;
  }

  // ---- Totals
  summaryOf(day = this.today()) {
    const d = this.data.log[day] || this.dayLog(day);
    return { ...d, minutes: Math.round(d.activeMs / 60000), wordsOwned: d.wordsOwned.length, ownedList: d.wordsOwned,
      activities: d.puzzles + d.typos + d.gaps + d.threads + d.stories + d.readings };
  }

  // A plain-text report the helper can copy. Only measured numbers.
  monthReport(month = this.month()) {
    const days = Object.keys(this.data.log).filter(k => k.startsWith(month + "-")).sort();
    const sum = f => days.reduce((a, k) => a + (this.data.log[k][f] || 0), 0);
    const practised = days.filter(k => this.data.log[k].activeMs > 0);
    const owned = days.reduce((a, k) => a + this.data.log[k].wordsOwned.length, 0);
    const sent = this.data.sentences.filter(s => s.on.startsWith(month));
    const lines = [
      `${this.data.name || "Practice"} — ${month}`,
      `Days practised: ${practised.length}`,
      `Active practice minutes: ${Math.round(sum("activeMs") / 60000)} (the clock stops when the app sits idle; Block Drop isn't counted)`,
      `New words owned: ${owned}`,
      `Later checks on owned words: ${sum("reviews")}`,
      `Own sentences written: ${sent.length} (reviewed by helper: ${sent.filter(s => s.review).length})`,
      `Games and readings finished: ${["puzzles", "typos", "gaps", "threads", "stories", "readings"].reduce((a, f) => a + sum(f), 0)}`,
      "",
      "Goals:"
    ];
    const goals = this.goalsFor(month);
    if (!goals.length) lines.push("  None set");
    for (const g of goals) {
      const ev = evaluateGoal(g, this.data.log, month, this.today());
      const unit = GOAL_TYPES[g.type].weekly ? `${ev.value} of ${ev.target} weeks met` : `${ev.value} of ${ev.target}`;
      lines.push(`  ${ev.title}: ${unit}${g.reachedOn ? `, reached ${g.reachedOn}` : ""}`);
      if (GOAL_TYPES[g.type].weekly) lines.push(`    ${ev.weeks.map(w => `${w.label}: ${g.type === "custom" ? (w.met ? "yes" : "-") : w.value}`).join(" | ")}`);
    }
    lines.push("", "Recorded by the Own Your Words app on this phone. Not an official record on its own.");
    return lines.join("\n");
  }

  stepsLeft(key) {
    const w = this.word(key);
    return stepsFor(w).length - this.stateOf(key).step;
  }
}

// Counts active time only: gaps longer than IDLE_MS between actions don't count.
export const IDLE_MS = 45000;
export class ActiveClock {
  constructor(onTime) { this.onTime = onTime; this.last = null; }
  touch(now) {
    if (this.last !== null) this.onTime(Math.min(now - this.last, IDLE_MS));
    this.last = now;
  }
  pause() { this.last = null; }
}
