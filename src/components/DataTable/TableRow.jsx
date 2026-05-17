import { memo } from "react";
import { EditableCell } from "./EditableCell.jsx";

/*
 * One row of the table.
 * Wrapped in React.memo so rows that didn't change skip re-rendering when
 * the user edits a cell somewhere else.
 */
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
    // Stop propagation so clicking the button doesn't also start editing
    // the cell underneath it.
    event.stopPropagation();
    onDeleteRow(row.id);
  };

  const handleCheckboxChange = (event) => {
    event.stopPropagation();
    onToggleSelect(row.id);
  };

  // Prevent the click from bubbling up to neighbour cells.
  const stopClick = (event) => event.stopPropagation();

  return (
    <tr
      className={`${rowIndex % 2 === 0 ? "evenRow" : "oddRow"}${isSelected ? " isSelected" : ""}${isPendingNew ? " isPendingNew" : ""}`}
      style={{ height: rowHeight }}
    >
      <td className="selectCell" onClick={stopClick}>
        <input
          type="checkbox"
          className="rowCheckbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          aria-label={`Select row ${row.id}`}
        />
      </td>

      {columns.map((column) => {
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
