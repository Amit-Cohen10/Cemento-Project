import test from "node:test";
import assert from "node:assert/strict";
import {
  applyDraftChanges,
  countDraftCells,
  getDraftCellValue,
  hasDraftCell,
  removeDraftCell,
  setDraftCell,
  updateRowCell,
} from "../src/utils/rowUtils.js";

test("updateRowCell updates one row without mutating the original data", () => {
  const rows = [
    { id: "row-1", name: "Amit", active: true },
    { id: "row-2", name: "Maya", active: false },
  ];

  const nextRows = updateRowCell(rows, "row-1", "name", "Daniel");

  assert.equal(nextRows[0].name, "Daniel");
  assert.equal(rows[0].name, "Amit");
  // Same reference for the untouched row keeps React.memo happy.
  assert.notEqual(nextRows, rows);
  assert.equal(nextRows[1], rows[1]);
});

test("draft helpers track, read, and count dirty cells", () => {
  const row = { id: "row-1", name: "Amit" };
  const draft = setDraftCell({}, "row-1", "name", "Noa", row.name);

  assert.equal(hasDraftCell(draft, "row-1", "name"), true);
  assert.equal(getDraftCellValue(row, draft, "name"), "Noa");
  assert.equal(countDraftCells(draft), 1);
});

test("setDraftCell drops the draft when the new value matches the saved value", () => {
  // Without this, the unsaved indicator would stay on even after the user
  // typed the original value back into the cell.
  const draft = setDraftCell({}, "row-1", "name", "Amit", "Amit");
  assert.equal(hasDraftCell(draft, "row-1", "name"), false);
  assert.equal(countDraftCells(draft), 0);
});

test("getDraftCellValue falls back to the saved row when there's no draft", () => {
  const row = { id: "row-1", name: "Amit" };
  assert.equal(getDraftCellValue(row, {}, "name"), "Amit");
});

test("removeDraftCell cleans up the row entry once it's empty", () => {
  let draft = setDraftCell({}, "row-1", "name", "Noa", "Amit");
  draft = setDraftCell(draft, "row-1", "active", false, true);
  assert.equal(countDraftCells(draft), 2);

  draft = removeDraftCell(draft, "row-1", "name");
  assert.equal(countDraftCells(draft), 1);
  assert.ok(draft["row-1"], "row entry should still exist while one cell is dirty");

  draft = removeDraftCell(draft, "row-1", "active");
  assert.equal(countDraftCells(draft), 0);
  assert.equal(draft["row-1"], undefined);
});

test("removeDraftCell is a no-op on rows that aren't dirty", () => {
  const draft = { "row-1": { name: "Noa" } };
  // Same reference means React won't waste a render.
  assert.equal(removeDraftCell(draft, "row-2", "name"), draft);
});

test("countDraftCells counts across multiple rows", () => {
  const draft = {
    "row-1": { name: "Noa", active: false },
    "row-2": { team: "Growth" },
  };
  assert.equal(countDraftCells(draft), 3);
});

test("applyDraftChanges saves all draft cells locally", () => {
  const rows = [
    { id: "row-1", name: "Amit", ticketsClosed: 10 },
    { id: "row-2", name: "Maya", ticketsClosed: 20 },
  ];
  const draftChanges = {
    "row-1": { ticketsClosed: 14 },
    "row-2": { name: "Dana" },
  };

  const nextRows = applyDraftChanges(rows, draftChanges);

  assert.deepEqual(nextRows, [
    { id: "row-1", name: "Amit", ticketsClosed: 14 },
    { id: "row-2", name: "Dana", ticketsClosed: 20 },
  ]);
  // Original rows still intact.
  assert.equal(rows[0].ticketsClosed, 10);
});

test("applyDraftChanges keeps the same reference for rows without drafts", () => {
  const rows = [
    { id: "row-1", name: "Amit" },
    { id: "row-2", name: "Maya" },
  ];
  const next = applyDraftChanges(rows, { "row-1": { name: "Noa" } });
  // row-2 didn't change, so the reference should be preserved.
  assert.equal(next[1], rows[1]);
});
