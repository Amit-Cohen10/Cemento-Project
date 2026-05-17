import test from "node:test";
import assert from "node:assert/strict";
import {
  formatCellValue,
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

test("normalizeOptions supports strings and object options", () => {
  assert.deepEqual(normalizeOptions(["A", { label: "Option B", value: "B" }]), [
    { label: "A", value: "A" },
    { label: "Option B", value: "B" },
  ]);
});

test("formatCellValue renders readable values", () => {
  assert.equal(formatCellValue({ type: "boolean" }, true), "Yes");
  assert.equal(formatCellValue({ type: "boolean" }, false), "No");
  assert.equal(formatCellValue({ type: "number" }, 1200), "1,200");
  assert.equal(formatCellValue({ type: "string" }, ""), "Not set");
});
