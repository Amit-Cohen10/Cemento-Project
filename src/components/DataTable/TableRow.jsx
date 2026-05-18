// this component renders a single row in the table.
//
// on the website: each row is a horizontal strip of cells.
//   - on the LEFT: a checkbox to select/deselect this specific row
//   - in the MIDDLE: one cell per visible column (rendered by EditableCell)
//   - on the RIGHT: a × button to delete this row
//
// visual states:
//   even/odd rows → alternate background colors (light grey / white) for easier reading
//   isSelected    → blue tint across the full row when the checkbox is ticked
//   isPendingNew  → green tint for rows that have been added with "+ Add row"
//                   but not saved yet (they will disappear if the user clicks Cancel)
//
// clicking a cell opens it for editing (handled by EditableCell).
// clicking the checkbox selects the row (handled here — stopPropagation prevents
// the click from reaching the cell behind the checkbox and opening an editor).
// clicking the × button marks the row for deletion (it disappears after Save is clicked).
//
// it talks to: DataTable (which creates it), EditableCell (one per column in this row).

// memo means React skips re-rendering this row if none of its props changed.
// this is critical for performance: the table may have hundreds of rows on screen.
// without memo, typing one character in any cell would re-render EVERY row.
// with memo, only the one row that changed gets re-rendered.
import { memo } from "react";
import { EditableCell } from "./EditableCell.jsx";

export const TableRow = memo(function TableRow({
  row,            // the row's data object, e.g. { id: "r1", name: "Amit", salary: 90000, ... }
  rowIndex,       // 0-based position in the visible list — used to alternate row colors
  columns,        // the visible column definitions for this row
  rowHeight,      // fixed height in pixels — used by the virtualizer to reserve space
  editingCell,    // { rowId, columnId } of the cell currently open for editing, or null
  isSelected,     // true when this row's checkbox is ticked
  isPendingNew,   // true when this row was added with "+ Add row" and not yet saved
  getCellValue,   // function(row, columnId) → the current value (draft if dirty, stored otherwise)
  isCellDirty,    // function(rowId, columnId) → true if this cell has an unsaved draft
  getCellError,   // function(row, column) → error message string or null
  onStartEdit,    // called with (rowId, columnId) to open an editor
  onStopEdit,     // called to close the editor and keep the new value
  onCancelEdit,   // called with (rowId, columnId) to discard the edit
  onChange,       // called with (rowId, columnId, newValue) when the user types/picks a value
  onDeleteRow,    // called with rowId when the × button is clicked
  onToggleSelect, // called with rowId when the checkbox is clicked
}) {
  // called when the × delete button is clicked.
  // stopPropagation prevents the click from reaching the row/cell, which would otherwise
  // open an editor for the cell behind the delete button.
  const handleDeleteClick = (event) => {
    event.stopPropagation();
    onDeleteRow(row.id); // marks this row as pending-deleted (hidden immediately, removed on Save)
  };

  // called when the row's checkbox is clicked.
  // stopPropagation prevents the click from reaching the cell behind the checkbox,
  // which would otherwise open a cell editor.
  const handleCheckboxChange = (event) => {
    event.stopPropagation();
    onToggleSelect(row.id); // adds or removes this row from the selected set
  };

  // prevents any click on the checkbox cell area from bubbling up to a cell editor.
  const stopClick = (event) => event.stopPropagation();

  return (
    <tr
      // alternate background color: evenRow = light grey, oddRow = white.
      // isSelected adds a blue tint when the checkbox is ticked.
      // isPendingNew adds a green tint for newly added rows not yet saved.
      className={`${rowIndex % 2 === 0 ? "evenRow" : "oddRow"}${isSelected ? " isSelected" : ""}${isPendingNew ? " isPendingNew" : ""}`}
      style={{ height: rowHeight }} // fixed height required by the virtualizer
    >
      {/* checkbox cell on the left — clicking it selects or deselects this row. */}
      <td className="selectCell" onClick={stopClick}>
        <input
          type="checkbox"
          className="rowCheckbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          aria-label={`Select row ${row.id}`}
        />
      </td>

      {/* one EditableCell for each visible column.
          each cell knows whether it is currently being edited (isEditing),
          whether its value is unsaved (isDirty), and whether it has a validation error. */}
      {columns.map((column) => {
        // this cell is in editing mode only if it is THE specific cell the user clicked.
        // example: user clicked the Salary cell in row r5 →
        //   editingCell = { rowId: "r5", columnId: "salary" }
        //   → only that one cell gets isEditing=true
        const isEditing =
          editingCell?.rowId === row.id && editingCell?.columnId === column.id;

        return (
          <EditableCell
            key={column.id}
            rowId={row.id}
            column={column}
            value={getCellValue(row, column.id)}      // draft value if dirty, stored value otherwise
            isEditing={isEditing}
            isDirty={isCellDirty(row.id, column.id)}  // true = orange dot in corner
            error={getCellError ? getCellError(row, column) : null} // error = red ! badge
            onStartEdit={onStartEdit}
            onStopEdit={onStopEdit}
            onCancelEdit={onCancelEdit}
            onChange={onChange}
          />
        );
      })}

      {/* × delete button on the right.
          clicking it marks the row for deletion — it immediately disappears from the table
          (it's added to pendingDeletedIds) but the deletion is only finalized when Save is clicked.
          if the user clicks Cancel, the row comes back. */}
      <td className="deleteCell">
        <button
          type="button"
          className="deleteRowButton"
          onClick={handleDeleteClick}
          aria-label={`Delete row ${row.id}`}
          title="Delete row"
        >
          ×
        </button>
      </td>
    </tr>
  );
});
