import { useMemo } from "react";
import { DataTable } from "./components/DataTable/DataTable.jsx";
import { employeeColumns, createEmployeeRows } from "./data/mockTableData.js";

function App() {
  // The rows are generated once so the table receives a stable data set.
  // This matters because the table keeps its own local editing state.
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
