// SEEDSED — app.js
// Purpose: UI WIRING for Own Your Words. Draws the screens, runs the app's own keyboard (so the phone's
//          autocorrect and suggestions can't appear), and connects store, spelling, goals, content,
//          certificate and speech through their contracts.
// Boundaries: no practice rules, scoring or storage format of its own. No login. Nothing leaves the phone.

import { STARTER } from "./words.js";
import { stepsFor, same, compareLetters, crackFeedback, gapChoices, typoSentence, checkOwnSentence, shuffle } from "./spelling.js";
import { Store, ActiveClock } from "./store.js";
import { evaluateGoal, GOAL_TYPES } from "./goals.js";
import { THREADS, STORIES, READS } from "./content.js";
import { shareCertificate, prettyDate } from "./certificate.js";
import { speak, cancelSpeech } from "./speech.js";
import { COLS, ROWS, newGame, move, rotate, tick, hardDrop, dropMs, unlockedLevel, wordsToNextLevel, MAX_LEVEL } from "./blocks.js";

const storage = (() => { try { localStorage.setItem("own-your-words/probe", "1"); return localStorage; } catch { return { getItem: () => null, setItem() {}, removeItem() {} }; } })();
const store = new Store(storage);
const clock = new ActiveClock(ms => store.addActive(ms));
const $app = document.getElementById("app");
const RATE = 0.85;

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const PRAISE = ["Nice.", "That's it.", "Solid.", "You got it.", "Good one.", "Clean."];
let praiseAt = 0;
const praise = () => PRAISE[praiseAt++ % PRAISE.length];

let screen = store.data.askedName ? "home" : "welcome";
let S = {};             // state of the current screen
let typed = "";
let wins = [];          // certificates waiting to be shown
let updateReady = null;
let note = "";

// ---------------------------------------------------------------- shared pieces
const top = (title, back = "home", label = "← Back") => `<header class="top"><button class="quiet" data-act="go" data-to="${back}">${label}</button><span class="eyebrow">${esc(title)}</span></header>`;
const hearBtn = text => `<button data-act="say" data-text="${esc(text)}">🔊 Hear it</button>`;
const sentenceHtml = gap => esc(gap).replace("___", '<span class="gap">&nbsp;</span>');
const dayCount = () => store.ownedKeys().length;

function keyboard({ doneLabel = "Check", sentence = false, marks = null } = {}) {
  const row = letters => [...letters].map(k => `<button data-key="${k}" class="${marks?.[k] ? `k-${marks[k]}` : ""}" aria-label="${k}">${k}</button>`).join("");
  return `<div class="kb" role="group" aria-label="Keyboard">
    <div>${row("qwertyuiop")}</div><div>${row("asdfghjkl")}</div>
    <div>${row("zxcvbnm")}<button class="wide" data-key="back" aria-label="Delete">⌫</button></div>
    <div>${sentence ? `<button data-key=",">,</button><button data-key="'">'</button><button class="space" data-key=" " aria-label="Space">space</button><button data-key=".">.</button><button data-key="?">?</button>` : `<button data-key="'">'</button><button class="space" data-key=" " aria-label="Space">space</button>`}<button class="go" data-act="check">${doneLabel}</button></div>
  </div>`;
}
const typedBox = long => `<div class="typed${long ? " long" : ""}" id="typed" aria-live="polite">${esc(typed)}<span class="caret"></span></div>`;
function setTyped(v) {
  typed = v;
  const el = document.getElementById("typed");
  if (el) el.innerHTML = `${esc(typed)}<span class="caret"></span>`;
}
const compareHtml = (mine, target) => `<div class="small muted">You typed</div><div class="cmp">${compareLetters(mine, target).map(x => (x.ok ? esc(x.ch) : `<span class="x">${esc(x.ch)}</span>`)).join("") || "&nbsp;"}</div><div class="small muted">The word</div><div class="cmp">${esc(target)}</div>`;

// ---------------------------------------------------------------- home
function viewWelcome() {
  return `<section class="card"><h1>Own Your Words</h1>
    <p>Spell it yourself. No autocorrect, no suggestions. Games and stories, on your phone, at your own pace.</p>
    <p class="muted small">No account and no password. Everything stays on this phone.</p>
    <form id="name-form" class="card" style="padding:0;border:0"><label for="name"><h3>What's your first name?</h3></label>
    <input id="name" class="text" maxlength="30" autocomplete="given-name" autocapitalize="words" placeholder="First name">
    <div class="row"><button class="primary" type="submit">Let's go</button><button type="button" data-act="skip-name">Skip</button></div></form></section>`;
}

function viewHome() {
  const d = store.summaryOf();
  const next = store.nextWord();
  const goals = store.goalsFor().map(g => ({ g, ev: evaluateGoal(g, store.data.log, store.month(), store.today()) }));
  return `<header class="top"><h1>${store.data.name ? `Hey, ${esc(store.data.name)}` : "Own Your Words"}</h1><button class="quiet" data-act="go" data-to="helper">Helper</button></header>
    ${updateReady ? `<div class="banner"><span>A new version is ready.</span><button data-act="update">Update now</button></div>` : ""}
    <button class="hero" data-act="lab"><span class="eyebrow" style="color:inherit">Word Lab</span><span class="big">${next ? (next.mode === "review" ? "Quick check first" : "Learn a new word") : "Today's words are done"}</span><span>${next ? "Spell it till it's yours." : "Nice work. You can still do one more."}</span></button>
    <div class="stats"><div class="stat"><b>${dayCount()}</b><span>Words I Own</span></div><div class="stat"><b>${d.minutes}</b><span>Minutes today</span></div><div class="stat"><b>${d.activities + d.wordsOwned + d.reviews + d.sentences}</b><span>Done today</span></div></div>
    <section class="games">
      <button class="game" data-act="crack"><b>Code Crack</b><span>Crack the hidden word</span></button>
      <button class="game" data-act="gaps"><b>Fill the Gap</b><span>Pick the word that fits</span></button>
      <button class="game" data-act="typo"><b>Spot the Typo</b><span>Find it and fix it</span></button>
      <button class="game" data-act="thread"><b>Text Thread</b><span>Read it, then reply</span></button>
      <button class="game" data-act="story"><b>Your Call</b><span>Stories where you decide</span></button>
      <button class="game" data-act="useit"><b>Use It</b><span>Write your own sentence</span></button>
      <button class="game" data-act="reading"><b>Read It</b><span>How-tos and your book</span></button>
      <button class="game arcade" data-act="go" data-to="arcade"><b>Block Drop</b><span>${store.data.arcade.plays} ${store.data.arcade.plays === 1 ? "play" : "plays"} · Level ${unlockedLevel(dayCount())}</span></button>
      <button class="game" data-act="go" data-to="wins"><b>My Wins</b><span>Words and certificates</span></button>
    </section>
    ${goals.length ? `<section class="card"><h3>${new Date().toLocaleDateString("en-US", { month: "long" })} goals</h3>${goals.map(({ g, ev }) => goalRow(g, ev)).join("")}</section>` : ""}
    <button data-act="finish">I'm done for today</button>`;
}

