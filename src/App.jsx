import { useMemo } from "react";
import { DataTable } from "./components/DataTable/DataTable.jsx";
import { employeeColumns, createEmployeeRows } from "./data/mockTableData.js";

function App() {
  // useMemo so the rows array keeps the same reference between renders.
  // DataTable resets its draft edits when initialData changes, so an unstable
  // reference here would wipe the user's unsaved changes every render.
  const rows = useMemo(() => createEmployeeRows(2500), []);

  return (
    <main className="appShell">
      <header className="appHeader">
        <div>
          <p className="eyebrow">Client Side Assignment</p>
          <h1>Reusable React Data Table</h1>
        </div>
        <div className="headerBadge">JavaScript + React</div>
      </header>

      <DataTable columns={employeeColumns} initialData={rows} />
    </main>
  );
}

export default App;
