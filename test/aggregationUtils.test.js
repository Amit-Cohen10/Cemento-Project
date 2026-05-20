import test from "node:test";
import assert from "node:assert/strict";
import { aggregateColumn } from "../src/utils/aggregationUtils.js";

test("aggregateColumn returns null when there are no numeric values", () => {
  assert.equal(aggregateColumn([], "salary"), null);

  assert.equal(
    aggregateColumn([{ salary: null }, { salary: "" }, { salary: "abc" }], "salary"),
    null,
  );
});

test("aggregateColumn computes count/sum/avg/min/max", () => {
  const rows = [
    { salary: 100 },
    { salary: 200 },
    { salary: 300 },
  ];
  const stats = aggregateColumn(rows, "salary");
  assert.deepEqual(stats, {
    count: 3,
    sum: 600,
    avg: 200,
    min: 100,
    max: 300,
  });
});

test("aggregateColumn ignores rows where the column is missing or non-numeric", () => {
  const rows = [
    { salary: 100 },
    { salary: null },
    { salary: "lots" },
    { salary: 50 },
    {  name: "Amit" },
  ];
  const stats = aggregateColumn(rows, "salary");
  assert.equal(stats.count, 2);
  assert.equal(stats.sum, 150);
  assert.equal(stats.min, 50);
  assert.equal(stats.max, 100);
});

test("aggregateColumn handles a single value", () => {
  const stats = aggregateColumn([{ salary: 42 }], "salary");
  assert.deepEqual(stats, { count: 1, sum: 42, avg: 42, min: 42, max: 42 });
});

test("aggregateColumn handles negative numbers and zero correctly", () => {
  const stats = aggregateColumn(
    [{ x: -10 }, { x: 0 }, { x: 10 }],
    "x",
  );
  assert.equal(stats.sum, 0);
  assert.equal(stats.min, -10);
  assert.equal(stats.max, 10);
  assert.equal(stats.avg, 0);
});

test("aggregateColumn rejects Infinity and NaN as data", () => {

  const stats = aggregateColumn(
    [{ x: 100 }, { x: Infinity }, { x: NaN }, { x: 50 }],
    "x",
  );
  assert.equal(stats.count, 2);
  assert.equal(stats.sum, 150);
});
