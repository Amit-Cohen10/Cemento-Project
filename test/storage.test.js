import test from "node:test";
import assert from "node:assert/strict";

// Minimal localStorage shim. node:test runs in plain Node, so we need to
// fake the browser API before importing the module under test.
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
};

const { loadFromStorage, saveToStorage } = await import("../src/utils/storage.js");

test("saveToStorage and loadFromStorage round-trip JSON values", () => {
  store.clear();
  saveToStorage("rows", [{ id: "row-1", name: "Amit" }]);
  assert.deepEqual(loadFromStorage("rows", []), [{ id: "row-1", name: "Amit" }]);
});

test("loadFromStorage returns the fallback when nothing is stored", () => {
  store.clear();
  assert.deepEqual(loadFromStorage("missing", { value: 42 }), { value: 42 });
});

test("loadFromStorage falls back when the value is unparseable JSON", () => {
  store.clear();
  // Simulate a value that's not valid JSON (could happen across versions).
  store.set("cemento-table:bad", "not-json{");
  const original = console.warn;
  console.warn = () => {};
  try {
    assert.deepEqual(loadFromStorage("bad", "fallback"), "fallback");
  } finally {
    console.warn = original;
  }
});
