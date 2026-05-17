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
  assert.equal(columns[0].id, "name");
});

test("getVisibleColumns filters while preserving schema order", () => {
  const visible = getVisibleColumns(columns, ["role", "active"]);

  assert.deepEqual(
    visible.map((column) => column.id),
    ["active", "role"],
  );
});

test("toggleColumnId hides and shows columns but keeps one column visible", () => {
  assert.deepEqual(toggleColumnId(["active", "name"], "name"), ["active"]);
  assert.deepEqual(toggleColumnId(["active"], "active"), ["active"]);
  assert.deepEqual(toggleColumnId(["active"], "role"), ["active", "role"]);
});
