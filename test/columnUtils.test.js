import test from "node:test";
import assert from "node:assert/strict";
import {
  getVisibleColumns,
  reconcileVisibleColumnIds,
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

test("getVisibleColumns returns an empty list when nothing is visible", () => {
  assert.deepEqual(getVisibleColumns(columns, []), []);
});

test("toggleColumnId hides and shows columns but keeps one column visible", () => {
  assert.deepEqual(toggleColumnId(["active", "name"], "name"), ["active"]);

  assert.deepEqual(toggleColumnId(["active"], "active"), ["active"]);
  assert.deepEqual(toggleColumnId(["active"], "role"), ["active", "role"]);
});

test("toggleColumnId does not mutate the input array", () => {
  const original = ["active", "name"];
  const next = toggleColumnId(original, "role");

  assert.deepEqual(original, ["active", "name"]);
  assert.notEqual(next, original);
});

test("reconcileVisibleColumnIds appends schema columns added after storage", () => {
  assert.deepEqual(
    reconcileVisibleColumnIds(["name", "role"], ["id", "name", "role"]),
    ["name", "role", "id"],
  );
});

test("reconcileVisibleColumnIds removes stale ids and falls back on bad storage", () => {
  assert.deepEqual(
    reconcileVisibleColumnIds(["ghost", "name"], ["id", "name"]),
    ["name", "id"],
  );
  assert.deepEqual(reconcileVisibleColumnIds(null, ["id", "name"]), ["id", "name"]);
});
