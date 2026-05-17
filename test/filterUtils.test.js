import test from "node:test";
import assert from "node:assert/strict";
import {
  ANY_COLUMN,
  DEFAULT_FILTER_OPERATOR,
  FILTER_OPERATORS,
  OPERATOR_LABELS,
  applyFilters,
  filterRows,
  operatorsForType,
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

// ---------------------------------------------------------------------------
// Per-column filter panel: applyFilters + operatorsForType
// ---------------------------------------------------------------------------

const employeeColumns = [
  { id: "name", type: "string", title: "Name" },
  { id: "team", type: "select", title: "Team", options: ["Backend", "Frontend"] },
  { id: "salary", type: "number", title: "Salary" },
  { id: "active", type: "boolean", title: "Active" },
  { id: "joinedAt", type: "date", title: "Joined" },
];

const employees = [
  {
    id: "e-1",
    name: "Amit Cohen",
    team: "Backend",
    salary: 120000,
    active: true,
    joinedAt: "2022-04-10T00:00:00.000Z",
  },
  {
    id: "e-2",
    name: "Maya Levi",
    team: "Frontend",
    salary: 95000,
    active: true,
    joinedAt: "2023-09-01T00:00:00.000Z",
  },
  {
    id: "e-3",
    name: "Noa Bar",
    team: "Backend",
    salary: 150000,
    active: false,
    joinedAt: "2021-01-20T00:00:00.000Z",
  },
];

test("operatorsForType returns the right list per column type", () => {
  assert.deepEqual(operatorsForType("number"), ["equals", "greaterThan", "lessThan"]);
  assert.deepEqual(operatorsForType("boolean"), ["equals"]);
  assert.deepEqual(operatorsForType("date"), ["equals", "before", "after"]);
  // Unknown types fall back to the string operators rather than crashing.
  assert.ok(operatorsForType("nope").includes("contains"));
});

test("OPERATOR_LABELS covers every operator the type map can produce", () => {
  const allOperators = new Set();
  ["string", "select", "number", "boolean", "date"].forEach((type) =>
    operatorsForType(type).forEach((op) => allOperators.add(op)),
  );
  for (const op of allOperators) {
    assert.ok(OPERATOR_LABELS[op], `missing label for operator '${op}'`);
  }
});

test("applyFilters returns the same array reference when no filters are set", () => {
  assert.equal(applyFilters(employees, [], employeeColumns), employees);
  assert.equal(applyFilters(employees, undefined, employeeColumns), employees);
});

test("applyFilters skips filters that have no value yet (still being built)", () => {
  // A filter row the user just added but hasn't typed in yet shouldn't
  // wipe the whole table.
  const filters = [
    { id: "f1", columnId: "team", operator: "equals", value: "" },
  ];
  assert.equal(applyFilters(employees, filters, employeeColumns).length, 3);
});

test("applyFilters: select equals", () => {
  const filters = [{ id: "f1", columnId: "team", operator: "equals", value: "Backend" }];
  assert.deepEqual(
    applyFilters(employees, filters, employeeColumns).map((r) => r.id),
    ["e-1", "e-3"],
  );
});

test("applyFilters: number greaterThan and lessThan", () => {
  assert.deepEqual(
    applyFilters(
      employees,
      [{ id: "f1", columnId: "salary", operator: "greaterThan", value: 100000 }],
      employeeColumns,
    ).map((r) => r.id),
    ["e-1", "e-3"],
  );
  assert.deepEqual(
    applyFilters(
      employees,
      [{ id: "f1", columnId: "salary", operator: "lessThan", value: 100000 }],
      employeeColumns,
    ).map((r) => r.id),
    ["e-2"],
  );
});

test("applyFilters: boolean equals", () => {
  assert.deepEqual(
    applyFilters(
      employees,
      [{ id: "f1", columnId: "active", operator: "equals", value: "false" }],
      employeeColumns,
    ).map((r) => r.id),
    ["e-3"],
  );
});

test("applyFilters: date before / after compares chronologically", () => {
  const beforeCutoff = applyFilters(
    employees,
    [{ id: "f1", columnId: "joinedAt", operator: "before", value: "2022-01-01" }],
    employeeColumns,
  );
  assert.deepEqual(beforeCutoff.map((r) => r.id), ["e-3"]);

  const afterCutoff = applyFilters(
    employees,
    [{ id: "f1", columnId: "joinedAt", operator: "after", value: "2022-12-31" }],
    employeeColumns,
  );
  assert.deepEqual(afterCutoff.map((r) => r.id), ["e-2"]);
});

test("applyFilters combines multiple filters with AND", () => {
  const filters = [
    { id: "f1", columnId: "team", operator: "equals", value: "Backend" },
    { id: "f2", columnId: "salary", operator: "greaterThan", value: 130000 },
  ];
  assert.deepEqual(
    applyFilters(employees, filters, employeeColumns).map((r) => r.id),
    ["e-3"],
  );
});

test("applyFilters: 'Any column' filter matches across every column", () => {
  const filters = [{ id: "f1", columnId: ANY_COLUMN, operator: "contains", value: "amit" }];
  assert.deepEqual(
    applyFilters(employees, filters, employeeColumns).map((r) => r.id),
    ["e-1"],
  );
});

test("applyFilters ignores a filter pointing at a deleted column", () => {
  const filters = [
    { id: "f1", columnId: "ghost-column", operator: "equals", value: "x" },
  ];
  // No matching column should be treated as a no-op, not as "match none".
  assert.equal(applyFilters(employees, filters, employeeColumns).length, employees.length);
});
