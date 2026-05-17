import { useEffect, useState } from "react";
import { DataTable } from "./components/DataTable/DataTable.jsx";
import { employeeColumns } from "./data/mockTableData.js";

function App() {
  const [rows, setRows] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRows() {
      try {
        const response = await fetch("/seed.json");
        if (!response.ok) {
          throw new Error(`Could not load seed data (${response.status})`);
        }
        const seedRows = await response.json();
        if (isMounted) {
          setRows(seedRows.map((row) => ({ ...row })));
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error.message);
        }
      }
    }

    loadRows();

    return () => {
      isMounted = false;
    };
  }, []);

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

      {loadError ? (
        <section className="dataTableShell tableLoadState" role="alert">
          Could not load the demo rows. {loadError}
        </section>
      ) : rows ? (
        <DataTable columns={employeeColumns} initialData={rows} />
      ) : (
        <section className="dataTableShell tableLoadState" role="status">
          Loading table data...
        </section>
      )}
    </main>
  );
}

export default App;
