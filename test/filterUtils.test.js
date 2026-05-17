import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_FILTER_OPERATOR,
  FILTER_OPERATORS,
  filterRows,
} from "../src/utils/filterUtils.js";

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

test("filterRows matches case-insensitively across multiple columns (contains)", () => {
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

test("filterRows supports the 'equals' operator (full string match)", () => {
  // "front" is a substring of "Frontend" but not an exact match.
  assert.deepEqual(filterRows(rows, "front", columns, "equals"), []);
  // Whole word match works case-insensitively.
  assert.deepEqual(
    filterRows(rows, "frontend", columns, "equals").map((r) => r.id),
    ["r-1", "r-3"],
  );
});

test("filterRows supports 'startsWith' and 'endsWith'", () => {
  assert.deepEqual(
    filterRows(rows, "amit", columns, "startsWith").map((r) => r.id),
    ["r-1"],
  );

  // Both "Frontend" and "Backend" end with "end", so all three rows match.
  assert.deepEqual(
    filterRows(rows, "end", columns, "endsWith").map((r) => r.id).sort(),
    ["r-1", "r-2", "r-3"],
  );

  // Last name "Bar" -> only Noa matches when looking for names ending in "bar".
  assert.deepEqual(
    filterRows(rows, "bar", columns, "endsWith").map((r) => r.id),
    ["r-3"],
  );
});

test("FILTER_OPERATORS is the source of truth and includes the default", () => {
  const values = FILTER_OPERATORS.map((op) => op.value);
  assert.ok(values.includes(DEFAULT_FILTER_OPERATOR));
  // No duplicate operator values, otherwise the dropdown would have repeats.
  assert.equal(new Set(values).size, values.length);
});

test("unknown operator falls back to 'contains'", () => {
  // Defensive: if a future bug passes a wrong operator string, the filter
  // should still behave like the default rather than crashing or returning
  // an empty list.
  assert.deepEqual(
    filterRows(rows, "front", columns, "what-is-this").map((r) => r.id),
    ["r-1", "r-3"],
  );
});
