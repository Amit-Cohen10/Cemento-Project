import { useMemo } from "react";
import { DataTable } from "./components/DataTable/DataTable.jsx";
import { employeeColumns, createEmployeeRows } from "./data/mockTableData.js";

function App() {
  // useMemo so the rows array keeps the same reference between renders.
  // DataTable resets its draft edits when initialData changes, so an unstable
  // reference here would wipe the user's unsaved changes every render.
  const rows = useMemo(() => createEmployeeRows(), []);

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

      <DataTable columns={employeeColumns} initialData={rows} />
    </main>
  );
}

export default App;
