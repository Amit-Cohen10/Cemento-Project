import test from "node:test";
import assert from "node:assert/strict";
import { filterRows } from "../src/utils/filterUtils.js";

const columns = [
  { id: "name", type: "string" },
  { id: "role", type: "select" },
  { id: "active", type: "boolean" },
];

const rows = [
  { id: "r-1", name: "Amit Cohen", role: "Frontend", active: true },
  { id: "r-2", name: "Maya Levi", role: "Backend", active: false },
  { id: "r-3", name: "Noa Bar", role: "Frontend", active: true },
];

test("filterRows returns all rows when the query is empty or whitespace", () => {
  assert.equal(filterRows(rows, "", columns), rows);
  assert.equal(filterRows(rows, "   ", columns), rows);
  assert.equal(filterRows(rows, undefined, columns), rows);
});

test("filterRows matches case-insensitively across multiple columns", () => {
  const result = filterRows(rows, "front", columns);
  assert.equal(result.length, 2);
  assert.deepEqual(result.map((r) => r.id), ["r-1", "r-3"]);
});

test("filterRows can match on values from any visible column", () => {
  // "noa" only matches the name column on row r-3.
  assert.deepEqual(
    filterRows(rows, "noa", columns).map((r) => r.id),
    ["r-3"],
  );
});

test("filterRows ignores hidden columns (only the columns passed in)", () => {
  // role is not in the visible columns, so a query that only matches role
  // values should return zero rows.
  const visible = [{ id: "name", type: "string" }];
  assert.deepEqual(filterRows(rows, "backend", visible), []);
});

test("filterRows handles null cells without crashing", () => {
  const rowsWithGap = [
    { id: "r-empty", name: null, role: null, active: null },
    ...rows,
  ];
  // The null row doesn't match, the function must not throw on it.
  assert.deepEqual(
    filterRows(rowsWithGap, "amit", columns).map((r) => r.id),
    ["r-1"],
  );
});
