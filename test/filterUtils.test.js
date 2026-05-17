import test from "node:test";
import assert from "node:assert/strict";
import {
  ANY_COLUMN,
  OPERATOR_LABELS,
  applyFilters,
  operatorsForType,
} from "../src/utils/filterUtils.js";

// ---------------------------------------------------------------------------
// operatorsForType + OPERATOR_LABELS sanity checks
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// applyFilters
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

test("applyFilters: string contains and starts/ends with", () => {
  assert.deepEqual(
    applyFilters(
      employees,
      [{ id: "f1", columnId: "name", operator: "contains", value: "cohen" }],
      employeeColumns,
    ).map((r) => r.id),
    ["e-1"],
  );

  assert.deepEqual(
    applyFilters(
      employees,
      [{ id: "f1", columnId: "name", operator: "startsWith", value: "noa" }],
      employeeColumns,
    ).map((r) => r.id),
    ["e-3"],
  );

  assert.deepEqual(
    applyFilters(
      employees,
      [{ id: "f1", columnId: "name", operator: "endsWith", value: "bar" }],
      employeeColumns,
    ).map((r) => r.id),
    ["e-3"],
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

test("applyFilters: boolean equals rejects non-yes/no query values", () => {
  // Defensive: "amit" is not true/false so the filter shouldn't match
  // every No row by coercing it to false.
  assert.deepEqual(
    applyFilters(
      employees,
      [{ id: "f1", columnId: "active", operator: "equals", value: "amit" }],
      employeeColumns,
    ),
    [],
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

test("applyFilters: null cells don't crash and don't match string filters", () => {
  const rowsWithGap = [
    { id: "e-null", name: null, team: null, salary: null, active: null, joinedAt: null },
    ...employees,
  ];
  const filters = [
    { id: "f1", columnId: "name", operator: "contains", value: "amit" },
  ];
  assert.deepEqual(
    applyFilters(rowsWithGap, filters, employeeColumns).map((r) => r.id),
    ["e-1"],
  );
});
