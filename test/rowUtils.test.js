import test from "node:test";
import assert from "node:assert/strict";
import {
  applyDraftChanges,
  commitPendingChanges,
  countDraftCells,
  getNextNumericRowId,
  getDraftCellValue,
  hasDraftCell,
  mergePendingRows,
  normalizeRowsToUniqueNumericIds,
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

  assert.equal(rows[0].ticketsClosed, 10);
});

test("applyDraftChanges keeps the same reference for rows without drafts", () => {
  const rows = [
    { id: "row-1", name: "Amit" },
    { id: "row-2", name: "Maya" },
  ];
  const next = applyDraftChanges(rows, { "row-1": { name: "Noa" } });

  assert.equal(next[1], rows[1]);
});

test("normalizeRowsToUniqueNumericIds migrates display ids to numeric strings", () => {
  const rows = [
    { id: "employee-7", name: "Amit" },
    { id: "002", name: "Maya" },
    { id: "employee-7", name: "Noa" },
    { id: "custom", name: "Dana" },
  ];

  const next = normalizeRowsToUniqueNumericIds(rows);

  assert.deepEqual(next.map((row) => row.id), ["7", "2", "1", "3"]);
  assert.equal(typeof next[0].id, "string");
});

test("normalizeRowsToUniqueNumericIds preserves row references when ids already fit", () => {
  const rows = [{ id: "1", name: "Amit" }, { id: "2", name: "Maya" }];
  const next = normalizeRowsToUniqueNumericIds(rows);

  assert.equal(next[0], rows[0]);
  assert.equal(next[1], rows[1]);
});

test("getNextNumericRowId returns the next id after the highest current id", () => {
  assert.equal(
    getNextNumericRowId([{ id: "1" }, { id: "9" }, { id: "employee-12" }]),
    "13",
  );
  assert.equal(getNextNumericRowId([]), "1");
});

test("mergePendingRows returns the committed array unchanged when nothing is pending", () => {
  const committed = [{ id: "1" }, { id: "2" }];

  assert.equal(mergePendingRows(committed, [], new Set()), committed);
});

test("mergePendingRows places pending new rows on top and filters deletions out", () => {
  const committed = [{ id: "1" }, { id: "2" }, { id: "3" }];
  const newRows = [{ id: "tmp-1" }];
  const deletedIds = new Set(["2"]);

  const merged = mergePendingRows(committed, newRows, deletedIds);
  assert.deepEqual(merged.map((row) => row.id), ["tmp-1", "1", "3"]);
});

test("commitPendingChanges applies deletions, additions and draft cells in order", () => {
  const committed = [
    { id: "1", name: "Amit", salary: 100 },
    { id: "2", name: "Maya", salary: 95 },
    { id: "3", name: "Noa", salary: 80 },
  ];
  const drafts = { "1": { salary: 130 } };
  const newRows = [{ id: "tmp-1", name: "Lior", salary: 70 }];
  const deletedIds = new Set(["2"]);

  const result = commitPendingChanges(committed, drafts, newRows, deletedIds);

  assert.deepEqual(
    result.map((row) => ({ id: row.id, salary: row.salary })),
    [
      { id: "tmp-1", salary: 70 },
      { id: "1", salary: 130 },
      { id: "3", salary: 80 },
    ],
  );
});

test("commitPendingChanges with no pending changes mirrors applyDraftChanges", () => {
  const committed = [{ id: "1", name: "Amit" }];
  const drafts = { "1": { name: "Noa" } };
  const result = commitPendingChanges(committed, drafts, [], new Set());
  assert.equal(result[0].name, "Noa");
});
