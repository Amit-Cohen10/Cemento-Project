import test from "node:test";
import assert from "node:assert/strict";
import {
  formatCellValue,
  getColumnAlignment,
  normalizeOptions,
  parseCellValue,
} from "../src/utils/cellValueUtils.js";

test("parseCellValue keeps each supported type correct", () => {
  assert.equal(parseCellValue({ type: "string" }, 123), "123");
  assert.equal(parseCellValue({ type: "number" }, "42"), 42);
  assert.equal(parseCellValue({ type: "number" }, ""), null);
  assert.equal(parseCellValue({ type: "boolean" }, "true"), true);
  assert.equal(parseCellValue({ type: "boolean" }, false), false);
  assert.equal(
    parseCellValue({ type: "select", options: ["Junior", "Senior"] }, "Senior"),
    "Senior",
  );
});

test("parseCellValue returns null for invalid numbers and treats falsy bool inputs as false", () => {
  // "abc" is not a finite number, so we save null rather than NaN.
  assert.equal(parseCellValue({ type: "number" }, "abc"), null);
  // Empty / null / undefined all collapse to a clean null for numbers.
  assert.equal(parseCellValue({ type: "number" }, null), null);
  assert.equal(parseCellValue({ type: "number" }, undefined), null);
  // Boolean parsing only converts well-known truthy strings.
  assert.equal(parseCellValue({ type: "boolean" }, "false"), false);
  assert.equal(parseCellValue({ type: "boolean" }, "on"), true);
  assert.equal(parseCellValue({ type: "boolean" }, 1), true);
});

test("parseCellValue handles select options provided as objects", () => {
  const column = {
    type: "select",
    options: [
      { label: "Junior", value: "JR" },
      { label: "Senior", value: "SR" },
    ],
  };
  // The <option value> in the DOM is always a string, so we compare loosely.
  assert.equal(parseCellValue(column, "SR"), "SR");
});

test("normalizeOptions supports strings and object options", () => {
  assert.deepEqual(normalizeOptions(["A", { label: "Option B", value: "B" }]), [
    { label: "A", value: "A" },
    { label: "Option B", value: "B" },
  ]);
});

test("normalizeOptions defaults missing label to the value", () => {
  assert.deepEqual(normalizeOptions([{ value: 7 }]), [{ label: "7", value: 7 }]);
});

test("formatCellValue renders readable values", () => {
  assert.equal(formatCellValue({ type: "boolean" }, true), "Yes");
  assert.equal(formatCellValue({ type: "boolean" }, false), "No");
  assert.equal(formatCellValue({ type: "number" }, 1200), "1,200");
  assert.equal(formatCellValue({ type: "string" }, ""), "Not set");
});

test("formatCellValue formats currency numbers and falls back nicely", () => {
  assert.equal(formatCellValue({ type: "number", format: "currency" }, 1500), "$1,500");
  // Unknown select value just shows the raw value as text.
  assert.equal(
    formatCellValue({ type: "select", options: ["A", "B"] }, "Z"),
    "Z",
  );
  assert.equal(formatCellValue({ type: "string" }, null), "Not set");
});

test("getColumnAlignment picks a sensible default per type", () => {
  assert.equal(getColumnAlignment({ type: "number" }), "right");
  assert.equal(getColumnAlignment({ type: "boolean" }), "center");
  assert.equal(getColumnAlignment({ type: "string" }), "left");
  assert.equal(getColumnAlignment({ type: "select" }), "left");
});
