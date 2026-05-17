import test from "node:test";
import assert from "node:assert/strict";
import {
  getVisibleColumns,
  sortColumns,
  toggleColumnId,
} from "../src/utils/columnUtils.js";

const columns = [
  { id: "name", ordinalNo: 2, title: "Name", type: "string" },
  { id: "active", ordinalNo: 1, title: "Active", type: "boolean" },
  { id: "role", ordinalNo: 3, title: "Role", type: "select" },
];

test("sortColumns uses ordinalNo without mutating the input", () => {
  const sorted = sortColumns(columns);

  assert.deepEqual(
    sorted.map((column) => column.id),
    ["active", "name", "role"],
  );
  // Original array must be untouched, otherwise other components reading it
  // would silently see a reordered schema.
  assert.equal(columns[0].id, "name");
});

test("getVisibleColumns filters while preserving schema order", () => {
  const visible = getVisibleColumns(columns, ["role", "active"]);

  // Order comes from ordinalNo, not from the order of visibleColumnIds.
  assert.deepEqual(
    visible.map((column) => column.id),
    ["active", "role"],
  );
});

test("getVisibleColumns returns an empty list when nothing is visible", () => {
  assert.deepEqual(getVisibleColumns(columns, []), []);
});

test("toggleColumnId hides and shows columns but keeps one column visible", () => {
  assert.deepEqual(toggleColumnId(["active", "name"], "name"), ["active"]);
  // Trying to hide the last column is a no-op so the table never goes blank.
  assert.deepEqual(toggleColumnId(["active"], "active"), ["active"]);
  assert.deepEqual(toggleColumnId(["active"], "role"), ["active", "role"]);
});

test("toggleColumnId does not mutate the input array", () => {
  const original = ["active", "name"];
  const next = toggleColumnId(original, "role");

  assert.deepEqual(original, ["active", "name"]);
  assert.notEqual(next, original);
});
