// SEEDSED — tests for Use It after the Word Lab. A real bug on 2026-11-07: after owning "tent" he wrote two sentences,
// and the Saved screen offered only "Another word" and "Home", so he never got back to the Word Lab's next word.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../app/js/app.js", import.meta.url), "utf8");

test("a sentence started from the Word Lab remembers where it came from", () => {
  assert.match(app, /function startUseIt\(key\) \{[\s\S]*?S = \{ word: w, msg: "", fromLab: !!key \};/);
});

test("after saving a Word Lab sentence, the main button goes on to the next word", () => {
  const view = app.match(/function viewUseIt\(\) \{[\s\S]*?\n\}/)[0];
  assert.match(view, /fromLab \? `<button class="primary" data-act="lab-next">Next word<\/button>`/);
});
