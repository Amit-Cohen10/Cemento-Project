// this component renders a single row in the table.
// it loops over the visible columns and renders an EditableCell for each one.
// it also renders the checkbox on the left (for selection) and the delete button on the right.
// it talks to: DataTable (which creates it), EditableCell (one per column in this row).

// memo means React skips re-rendering this row if none of its props changed.
// this is important because the table can have hundreds of rows —
// without memo, editing one cell would re-render every row on screen.
import { memo } from "react";
import { EditableCell } from "./EditableCell.jsx";

export const TableRow = memo(function TableRow({
  row,
  rowIndex,
  columns,
  rowHeight,
  editingCell,
  isSelected,
  isPendingNew,
  getCellValue,
  isCellDirty,
  getCellError,
  onStartEdit,
  onStopEdit,
  onCancelEdit,
  onChange,
  onDeleteRow,
  onToggleSelect,
}) {
  const handleDeleteClick = (event) => {
    // stopPropagation prevents the click from bubbling up to the row,
    // which would otherwise try to start editing the cell behind the button.
    event.stopPropagation();
    onDeleteRow(row.id);
  };

  const handleCheckboxChange = (event) => {
    event.stopPropagation();
    onToggleSelect(row.id);
  };

  // used on the checkbox cell to stop clicks from reaching the row and triggering edit mode.
  const stopClick = (event) => event.stopPropagation();

  return (
    <tr
      // alternate background color for easier reading.
      // isSelected adds a blue tint when the checkbox is ticked.
      // isPendingNew adds a green tint for rows that have been added but not saved yet.
      className={`${rowIndex % 2 === 0 ? "evenRow" : "oddRow"}${isSelected ? " isSelected" : ""}${isPendingNew ? " isPendingNew" : ""}`}
      style={{ height: rowHeight }}
    >
      {/* checkbox cell on the left. */}
      <td className="selectCell" onClick={stopClick}>
        <input
          type="checkbox"
          className="rowCheckbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          aria-label={`Select row ${row.id}`}
        />
      </td>

      {/* one EditableCell for each visible column. */}
      {columns.map((column) => {
        // check if this specific cell is the one currently being edited.
        const isEditing =
          editingCell?.rowId === row.id && editingCell?.columnId === column.id;

        return (
          <EditableCell
            key={column.id}
            rowId={row.id}
            column={column}
            value={getCellValue(row, column.id)}
            isEditing={isEditing}
            isDirty={isCellDirty(row.id, column.id)}
            error={getCellError ? getCellError(row, column) : null}
            onStartEdit={onStartEdit}
            onStopEdit={onStopEdit}
            onCancelEdit={onCancelEdit}
            onChange={onChange}
          />
        );
      })}

      {/* delete button on the right. */}
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
