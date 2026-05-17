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

test("getVirtualRange starts at index 0 when scrolled to the top", () => {
  const result = getVirtualRange({
    rowCount: 100,
    rowHeight: 50,
    viewportHeight: 200,
    scrollTop: 0,
    overscan: 0,
  });

  assert.equal(result.startIndex, 0);
  assert.equal(result.paddingTop, 0);
  assert.deepEqual(result.indexes, [0, 1, 2, 3, 4]);
});

test("getVirtualRange clamps the end index when scrolled past the last row", () => {
  // The user scrolled to the bottom of a 10-row list. The last visible index
  // must not exceed rowCount - 1 even with overscan added.
  const result = getVirtualRange({
    rowCount: 10,
    rowHeight: 50,
    viewportHeight: 200,
    scrollTop: 5000,
    overscan: 5,
  });

  assert.equal(result.endIndex, 9);
  assert.equal(result.paddingBottom, 0);
});

test("getVirtualRange survives a negative scrollTop", () => {
  // Some browsers fire negative scrollTop during rubber-band scrolling.
  const result = getVirtualRange({
    rowCount: 50,
    rowHeight: 40,
    viewportHeight: 200,
    scrollTop: -120,
    overscan: 1,
  });

  assert.equal(result.startIndex, 0);
  assert.ok(result.indexes.length > 0);
});

test("getVirtualRange returns the right totalHeight regardless of scroll", () => {
  const result = getVirtualRange({
    rowCount: 1000,
    rowHeight: 50,
    viewportHeight: 200,
    scrollTop: 12345,
    overscan: 3,
  });

  // totalHeight is what the parent uses to make the scroll bar feel correct.
  assert.equal(result.totalHeight, 50000);
});