function goalRow(g, ev, index = null) {
  const pct = Math.min(100, Math.round((ev.value / ev.target) * 100));
  const wk = ev.weeks[ev.thisWeek];
  const line = g.reachedOn ? `<span class="done-tag">Reached ${prettyDate(g.reachedOn)}</span>`
    : ev.weekly ? `This week: ${g.type === "custom" ? (wk.met ? "done" : "not yet") : `${wk.value} of ${g.target}`} · ${ev.value} of ${ev.target} weeks` : `${ev.value} of ${ev.target}`;
  return `<div class="goal"><b>${esc(ev.title)}</b><div class="bar"><i style="width:${pct}%"></i></div><small>${line}</small>
    ${index !== null ? `<div class="weeks">${ev.weeks.map((w, i) => (g.type === "custom" ? `<button class="week${w.met ? " met" : ""}" data-act="check-week" data-i="${index}" data-w="${i}">${w.label}${w.met ? " ✓" : ""}</button>` : ev.weekly ? `<span class="week${w.met ? " met" : ""}">${w.label}: ${w.value}</span>` : "")).join("")}</div>` : ""}</div>`;
}

// ---------------------------------------------------------------- Word Lab
function startLab(extra = false) {
  const next = store.nextWord({ extra });
  if (!next) { S = { mode: "offdone" }; screen = "lab"; return render(); }
  const word = store.word(next.key);
  S = { mode: next.mode, word, fb: null };
  if (next.mode === "lab") store.beginWord(next.key);
  typed = "";
  screen = "lab";
  S.step = next.mode === "lab" ? stepsFor(word)[store.stateOf(next.key).step] : "review";
  if (S.step === "pick") S.options = shuffle([word.text, ...word.wrong.slice(0, 3)]);
  render();
  announce();
}

function announce() {
  const { word, step } = S;
  if (!word) return;
  if (step === "learn") speak(`${word.text}. ${word.meaning}`, { rate: RATE });
  else if (step === "pick" || step === "final" || step === "review" || step === "memory") speak(word.text, { rate: RATE });
}

