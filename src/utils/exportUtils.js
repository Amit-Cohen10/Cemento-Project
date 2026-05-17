/*
 * Small helper that turns the current table rows into a downloadable JSON
 * file. The user clicks "Export data" -> a JSON file lands in their
 * Downloads folder -> they drop it into src/data/seed.json and commit.
 *
 * I keep this separate from the React component so it's easy to test
 * (well, easy to test in a real test environment -- it touches the DOM,
 * so it's outside the node:test scope).
 */

export function exportRowsAsJson(rows, filename = "seed.json") {
  const json = JSON.stringify(rows, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  // Create a temporary <a> with a download attribute and click it.
  // This is the standard "save file from browser" pattern.
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Free the blob URL once the browser has had a chance to start the
  // download. setTimeout(0) is enough -- we just need to be outside the
  // current call stack.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
