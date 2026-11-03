// SEEDSED — tests for the offline updater. A real bug on 2026-11-02: an update saved stale files.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const sw = readFileSync(new URL("../app/sw.js", import.meta.url), "utf8");
const shell = JSON.parse(sw.match(/const SHELL = (\[[\s\S]*?\]);/)[1]);

test("the updater always fetches fresh files, never the browser's short-term copies", () => {
  assert.match(sw, /new Request\(u, \{ cache: "reload" \}\)/);
  assert.ok(!/c\.addAll\(SHELL\)/.test(sw));
});

test("every app file is saved for offline use", () => {
  for (const f of readdirSync(new URL("../app/js/", import.meta.url))) assert.ok(shell.includes(`js/${f}`), `js/${f} is missing from sw.js`);
  for (const f of readdirSync(new URL("../app/icons/", import.meta.url))) assert.ok(shell.includes(`icons/${f}`), `icons/${f} is missing from sw.js`);
  for (const f of ["index.html", "manifest.webmanifest", "css/app.css"]) assert.ok(shell.includes(f), f);
});

test("a waiting update shows its banner without having to change screens", () => {
  const app = readFileSync(new URL("../app/js/app.js", import.meta.url), "utf8");
  assert.match(app, /reg\.waiting && navigator\.serviceWorker\.controller\) \{ updateReady = reg\.waiting; if \(screen === "home"\) render\(\); \}/);
});
