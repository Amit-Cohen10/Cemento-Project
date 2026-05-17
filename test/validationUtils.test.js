import test from "node:test";
import assert from "node:assert/strict";
import {
  collectInvalidCells,
  validateCell,
} from "../src/utils/validationUtils.js";

test("validateCell returns null for columns without rules", () => {
  assert.equal(validateCell({ type: "string" }, "anything"), null);
  assert.equal(validateCell({ type: "string" }, ""), null);
});

test("validateCell flags missing values when required: true", () => {
  const column = { id: "name", type: "string", required: true };
  assert.equal(validateCell(column, ""), "Required");
  assert.equal(validateCell(column, null), "Required");
  assert.equal(validateCell(column, undefined), "Required");
  // A typed value passes.
  assert.equal(validateCell(column, "Amit"), null);
});

test("validateCell enforces min on number columns", () => {
  const column = { id: "salary", type: "number", min: 0 };
  assert.match(validateCell(column, -1), /≥ 0/);
  assert.equal(validateCell(column, 0), null);
  assert.equal(validateCell(column, 1000), null);
});

test("validateCell enforces max on number columns", () => {
  const column = { id: "salary", type: "number", max: 100 };
  assert.match(validateCell(column, 101), /≤ 100/);
  assert.equal(validateCell(column, 100), null);
});

test("validateCell rejects non-numeric values on number columns", () => {
  assert.equal(validateCell({ type: "number" }, "abc"), "Must be a number");
});

test("validateCell does not flag empty optional number columns", () => {
  // An empty number cell should only be flagged if it's required.
  assert.equal(validateCell({ type: "number", min: 0 }, null), null);
  assert.equal(validateCell({ type: "number", min: 0 }, ""), null);
});

test("collectInvalidCells walks rows + drafts and reports each error", () => {
  const columns = [
    { id: "name", type: "string", required: true },
    { id: "salary", type: "number", min: 0 },
  ];
  const rows = [
    { id: "r-1", name: "Amit", salary: 100 },
    { id: "r-2", name: "", salary: -5 }, // both invalid
    { id: "r-3", name: "Maya", salary: 200 },
  ];

  const errors = collectInvalidCells(rows, columns, {});
  assert.equal(errors.length, 2);
  assert.deepEqual(errors[0], { rowId: "r-2", columnId: "name", error: "Required" });
  assert.match(errors[1].error, /≥ 0/);
});

test("collectInvalidCells uses the draft value when one exists", () => {
  const columns = [{ id: "name", type: "string", required: true }];
  const rows = [{ id: "r-1", name: "Amit" }];
  // The user has typed an empty string -- this should now show as invalid
  // even though the SAVED value was fine.
  const drafts = { "r-1": { name: "" } };

  const errors = collectInvalidCells(rows, columns, drafts);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].error, "Required");
});
