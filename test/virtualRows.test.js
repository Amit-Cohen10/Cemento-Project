import test from "node:test";
import assert from "node:assert/strict";
import { getVirtualRange } from "../src/utils/virtualRows.js";

test("getVirtualRange renders only the visible window plus overscan", () => {
  const result = getVirtualRange({
    rowCount: 1000,
    rowHeight: 50,
    viewportHeight: 200,
    scrollTop: 500,
    overscan: 2,
  });

  assert.equal(result.startIndex, 8);
  assert.equal(result.endIndex, 16);
  assert.equal(result.paddingTop, 400);
  assert.equal(result.paddingBottom, 49150);
  assert.deepEqual(result.indexes, [8, 9, 10, 11, 12, 13, 14, 15, 16]);
});

test("getVirtualRange handles empty data", () => {
  const result = getVirtualRange({
    rowCount: 0,
    rowHeight: 50,
    viewportHeight: 200,
    scrollTop: 0,
  });

  assert.deepEqual(result.indexes, []);
  assert.equal(result.totalHeight, 0);
});
