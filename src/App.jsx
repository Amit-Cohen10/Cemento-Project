// this is the root component of the app — the outermost wrapper.
// it loads the row data from a JSON file on the server, then passes it to DataTable.
// it also shows a loading message while the data is being fetched,
// and an error message if the fetch fails.
// it talks to: DataTable (passes the rows and column schema to it),
//              mockTableData (imports the column definitions),
//              rowUtils (normalizes row ids so they are unique numbers).

import { useEffect, useState } from "react";
import { DataTable } from "./components/DataTable/DataTable.jsx";
import { employeeColumns } from "./data/mockTableData.js";
import {
  getNextNumericRowId,
  normalizeRowsToUniqueNumericIds,
} from "./utils/rowUtils.js";

function App() {
  // rows starts as null (not loaded yet). once the fetch finishes it becomes an array.
  const [rows, setRows] = useState(null);
  // if something goes wrong during loading, we store the error message here.
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    // isMounted prevents a state update if the component is removed from the page
    // before the fetch finishes. without this, React would warn about a memory leak.
    let isMounted = true;

    async function loadRows() {
      try {
        // fetch the demo rows from public/seed.json.
        // this file is not bundled into the app — the browser downloads it separately.
        const response = await fetch("/seed.json");
        if (!response.ok) {
          throw new Error(`Could not load seed data (${response.status})`);
        }
        const seedRows = await response.json();
        if (isMounted) {
          // make sure every row has a unique numeric string id before storing.
          setRows(normalizeRowsToUniqueNumericIds(seedRows));
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error.message);
        }
      }
    }

    loadRows();

    // cleanup: if the component unmounts while the fetch is in flight, stop it
    // from trying to update state that no longer exists.
    return () => {
      isMounted = false;
    };
  }, []); // the empty array means this effect runs once, right after the first render.

  return (
    <main className="appShell">
      {/* Logo lives in its own white card so it stays readable on the
          off-white page background. The file sits in /public so Vite
          serves it from the root URL. */}
      <div className="brandBar">
        <div className="logoCard">
          <img
            src="/cemento-logo.png"
            alt="Cemento Technologies"
            className="brandLogo"
          />
        </div>
        <div className="brandText">
          <p className="eyebrow">Client Side Assignment</p>
          <h1>Reusable React Data Table</h1>
        </div>
      </div>

      {/* show the right thing depending on the load state:
          - error  -> show an error message
          - rows ready -> show the table
          - still loading -> show "Loading..." */}
      {loadError ? (
        <section className="dataTableShell tableLoadState" role="alert">
          Could not load the demo rows. {loadError}
        </section>
      ) : rows ? (
        <DataTable
          columns={employeeColumns}
          initialData={rows}
          createRowId={getNextNumericRowId}
          normalizeRows={normalizeRowsToUniqueNumericIds}
        />
      ) : (
        <section className="dataTableShell tableLoadState" role="status">
          Loading table data...
        </section>
      )}
    </main>
  );
}

export default App;
