import test from "node:test";
import assert from "node:assert/strict";
import {
  HISTORY_LIMIT,
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  redo,
  undo,
} from "../src/utils/historyUtils.js";

test("createHistory starts empty", () => {
  const h = createHistory();
  assert.deepEqual(h, { past: [], future: [] });
  assert.equal(canUndo(h), false);
  assert.equal(canRedo(h), false);
});

test("pushHistory captures the current value and clears the future", () => {
  let h = createHistory();
  // Pretend the future has a redo entry that was set earlier.
  h = { past: [], future: ["redoable"] };

  h = pushHistory(h, "v1");

  assert.deepEqual(h.past, ["v1"]);
  // Any new edit invalidates the redo branch.
  assert.deepEqual(h.future, []);
});

test("undo pops the latest snapshot and stashes the current value in future", () => {
  let h = createHistory();
  h = pushHistory(h, "v1");
  h = pushHistory(h, "v2");

  const result = undo(h, "v3");
  assert.equal(result.value, "v2");
  assert.deepEqual(result.history.past, ["v1"]);
  assert.deepEqual(result.history.future, ["v3"]);
});

test("undo returns null when there is nothing to undo", () => {
  assert.equal(undo(createHistory(), "current"), null);
});

test("redo replays the latest future snapshot", () => {
  // History after an undo: past=[v1], future=[v3], current=v2.
  const h = { past: ["v1"], future: ["v3"] };
  const result = redo(h, "v2");
  assert.equal(result.value, "v3");
  assert.deepEqual(result.history.past, ["v1", "v2"]);
  assert.deepEqual(result.history.future, []);
});

test("redo returns null when there is nothing to redo", () => {
  assert.equal(redo(createHistory(), "current"), null);
});

test("pushHistory caps the past at HISTORY_LIMIT", () => {
  let h = createHistory();
  // Push HISTORY_LIMIT + 5 entries.
  for (let i = 0; i < HISTORY_LIMIT + 5; i += 1) {
    h = pushHistory(h, i);
  }
  assert.equal(h.past.length, HISTORY_LIMIT);
  // The very oldest entries are dropped first.
  assert.equal(h.past[0], 5);
  assert.equal(h.past[h.past.length - 1], HISTORY_LIMIT + 4);
});