function viewLab() {
  if (S.mode === "offdone") {
    return top("Word Lab") + `<section class="card stage"><h2>That's today's words.</h2><p class="muted">Your new words for today are done. Want another one?</p>
      <div class="row" style="width:100%"><button class="primary" data-act="lab-extra">One more word</button><button data-act="go" data-to="home">Done</button></div></section>`;
  }
  const { word, step, fb, mode } = S;
  const steps = stepsFor(word);
  const at = mode === "lab" ? store.stateOf(word.key).step : 0;
  const dots = mode === "lab" ? `<div class="dots" aria-label="Step ${at + 1} of ${steps.length}">${steps.map((_, i) => `<i class="${i <= at ? "on" : ""}"></i>`).join("")}</div>` : "";
  const label = { learn: "New word", copy: `Copy it (${steps.slice(0, at + 1).filter(s => s === "copy").length} of 2)`, memory: `From memory (${steps.slice(0, at + 1).filter(s => s === "memory").length} of 2)`, pick: "Which spelling is right?", final: "Last one. All you.", review: "Quick check" }[step];
  const clue = word.gap && step !== "learn" && step !== "copy" ? `<p class="sentence muted small">${sentenceHtml(word.gap)}</p>` : "";

  if (S.ownedWin) {
    return top("Word Lab") + `<section class="card stage cert-win"><p class="eyebrow">New word owned</p><div class="target">${esc(word.text)}</div><p>That's yours now. Words I Own: <b>${dayCount()}</b></p>
      <div class="row" style="width:100%"><button class="primary" data-act="useit-word">Use it in a sentence</button><button data-act="lab-next">Next</button></div></section>${winsHtml()}`;
  }
  if (step === "learn") {
    return top("Word Lab") + dots + `<section class="card stage"><p class="eyebrow">${label}</p><div class="target">${esc(word.text)}</div>
      ${word.meaning ? `<p class="meaning"><b>Means:</b> ${esc(word.meaning)}</p>` : `<p class="muted small">A word from your list.</p>`}
      ${word.gap ? `<p class="sentence">${esc(word.gap.replace("___", word.text))}</p>` : ""}
      <div class="row" style="width:100%">${hearBtn(word.text)}<button class="primary" data-act="learned">Got it</button></div></section>`;
  }
  if (step === "pick") {
    return top("Word Lab") + dots + `<section class="card stage"><p class="eyebrow">${label}</p><p>They all sound right. Only one is spelled right.</p>${clue}${hearBtn(word.text)}</section>
      ${fb ? fbHtml(fb) : `<div class="options">${S.options.map(o => `<button class="spell" data-act="pick" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`}`;
  }
  const show = step === "copy" || (fb && fb.showWord);
  return `<div class="play">${top("Word Lab")}${dots}<section class="card stage"><p class="eyebrow">${label}</p>
      ${show ? `<div class="target">${esc(word.text)}</div>` : clue}
      ${step === "memory" && !fb ? (S.hint ? `<p class="hint">${esc(S.hint)}</p>` : `<button class="quiet" data-act="hint">Give me a hint</button>`) : ""}
      ${show ? "" : hearBtn(word.text)}</section>
      ${fb ? fbHtml(fb) : `${typedBox()}${keyboard()}`}</div>`;
}

function fbHtml(fb) {
  return `<section class="fb ${fb.tone}" role="status"><h3>${esc(fb.title)}</h3>${fb.html || ""}<div class="row"><button class="primary" data-act="${fb.act || "lab-continue"}">${esc(fb.next || "Next")}</button></div></section>`;
}

function checkLab() {
  const { word, step, mode } = S;
  if (!typed.trim()) return;
  const ok = same(typed, word.text);
  const mine = typed;
  speakIf(ok);
  if (mode === "review") {
    collect(store.submitReview(word.key, ok));
    S.fb = ok ? { tone: "great", title: `${praise()} Still yours.`, next: "Next", act: "lab-next" }
      : { tone: "try", title: "Almost. Take another look.", html: compareHtml(mine, word.text), showWord: true, next: "Next", act: "lab-next" };
    return render();
  }
  S.result = ok;
  S.fb = ok ? { tone: "great", title: step === "final" ? "All you." : praise() }
    : { tone: "try", title: step === "copy" ? "Almost. Look at it again." : "Close. Here's the word. We'll go back a step.", html: compareHtml(mine, word.text), showWord: true, next: "Try again" };
  render();
}
const speakIf = ok => { if (ok) speak(PRAISE[praiseAt % PRAISE.length], { rate: 1 }); };

function labContinue() {
  const { word, result } = S;
  const r = store.submitStep(word.key, result);
  collect(r.wins);
  if (r.done) { S = { ...S, fb: null, ownedWin: true }; return render(); }
  S = { ...S, step: stepsFor(word)[r.step], fb: null, hint: "", result: null };
  typed = "";
  if (S.step === "pick") S.options = shuffle([word.text, ...word.wrong.slice(0, 3)]);
  render();
  announce();
}

function pickSpelling(v) {
  const ok = same(v, S.word.text);
  S.result = ok;
  S.fb = ok ? { tone: "great", title: `${praise()} That's the one.` }
    : { tone: "try", title: "That one sounds right, but here's the real spelling.", html: `<div class="cmp">${esc(S.word.text)}</div>`, next: "Try again" };
  render();
}

// ---------------------------------------------------------------- certificates
function collect(list) { if (list?.length) wins.push(...list); }
function winsHtml() {
  return wins.map((c, i) => `<section class="card cert-win"><p class="eyebrow">Certificate earned</p><h3>${esc(c.detail)}</h3><p class="small muted">${prettyDate(c.on)}</p>
    <div class="row"><button class="primary" data-act="cert" data-id="${esc(c.id)}">Save or print</button><button data-act="win-ok" data-i="${i}">Later</button></div></section>`).join("");
}
function certData(id) {
  const c = store.data.certs.find(x => x.id === id);
  return c && { ...c, name: store.data.name };
}

function viewWins() {
  const list = [...store.data.certs].reverse();
  return top("My Wins") + `<section class="card"><h2>${dayCount()} Words I Own</h2><p class="muted small">${store.ownedKeys().map(k => esc(store.word(k)?.text)).join(", ") || "Finish the Word Lab routine to own your first word."}</p></section>
    ${list.length ? `<section class="card"><h3>Certificates</h3><ul class="list">${list.map(c => `<li><div><b>${esc(c.detail)}</b><small>${esc(c.title)} · ${prettyDate(c.on)}</small></div><button data-act="cert" data-id="${esc(c.id)}">Save or print</button></li>`).join("")}</ul></section>`
      : `<section class="card"><p class="muted">Certificates show up here when you reach a goal or own 10 words.</p></section>`}
    ${note ? `<p class="small muted" role="status">${esc(note)}</p>` : ""}`;
}

// ---------------------------------------------------------------- games
function pool() {
  const started = store.startedWords();
  return started.length >= 6 ? started : store.allWords();
}
const pickFrom = list => list[Math.floor(Math.random() * list.length)];

// Code Crack
function startCrack() {
  const list = pool().filter(w => /^[a-z]+$/i.test(w.text) && w.text.length >= 3 && w.text.length <= 9);
  S = { word: pickFrom(list), guesses: [], marks: {}, hint: "" };
  typed = "";
  screen = "crack";
  render();
}
function viewCrack() {
  const { word, guesses, won, hint } = S;
  const n = word.text.length;
  const lines = guesses.map(g => `<div class="line">${crackFeedback(g, word.text).map(t => `<div class="tile ${t.mark}">${esc(t.ch)}</div>`).join("")}</div>`).join("");
  return `<div class="play">${top("Code Crack")}<section class="card stage"><p class="small muted">${n} letters. Green is the right spot. Gold is in the word, wrong spot. Keep going as long as you like.</p>
    <div class="grid">${lines}${won ? "" : `<div class="line">${Array.from({ length: n }, (_, i) => `<div class="tile" data-slot="${i}">${esc(typed[i] || "")}</div>`).join("")}</div>`}</div>
    ${hint ? `<p class="hint">${esc(hint)}</p>` : ""}
    ${won ? "" : `<div class="row" style="width:100%">${hearBtn(word.text)}<button data-act="crack-hint">Give me a hint</button></div>`}</section>
    ${won ? `<section class="fb great" role="status"><h3>Cracked it in ${guesses.length}.</h3><p><b>${esc(word.text)}</b>${word.meaning ? `: ${esc(word.meaning)}` : ""}</p><div class="row"><button class="primary" data-act="crack">Another one</button><button data-act="go" data-to="home">Home</button></div></section>${winsHtml()}`
      : keyboard({ marks: S.marks })}</div>`;
}
function crackKey(k) {
  if (k === "back") typed = typed.slice(0, -1);
  else if (/^[a-z]$/.test(k) && typed.length < S.word.text.length) typed += k;
  document.querySelectorAll("[data-slot]").forEach((el, i) => { el.textContent = typed[i] || ""; });
}
function crackCheck() {
  if (typed.length !== S.word.text.length) return;
  S.guesses.push(typed);
  for (const t of crackFeedback(typed, S.word.text)) {
    const rank = { no: 0, near: 1, right: 2 };
    if (!(t.ch in S.marks) || rank[t.mark] > rank[S.marks[t.ch]]) S.marks[t.ch] = t.mark;
  }
  if (same(typed, S.word.text)) { S.won = true; collect(store.bump("puzzles")); speak(praise(), { rate: 1 }); }
  typed = "";
  render();
}
function crackHint() {
  const w = S.word.text.toLowerCase();
  S.hintLevel = (S.hintLevel || 0) + 1;
  S.hint = S.hintLevel === 1 ? (S.word.meaning || `It starts with ${w[0].toUpperCase()}.`) : `It starts with ${w.slice(0, Math.min(S.hintLevel - 1, w.length - 1)).toUpperCase()}.`;
  render();
}

// Fill the Gap
function startGaps() {
  const list = pool().filter(w => w.gap);
  const word = pickFrom(list);
  S = { word, options: gapChoices(word, STARTER), picked: null, tries: 0 };
  screen = "gaps";
  render();
}
function viewGaps() {
  const { word, options, picked, right } = S;
  return top("Fill the Gap") + `<section class="card stage"><p class="eyebrow">Which word fits best?</p><p class="sentence">${right ? esc(word.gap.replace("___", word.text)) : sentenceHtml(word.gap)}</p></section>
    ${right ? `<section class="fb great" role="status"><h3>${esc(praise())}</h3><p><b>${esc(word.text)}</b>${word.meaning ? `: ${esc(word.meaning)}` : ""}</p><div class="row"><button class="primary" data-act="gaps">Next</button><button data-act="go" data-to="home">Home</button></div></section>${winsHtml()}`
      : `${picked ? `<section class="fb try" role="status"><h3>Read it with "${esc(picked)}" in the gap. Does it make sense? Try another.</h3></section>` : ""}
         <div class="options">${options.filter(o => !(S.tried || []).includes(o)).map(o => `<button data-act="gap-pick" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`}`;
}
function gapPick(v) {
  if (v === S.word.text) { S.right = true; collect(store.bump("gaps")); }
  else { S.picked = v; S.tried = [...(S.tried || []), v]; }
  render();
}

// Spot the Typo
function startTypo() {
  const list = pool().filter(w => w.gap && w.wrong?.length);
  const word = pickFrom(list);
  S = { word, t: typoSentence(word), found: false, misses: 0 };
  typed = "";
  screen = "typo";
  render();
}
function viewTypo() {
  const { t, found, fixed, word, msg } = S;
  if (fixed) return top("Spot the Typo") + `<section class="fb great" role="status"><h3>${esc(praise())} Fixed.</h3><p class="sentence">${esc(t.full)}</p>${word.meaning ? `<p><b>${esc(word.text)}:</b> ${esc(word.meaning)}</p>` : ""}<div class="row"><button class="primary" data-act="typo">Next</button><button data-act="go" data-to="home">Home</button></div></section>${winsHtml()}`;
  return `<div class="play">${top("Spot the Typo")}<section class="card stage"><p class="eyebrow">${found ? "Now spell it right" : "Tap the word that's spelled wrong"}</p>
    <div class="tap-sentence">${t.words.map((w, i) => (found ? `<span>${i === t.at ? `<s>${esc(w)}</s>` : esc(w)}</span>` : `<button data-act="typo-tap" data-i="${i}">${esc(w)}</button>`)).join("")}</div>
    ${msg ? `<p class="hint">${esc(msg)}</p>` : ""}</section>${found ? `${typedBox()}${keyboard()}` : ""}</div>`;
}
function typoTap(i) {
  if (i === S.t.at) { S.found = true; S.msg = ""; speak(S.word.text, { rate: RATE }); }
  else S.msg = "That one's fine. Look at each word again.";
  render();
}
function typoCheck() {
  if (!typed.trim()) return;
  if (same(typed, S.word.text)) { S.fixed = true; collect(store.bump("typos")); speak(praise(), { rate: 1 }); }
  else { S.misses++; S.msg = S.misses >= 2 ? `The word is "${S.word.text}". Type it in.` : "Not quite yet. Try once more."; typed = ""; }
  render();
}

// Text Thread
function startThread() {
  const open = THREADS.filter(t => !store.data.done.threads.includes(t.id));
  const thread = pickFrom(open.length ? open : THREADS);
  S = { thread, at: 0, shown: [], msg: "", misses: 0 };
  typed = "";
  screen = "thread";
  advanceThread();
}
function advanceThread() {
  const { thread } = S;
  while (S.at < thread.steps.length && thread.steps[S.at].type === "msg") S.shown.push(thread.steps[S.at++]);
  if (S.at >= thread.steps.length) {
    S.finished = true;
    if (!store.data.done.threads.includes(thread.id)) store.data.done.threads.push(thread.id);
    collect(store.bump("threads"));
  }
  render();
}
function viewThread() {
  const { thread, shown, at, msg, finished } = S;
  const cur = thread.steps[at];
  const opts = cur?.type === "choose" ? (S.opts ||= shuffle(cur.options)) : null;
  return `<div class="play">${top(thread.title)}<section class="chat">${shown.map(b => `<div class="bubble${b.from === "You" ? " me" : ""}"><small>${esc(b.from)}</small>${esc(b.text)}</div>`).join("")}</section>
    ${msg ? `<section class="fb ${S.msgTone || "try"}" role="status"><p>${esc(msg)}</p></section>` : ""}
    ${finished ? `<section class="fb great"><h3>Conversation done.</h3><div class="row"><button class="primary" data-act="thread">Another one</button><button data-act="go" data-to="home">Home</button></div></section>${winsHtml()}` : ""}
    ${cur?.type === "choose" ? `<section class="card"><b>${esc(cur.prompt)}</b><div class="options">${opts.map(o => `<button data-act="thread-pick" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div></section>` : ""}
    ${cur?.type === "typed" ? `<section class="card"><b>${esc(cur.prompt)}</b></section>${typedBox()}${keyboard({ doneLabel: "Send" })}` : ""}</div>`;
}
function threadPick(v) {
  const cur = S.thread.steps[S.at];
  if (v === cur.right) {
    S.msg = cur.why; S.msgTone = "great";
    if (cur.prompt.startsWith("Pick the best reply")) S.shown.push({ from: "You", text: v });
    S.at++; S.opts = null;
    advanceThread();
  } else { S.msg = "Read the texts again. What did they actually say?"; S.msgTone = "try"; render(); }
}
function threadCheck() {
  const cur = S.thread.steps[S.at];
  if (!typed.trim()) return;
  if (same(typed, cur.word)) {
    S.shown.push({ from: "You", text: cur.prompt.split(": ").pop().replace(/_+/, cur.word) });
    S.msg = ""; S.at++; S.misses = 0; typed = "";
    advanceThread();
  } else {
    S.misses++;
    S.msgTone = "try";
    S.msg = S.misses >= 2 ? `The word is "${cur.word}". Type it in.` : "Not quite yet. Try once more.";
    typed = "";
    render();
  }
}

// Your Call
function startStory(id) {
  if (!id) { S = {}; screen = "storypick"; return render(); }
  const story = STORIES.find(s => s.id === id);
  S = { story, nodeId: story.start, note: "" };
  screen = "story";
  render();
}
function viewStoryPick() {
  return top("Your Call") + `<p class="muted">Read each page. What you do next depends on what it says.</p>
    <div class="options">${STORIES.map(s => `<button data-act="story-open" data-id="${s.id}">${esc(s.title)}${store.data.done.stories.includes(s.id) ? " ✓" : ""}</button>`).join("")}</div>`;
}
function viewStory() {
  const { story, nodeId, noteText } = S;
  const node = story.nodes.find(n => n.id === nodeId);
  return top(story.title, "storypick") + `${noteText ? `<section class="fb try" role="status"><p>${esc(noteText)}</p></section>` : ""}
    <section class="card"><p class="sentence" style="font-weight:500">${esc(node.text)}</p><div>${hearBtn(node.text)}</div></section>
    ${node.options.length ? `<div class="options">${node.options.map((o, i) => `<button data-act="story-go" data-i="${i}">${esc(o.label)}</button>`).join("")}</div>`
      : `<section class="fb great"><h3>The End. You made the calls.</h3><div class="row"><button class="primary" data-act="story">Another story</button><button data-act="go" data-to="home">Home</button></div></section>${winsHtml()}`}`;
}
function storyGo(i) {
  const node = S.story.nodes.find(n => n.id === S.nodeId);
  const o = node.options[i];
  S.nodeId = o.to; S.noteText = o.note || "";
  const nextNode = S.story.nodes.find(n => n.id === o.to);
  if (!nextNode.options.length) {
    if (!store.data.done.stories.includes(S.story.id)) store.data.done.stories.push(S.story.id);
    collect(store.bump("stories"));
  }
  render();
  window.scrollTo(0, 0);
}

// Use It: his own sentence
function startUseIt(key) {
  const owned = store.ownedKeys();
  const started = store.startedWords().map(w => w.key);
  const usable = owned.length ? owned : started;
  const w = key ? store.word(key) : store.word(pickFrom(usable.length ? usable : [store.allWords()[0].key]));
  S = { word: w, msg: "", fromLab: !!key };
  typed = "";
  screen = "useit";
  render();
  speak(w.text, { rate: RATE });
}
function viewUseIt() {
  const { word, msg, saved, fromLab } = S;
  const nextBtn = fromLab ? `<button class="primary" data-act="lab-next">Next word</button>` : `<button class="primary" data-act="useit">Another word</button>`;
  if (saved) return top("Use It") + `<section class="fb great" role="status"><h3>Saved.</h3><p class="sentence">${esc(saved)}</p><p class="small">Your helper can read it with you.</p><div class="row">${nextBtn}<button data-act="go" data-to="home">Home</button></div></section>${winsHtml()}`;
  return `<div class="play">${top("Use It")}<section class="card"><p class="eyebrow">Write your own sentence with</p><div class="target">${esc(word.text)}</div>
    ${word.meaning ? `<p class="small"><b>Means:</b> ${esc(word.meaning)}</p>` : ""}${msg ? `<p class="hint">${esc(msg)}</p>` : ""}</section>
    ${typedBox(true)}${keyboard({ doneLabel: "Save", sentence: true })}</div>`;
}
function useItCheck() {
  const r = checkOwnSentence(typed, S.word.text);
  if (!r.hasWord) { S.msg = `Your sentence needs the word "${S.word.text}", spelled just like that.`; return render(); }
  if (!r.ok) { S.msg = "Add a few more words so it's a whole sentence."; return render(); }
  collect(store.addSentence(S.word.key, typed.trim()));
  S.saved = typed.trim();
  typed = "";
  render();
}

// My Reading: helper's passage and questions
function startReading(id) {
  if (!id) { S = {}; screen = "readpick"; return render(); }
  S = { r: [...store.data.readings, ...READS].find(x => x.id === id), q: -1, msg: "" };
  screen = "reading";
  render();
}
function viewReadPick() {
  return top("Read It") + `<p class="muted">Read it, then answer. Everything you need is in the reading.</p><div class="options">${[...store.data.readings, ...READS].map(r => `<button data-act="read-open" data-id="${r.id}">${esc(r.title)}${store.data.done.readings.includes(r.id) ? " ✓" : ""}</button>`).join("")}</div>`;
}
function viewReading() {
  const { r, q, msg } = S;
  const cur = r.questions[q];
  const done = q >= r.questions.length;
  return top(r.title, "readpick") + `<section class="card"><p style="white-space:pre-wrap">${esc(r.text)}</p><div>${hearBtn(r.text)}</div></section>
    ${msg ? `<section class="fb try" role="status"><p>${esc(msg)}</p></section>` : ""}
    ${q < 0 ? `<button class="primary" data-act="read-next">${r.questions.length ? "I read it. Ask me." : "I read it."}</button>` : ""}
    ${cur ? `<section class="card"><b>${esc(cur.q)}</b><div class="options">${(S.opts ||= shuffle([cur.right, ...cur.others])).map(o => `<button data-act="read-pick" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div></section>` : ""}
    ${done ? `<section class="fb great"><h3>Reading done.</h3><div class="row"><button class="primary" data-act="go" data-to="home">Home</button></div></section>${winsHtml()}` : ""}`;
}
function readNext() {
  S.q++; S.msg = ""; S.opts = null;
  if (S.q >= S.r.questions.length) {
    if (!store.data.done.readings.includes(S.r.id)) store.data.done.readings.push(S.r.id);
    collect(store.bump("readings"));
  }
  render();
}

// Block Drop: the reward. Plays come from lessons; levels come from Words I Own. Not counted as practice.
const BLOCK_COLORS = ["", "#2F9E8F", "#E0A526", "#7A6FD0", "#D9674E", "#4C8FD6", "#6FAF4A", "#C25A9E"];
let blockTimer = null;
function stopBlocks() { clearInterval(blockTimer); blockTimer = null; }

function viewArcade() {
  const owned = dayCount(), top_ = unlockedLevel(owned), { plays, best } = store.data.arcade;
  const next = wordsToNextLevel(owned);
  const levels = Array.from({ length: top_ }, (_, i) => i + 1);
  return top("Block Drop") + `<section class="card stage"><h2>${plays ? `${plays} ${plays === 1 ? "play" : "plays"} ready` : "No plays yet"}</h2>
      <p class="muted small">Every finished word, game, reading or sentence earns 1 play. Best score: ${best}.</p>
      ${top_ < MAX_LEVEL ? `<p class="hint">Own ${next} more ${next === 1 ? "word" : "words"} to unlock Level ${top_ + 1}</p>` : ""}</section>
    ${plays ? `<p class="eyebrow">Pick a level</p><div class="games">${levels.map(l => `<button class="game" data-act="block-start" data-l="${l}"><b>Level ${l}</b></button>`).join("")}</div>`
      : `<button class="primary" data-act="lab">Earn a play in the Word Lab</button>`}
    ${note ? `<p class="small muted" role="status">${esc(note)}</p>` : ""}`;
}
function startBlocks(level) {
  if (!store.usePlay()) return go("arcade");
  S = { game: newGame(level) };
  screen = "blocks";
  render();
  runBlocks();
}
function runBlocks() {
  stopBlocks();
  blockTimer = setInterval(() => { tick(S.game); drawBlocks(); }, dropMs(S.game.level));
}
function viewBlocks() {
  return `<div class="play"><header class="top"><button class="quiet" data-act="block-quit">✕ Quit</button><span class="eyebrow">Level ${S.game.level} · <span id="block-score">${S.game.score}</span></span></header>
    <canvas id="blocks" class="board" width="${COLS * 24}" height="${ROWS * 24}" aria-label="Block Drop game board"></canvas>
    <div id="block-end"></div>
    <div class="pad"><button data-block="left" aria-label="Left">◀</button><button data-block="rotate" aria-label="Turn">⟳</button><button data-block="right" aria-label="Right">▶</button><button data-block="drop" aria-label="Drop">▼</button></div></div>`;
}
function drawBlocks() {
  const c = document.getElementById("blocks"), g = S.game;
  if (!c || !g) return;
  const x = c.getContext("2d"), z = 24;
  x.fillStyle = "#111A18"; x.fillRect(0, 0, c.width, c.height);
  const cell = (cx, cy, v) => { x.fillStyle = BLOCK_COLORS[v]; x.fillRect(cx * z + 1, cy * z + 1, z - 2, z - 2); };
  g.board.forEach((row, r) => row.forEach((v, q) => { if (v) cell(q, r, v); }));
  if (!g.over) g.piece.shape.forEach((row, r) => row.forEach((on, q) => { if (on) cell(g.piece.x + q, g.piece.y + r, g.piece.color); }));
  document.getElementById("block-score").textContent = g.score;
  if (g.over && !S.ended) endBlocks();
}
function endBlocks() {
  S.ended = true;
  stopBlocks();
  const best = store.recordScore(S.game.score);
  document.getElementById("block-end").innerHTML = `<section class="fb great" role="status"><h3>${best ? "New best!" : "Good game."} ${S.game.score} points, ${S.game.lines} ${S.game.lines === 1 ? "row" : "rows"}.</h3><div class="row"><button class="primary" data-act="go" data-to="arcade">Done</button></div></section>`;
}

// ---------------------------------------------------------------- end of the day
function viewSummary() {
  const d = store.summaryOf();
  const list = [["Minutes of practice", d.minutes], ["New words owned", d.wordsOwned], ["Quick checks", d.reviews], ["Puzzles cracked", d.puzzles], ["Gaps filled", d.gaps], ["Typos fixed", d.typos], ["Conversations", d.threads], ["Stories", d.stories], ["Readings", d.readings], ["Own sentences", d.sentences]].filter(([, v]) => v > 0);
  return `<section class="card stage"><p class="eyebrow">${prettyDate(store.today())}</p><h1>${store.data.name ? `Nice work, ${esc(store.data.name)}.` : "Nice work."}</h1></section>
    <section class="card">${list.length ? `<ul class="list">${list.map(([k, v]) => `<li><div>${esc(k)}</div><b>${v}</b></li>`).join("")}</ul>` : `<p class="muted">Nothing logged yet today. That's okay. Come back when you're ready.</p>`}</section>
    <p class="small muted">Time only counts while you're actively using the app.</p>
    ${winsHtml()}
    <div class="row"><button class="primary" data-act="go" data-to="home">Home</button><button data-act="copy-day">Copy for my helper</button></div>
    ${note ? `<p class="small muted" role="status">${esc(note)}</p>` : ""}`;
}

// ---------------------------------------------------------------- helper
function viewHelper() {
  const pending = store.data.sentences.filter(s => !s.review).length;
  const row = (to, title, sub) => `<button class="game" data-act="go" data-to="${to}"><b>${esc(title)}</b><span>${esc(sub)}</span></button>`;
  return top("Helper") + `<section class="games">
      ${row("h-goals", "Monthly goals", `${store.goalsFor().length} of 3 set`)}
      ${row("h-report", "Month report", "Time, counts and goals")}
      ${row("h-words", "His word list", `${store.data.mine.length} added`)}
      ${row("h-sentences", "His sentences", pending ? `${pending} to look at` : "All looked at")}
      ${row("h-readings", "Book readings", `${store.data.readings.length} added`)}
      ${row("h-settings", "Settings", "Name, level, words a day")}
    </section><p class="small muted">Everything here stays on this phone. If the app is deleted, it's gone, so save reports and certificates somewhere else.</p>`;
}

function viewGoals() {
  const goals = store.goalsFor();
  const editors = goals.map((g, i) => {
    const ev = evaluateGoal(g, store.data.log, store.month(), store.today());
    return `<section class="card">${goalRow(g, ev, i)}<button class="quiet" data-act="goal-del" data-i="${i}">Remove</button></section>`;
  }).join("");
  return top("Monthly goals", "helper") + editors + (goals.length < 3 ? `<section class="card"><h3>Add goal ${goals.length + 1} of 3</h3>
    <form id="goal-form" class="goal"><label class="small" for="g-type">Type</label><select id="g-type" class="text">${Object.entries(GOAL_TYPES).map(([k, t]) => `<option value="${k}">${esc(t.label)}</option>`).join("")}</select>
    <label class="small" for="g-target">How many (or leave empty for "something else")</label><input id="g-target" class="text" inputmode="numeric" placeholder="e.g. 3">
    <label class="small" for="g-text">In your words (only for "something else")</label><input id="g-text" class="text" maxlength="60" placeholder="e.g. Cook a meal each week">
    <button class="primary" type="submit">Add goal</button>${note ? `<p class="small" role="status">${esc(note)}</p>` : ""}</form></section>` : "") +
    `<p class="small muted">Weekly goals are reached after ${3} weeks are met. Each week's effort still shows, even if the number wasn't hit.</p>`;
}

function viewReport() {
  return top("Month report", "helper") + `<section class="card"><pre class="report" id="report">${esc(store.monthReport())}</pre><div class="row"><button class="primary" data-act="copy-report">Copy</button></div>${note ? `<p class="small" role="status">${esc(note)}</p>` : ""}</section>`;
}

function viewWords() {
  const rows = store.data.mine.map(w => `<li><div><b>${esc(w.text)}</b><small>${w.meaning ? esc(w.meaning) : "No meaning added"}${w.wrong.length < 2 ? " · skips the spelling choice" : ` · ${esc(w.wrong.join(", "))}`}</small></div><button class="quiet" data-act="word-del" data-k="${esc(w.key)}">Remove</button></li>`).join("");
  return top("His word list", "helper") + `<section class="card"><form id="word-form" class="goal"><h3>Add a word</h3>
      <p class="small muted">From his spelling list, or words he leaves to autocorrect. These come first in the Word Lab.</p>
      <label class="small" for="w-text">Word</label><input id="w-text" class="text" maxlength="40" autocapitalize="none" autocomplete="off" placeholder="e.g. pharmacy">
      <label class="small" for="w-mean">What it means, in plain words</label><input id="w-mean" class="text" maxlength="120" placeholder="e.g. Where you pick up medicine.">
      <label class="small" for="w-gap">A sentence using it</label><input id="w-gap" class="text" maxlength="120" placeholder="e.g. I stopped at the pharmacy after work.">
      <button class="primary" type="submit">Add word</button>${note ? `<p class="small" role="status">${esc(note)}</p>` : ""}</form></section>
    ${rows ? `<section class="card"><ul class="list">${rows}</ul></section>` : ""}`;
}

function viewSentences() {
  const list = [...store.data.sentences].reverse();
  return top("His sentences", "helper") + `<p class="small muted">The app only checks that the word is there and spelled right. Whether it's used well is for you two to talk about.</p>
    ${list.length ? `<section class="card"><ul class="list">${list.map(s => `<li><div><b>${esc(s.text)}</b><small>Word: ${esc(s.word)} · ${prettyDate(s.on)}${s.review ? ` · ${s.review === "good" ? "Used well" : "Talked about it"}` : ""}</small></div>
      ${s.review ? "" : `<span class="row"><button data-act="sent" data-id="${s.id}" data-v="good">Used well</button><button data-act="sent" data-id="${s.id}" data-v="talk">Talk about it</button></span>`}</li>`).join("")}</ul></section>` : `<section class="card"><p class="muted">Nothing yet. They show up here after he plays Use It.</p></section>`}`;
}

function viewReadings() {
  const rows = store.data.readings.map(r => `<li><div><b>${esc(r.title)}</b><small>${r.questions.length} ${r.questions.length === 1 ? "question" : "questions"}</small></div><button class="quiet" data-act="read-del" data-id="${r.id}">Remove</button></li>`).join("");
  return top("Book readings", "helper") + `<section class="card"><form id="read-form" class="goal"><h3>Add a reading</h3>
      <label class="small" for="r-title">Title</label><input id="r-title" class="text" maxlength="60" placeholder="e.g. Chapter 3">
      <label class="small" for="r-text">The passage</label><textarea id="r-text" class="text" maxlength="4000"></textarea>
      <p class="small muted">Questions, one per line: question | right answer | wrong answer | wrong answer</p>
      <textarea id="r-q" class="text" maxlength="2000" placeholder="Where did Sam go? | The lake | The store | Work"></textarea>
      <button class="primary" type="submit">Add reading</button>${note ? `<p class="small" role="status">${esc(note)}</p>` : ""}</form></section>
    ${rows ? `<section class="card"><ul class="list">${rows}</ul></section>` : ""}`;
}

function viewSettings() {
  const d = store.data;
  const seg = (key, opts) => `<div class="row">${opts.map(([v, l]) => `<button data-act="set" data-key="${key}" data-v="${v}" class="${d[key] === v ? "primary" : ""}">${l}</button>`).join("")}</div>`;
  return top("Settings", "helper") + `<section class="card"><form id="name-form" class="goal"><label for="name"><h3>Name on certificates</h3></label><input id="name" class="text" maxlength="30" value="${esc(d.name)}" placeholder="First name"><button type="submit">Save name</button></form>
    <h3>Starting word level</h3>${seg("level", [[1, "Everyday"], [2, "Common"], [3, "Harder"]])}
    <h3>New words a day</h3>${seg("perDay", [[2, "2"], [3, "3"], [5, "5"]])}
    ${note ? `<p class="small" role="status">${esc(note)}</p>` : ""}</section>`;
}

// ---------------------------------------------------------------- render + events
const VIEWS = { welcome: viewWelcome, home: viewHome, lab: viewLab, crack: viewCrack, gaps: viewGaps, typo: viewTypo, thread: viewThread, storypick: viewStoryPick, story: viewStory,
  arcade: viewArcade, blocks: viewBlocks, useit: viewUseIt, readpick: viewReadPick, reading: viewReading, summary: viewSummary, wins: viewWins, helper: viewHelper, "h-goals": viewGoals, "h-report": viewReport,
  "h-words": viewWords, "h-sentences": viewSentences, "h-readings": viewReadings, "h-settings": viewSettings };
function render() { $app.innerHTML = (VIEWS[screen] || viewHome)(); if (screen === "blocks") drawBlocks(); }
function go(to) { cancelSpeech(); stopBlocks(); screen = to; note = ""; S = {}; typed = ""; render(); window.scrollTo(0, 0); }

async function copy(text) {
  try { await navigator.clipboard.writeText(text); note = "Copied."; } catch { note = "Couldn't copy automatically. Press and hold the text to copy it."; }
  render();
}

function onKey(k) {
  cancelSpeech();
  if (screen === "crack") return crackKey(k);
  if (k === "back") return setTyped(typed.slice(0, -1));
  setTyped(typed + k);
}
function onCheck() {
  if (screen === "lab") return checkLab();
  if (screen === "crack") return crackCheck();
  if (screen === "typo") return typoCheck();
  if (screen === "thread") return threadCheck();
  if (screen === "useit") return useItCheck();
}

$app.addEventListener("click", async e => {
  if (screen === "blocks" || screen === "arcade") clock.pause(); else clock.touch(Date.now()); // the reward game isn't practice
  const blockBtn = e.target.closest("[data-block]");
  if (blockBtn && S.game) {
    const g = S.game, k = blockBtn.dataset.block;
    if (k === "left") move(g, -1); else if (k === "right") move(g, 1); else if (k === "rotate") rotate(g); else hardDrop(g);
    return drawBlocks();
  }
  const key = e.target.closest("[data-key]");
  if (key) return onKey(key.dataset.key);
  const b = e.target.closest("[data-act]");
  if (!b || b.disabled) return;
  const a = b.dataset.act, v = b.dataset;
  switch (a) {
    case "go": return go(v.to);
    case "say": return speak(v.text, { rate: RATE });
    case "check": return onCheck();
    case "lab": return startLab();
    case "lab-extra": return startLab(true);
    case "lab-next": wins = []; return startLab();
    case "learned": S.result = true; return labContinue();
    case "lab-continue": return labContinue();
    case "hint": S.hint = `It starts with "${S.word.text[0]}" and has ${S.word.text.length} letters.`; return render();
    case "pick": return pickSpelling(v.v);
    case "useit-word": return startUseIt(S.word.key);
    case "useit": return startUseIt();
    case "crack": return startCrack();
    case "crack-hint": return crackHint();
    case "gaps": return startGaps();
    case "gap-pick": return gapPick(v.v);
    case "typo": return startTypo();
    case "typo-tap": return typoTap(+v.i);
    case "thread": return startThread();
    case "thread-pick": return threadPick(v.v);
    case "story": return startStory();
    case "story-open": return startStory(v.id);
    case "story-go": return storyGo(+v.i);
    case "reading": return startReading();
    case "read-open": return startReading(v.id);
    case "read-next": return readNext();
    case "read-pick": { const cur = S.r.questions[S.q]; if (v.v === cur.right) return readNext(); S.msg = "Look back at the reading. Where does it say that?"; return render(); }
    case "finish": screen = "summary"; S = {}; note = ""; render(); window.scrollTo(0, 0); return speak(store.data.name ? `Nice work, ${store.data.name}.` : "Nice work.", { rate: RATE });
    case "copy-day": { const d = store.summaryOf(); return copy(`${store.data.name || "Practice"} — ${store.today()}: active minutes: ${d.minutes}, ${d.wordsOwned} new words owned, ${d.reviews} quick checks, ${d.activities} games and readings, ${d.sentences} own sentences.`); }
    case "copy-report": return copy(store.monthReport());
    case "cert": { try { const r = await shareCertificate(certData(v.id)); note = r === "downloaded" ? "Saved to your downloads. You can print it from there." : ""; } catch (err) { note = `Couldn't make the certificate: ${err.message}`; } if (screen === "wins") render(); return; }
    case "win-ok": wins.splice(+v.i, 1); return render();
    case "skip-name": store.data.askedName = true; store.save(); return go("home");
    case "check-week": collect(store.toggleCheck(+v.i, +v.w)); return render();
    case "goal-del": store.setGoal(+v.i, null); return render();
    case "word-del": store.removeMine(v.k); return render();
    case "sent": store.reviewSentence(v.id, v.v); return render();
    case "read-del": store.removeReading(v.id); return render();
    case "set": store.data[v.key] = +v.v; store.save(); return render();
    case "block-start": return startBlocks(+v.l);
    case "block-quit": if (!S.ended) store.recordScore(S.game.score); return go("arcade");
    case "update": updateReady?.postMessage("skip-waiting"); return;
  }
});

$app.addEventListener("submit", e => {
  e.preventDefault();
  clock.touch(Date.now());
  const val = id => document.getElementById(id).value;
  const id = e.target.id;
  if (id === "name-form") {
    const first = screen === "welcome";
    store.data.name = val("name").replace(/\s+/g, " ").trim().slice(0, 30);
    store.data.askedName = true;
    store.save();
    if (first) { go("home"); if (store.data.name) speak(`Hey, ${store.data.name}.`, { rate: RATE }); } else { note = "Saved."; render(); }
  } else if (id === "word-form") {
    const r = store.addMine(val("w-text"), val("w-mean"), val("w-gap"));
    note = r.error || `Added "${r.item.text}".${r.item.meaning ? "" : " Add a meaning when you can, so he learns what it means."}`;
    render();
  } else if (id === "goal-form") {
    const type = val("g-type"), target = parseInt(val("g-target"), 10), text = val("g-text").trim();
    if (type === "custom" ? !text : !(target > 0)) { note = type === "custom" ? "Type the goal in your own words." : "Put in a number."; return render(); }
    store.setGoal(store.goalsFor().length, type === "custom" ? { type, text } : { type, target });
    note = "";
    render();
  } else if (id === "read-form") {
    const text = val("r-text").trim();
    if (!text) { note = "Paste or type the passage."; return render(); }
    const questions = val("r-q").split("\n").map(l => l.split("|").map(x => x.trim())).filter(p => p.length >= 3 && p.every(Boolean)).map(([q, right, ...others]) => ({ q, right, others }));
    store.addReading(val("r-title"), text, questions);
    note = `Added, with ${questions.length} ${questions.length === 1 ? "question" : "questions"}.`;
    render();
  }
});

$app.addEventListener("change", () => clock.touch(Date.now()));
$app.addEventListener("input", () => clock.touch(Date.now()));

// A real keyboard works too, for testing on a computer.
document.addEventListener("keydown", e => {
  if (screen === "blocks" && S.game) {
    const g = S.game, k = { ArrowLeft: () => move(g, -1), ArrowRight: () => move(g, 1), ArrowUp: () => rotate(g), ArrowDown: () => hardDrop(g) }[e.key];
    if (k) { e.preventDefault(); k(); drawBlocks(); }
    return;
  }
  if (e.target.matches?.("input, textarea, select") || !document.querySelector(".kb")) return;
  clock.touch(Date.now());
  if (e.key === "Enter") { e.preventDefault(); return onCheck(); }
  if (e.key === "Backspace") { e.preventDefault(); return onKey("back"); }
  if (e.key.length === 1 && /[a-z ,.?']/i.test(e.key)) { e.preventDefault(); onKey(e.key.toLowerCase()); }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { clock.pause(); cancelSpeech(); stopBlocks(); }
  else if (screen === "blocks" && S.game && !S.ended) runBlocks();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").then(reg => {
    const watch = w => w && w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) { updateReady = w; if (screen === "home") render(); } });
    if (reg.waiting && navigator.serviceWorker.controller) { updateReady = reg.waiting; if (screen === "home") render(); }
    reg.addEventListener("updatefound", () => watch(reg.installing));
  }).catch(e => console.warn("Offline support unavailable:", e));
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (updateReady && !reloaded) { reloaded = true; location.reload(); } });
}

render();
