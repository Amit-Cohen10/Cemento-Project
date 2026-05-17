import test from "node:test";
import assert from "node:assert/strict";
import { cycleSortDirection, sortRows } from "../src/utils/sortUtils.js";

test("cycleSortDirection cycles asc -> desc -> off and resets on column change", () => {
  assert.deepEqual(cycleSortDirection(null, "name"), {
    columnId: "name",
    direction: "asc",
  });
  assert.deepEqual(
    cycleSortDirection({ columnId: "name", direction: "asc" }, "name"),
    { columnId: "name", direction: "desc" },
  );
  assert.equal(
    cycleSortDirection({ columnId: "name", direction: "desc" }, "name"),
    null,
  );
  // Switching to a different column always starts at asc.
  assert.deepEqual(
    cycleSortDirection({ columnId: "name", direction: "desc" }, "role"),
    { columnId: "role", direction: "asc" },
  );
});

test("sortRows returns the same array when no sort state is given", () => {
  const rows = [{ id: "r-1", name: "B" }, { id: "r-2", name: "A" }];
  assert.equal(sortRows(rows, null, { type: "string" }), rows);
});

test("sortRows sorts strings ascending and descending", () => {
  const rows = [
    { id: "r-1", name: "Maya" },
    { id: "r-2", name: "Amit" },
    { id: "r-3", name: "Daniel" },
  ];
  const asc = sortRows(rows, { columnId: "name", direction: "asc" }, { type: "string" });
  const desc = sortRows(rows, { columnId: "name", direction: "desc" }, { type: "string" });

  assert.deepEqual(asc.map((r) => r.name), ["Amit", "Daniel", "Maya"]);
  assert.deepEqual(desc.map((r) => r.name), ["Maya", "Daniel", "Amit"]);
});

test("sortRows sorts numbers with empty cells going last (asc)", () => {
  const rows = [
    { id: "r-1", salary: 90000 },
    { id: "r-2", salary: null },
    { id: "r-3", salary: 60000 },
  ];
  const asc = sortRows(rows, { columnId: "salary", direction: "asc" }, { type: "number" });
  assert.deepEqual(asc.map((r) => r.salary), [60000, 90000, null]);
});

test("sortRows keeps empty numeric cells last when descending too", () => {
  const rows = [
    { id: "r-1", salary: 90000 },
    { id: "r-2", salary: null },
    { id: "r-3", salary: 60000 },
  ];
  const desc = sortRows(rows, { columnId: "salary", direction: "desc" }, { type: "number" });
  assert.deepEqual(desc.map((r) => r.salary), [90000, 60000, null]);
});

test("sortRows sorts booleans (false before true asc) and dates by ISO", () => {
  const bools = [
    { id: "r-1", active: true },
    { id: "r-2", active: false },
    { id: "r-3", active: true },
  ];
  const asc = sortRows(bools, { columnId: "active", direction: "asc" }, { type: "boolean" });
  assert.deepEqual(asc.map((r) => r.active), [false, true, true]);

  const dates = [
    { id: "r-1", joinedAt: "2023-01-01T00:00:00.000Z" },
    { id: "r-2", joinedAt: "2021-06-15T00:00:00.000Z" },
    { id: "r-3", joinedAt: "2024-12-31T00:00:00.000Z" },
  ];
  const desc = sortRows(dates, { columnId: "joinedAt", direction: "desc" }, { type: "date" });
  assert.deepEqual(desc.map((r) => r.joinedAt.slice(0, 4)), ["2024", "2023", "2021"]);
});

test("sortRows does not mutate the input array", () => {
  const rows = [{ id: "r-1", name: "B" }, { id: "r-2", name: "A" }];
  const original = [...rows];
  sortRows(rows, { columnId: "name", direction: "asc" }, { type: "string" });
  assert.deepEqual(rows, original);
});
