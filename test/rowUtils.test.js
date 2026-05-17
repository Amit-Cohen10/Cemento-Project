import test from "node:test";
import assert from "node:assert/strict";
import {
  applyDraftChanges,
  countDraftCells,
  getDraftCellValue,
  hasDraftCell,
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
