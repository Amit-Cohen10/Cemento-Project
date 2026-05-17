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
  getCellValue,
  isCellDirty,
  onStartEdit,
  onStopEdit,
  onCancelEdit,
  onChange,
  onDeleteRow,
}) {
  const handleDeleteClick = (event) => {
    // Stop propagation so clicking the button doesn't also start editing
    // the cell underneath it.
    event.stopPropagation();
    onDeleteRow(row.id);
  };

  return (
    <tr className={rowIndex % 2 === 0 ? "evenRow" : "oddRow"} style={{ height: rowHeight }}>
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
