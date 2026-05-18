// triggers a JSON file download in the browser.
// the user clicks "Export data" in the toolbar and gets a seed.json file
// containing the current (filtered) rows, which they can commit back to the repo.
//
// this is kept as a plain function outside React so it is easy to test
// and can be reused if we ever need to export from another place.

export function exportRowsAsJson(rows, filename = "seed.json") {
  // convert the rows array to a nicely indented JSON string.
  const json = JSON.stringify(rows, null, 2);

  // wrap the string in a Blob so the browser treats it as a downloadable file.
  const blob = new Blob([json], { type: "application/json" });

  // createObjectURL gives us a temporary URL that points to the blob in memory.
  const url = URL.createObjectURL(blob);

  // the standard browser download trick: create a hidden <a> tag, click it,
  // then remove it. the "download" attribute tells the browser to save the file
  // instead of navigating to the URL.
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // free the blob URL from memory after a short delay.
  // setTimeout(0) puts it after the current call stack so the browser
  // has time to start the download before we release the URL.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
