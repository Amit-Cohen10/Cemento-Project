import { memo } from "react";
import {
  formatCellValue,
  getColumnAlignment,
  normalizeOptions,
  parseCellValue,
} from "../../utils/cellValueUtils.js";

/*
 * One cell of the table.
 * When the user clicks it we swap the read view for the matching editor
 * (text input, number input, select, or checkbox) based on the column type.
 * Wrapped in React.memo because there are a lot of these on screen and
 * most of them don't change between renders.
 */
export const EditableCell = memo(function EditableCell({
  rowId,
  column,
  value,
  isEditing,
  isDirty,
  onStartEdit,
  onStopEdit,
  onCancelEdit,
  onChange,
}) {
  const alignment = getColumnAlignment(column);
  const displayValue = formatCellValue(column, value);

  const startEditing = () => {
    onStartEdit(rowId, column.id);
  };

  // Keyboard support: Enter on a focused cell opens the editor.
  const handleCellKeyDown = (event) => {
    if (isEditing) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      startEditing();
    }
  };

  // While editing: Enter commits the value, Escape rolls it back.
  const handleEditorKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onStopEdit();
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onCancelEdit(rowId, column.id);
    }
  };

  const renderEditor = () => {
    if (column.type === "boolean") {
      return (
        // stopPropagation prevents the label click from bubbling to the td,
        // which would call startEditing again.
        <label className="checkboxEditor" onClick={(event) => event.stopPropagation()}>
          <input
            autoFocus
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(rowId, column.id, event.target.checked)}
            onBlur={onStopEdit}
            onKeyDown={handleEditorKeyDown}
          />
          <span>{value ? "Yes" : "No"}</span>
        </label>
      );
    }

    if (column.type === "select" || column.type === "selection") {
      return (
        <select
          autoFocus
          className="cellInput"
          value={value ?? ""}
          onClick={(event) => event.stopPropagation()}
          onBlur={onStopEdit}
          onChange={(event) =>
            onChange(rowId, column.id, parseCellValue(column, event.target.value))
          }
          onKeyDown={handleEditorKeyDown}
        >
          {normalizeOptions(column.options).map((option) => (
            <option key={String(option.value)} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    // Default editor: text or number input. Using type="number" gives us the
    // built-in numeric keyboard on mobile and basic validation for free.
    return (
      <input
        autoFocus
        className="cellInput"
        type={column.type === "number" ? "number" : "text"}
        value={value ?? ""}
        onClick={(event) => event.stopPropagation()}
        onBlur={onStopEdit}
        onChange={(event) =>
          onChange(rowId, column.id, parseCellValue(column, event.target.value))
        }
        onKeyDown={handleEditorKeyDown}
      />
    );
  };

  const renderValue = () => {
    if (column.type === "boolean") {
      return (
        <span className={`booleanPill ${value ? "isTrue" : "isFalse"}`}>
          {displayValue}
        </span>
      );
    }

    if (column.type === "select" || column.type === "selection") {
      return <span className="selectPill">{displayValue}</span>;
    }

    return <span className="cellText">{displayValue}</span>;
  };

  return (
    <td
      className={`editableCell align-${alignment} ${isDirty ? "isDirty" : ""}`}
      onClick={startEditing}
      onKeyDown={handleCellKeyDown}
      tabIndex={0}
      style={{ width: column.width }}
    >
      {isEditing ? renderEditor() : renderValue()}
      {/* Little orange dot shows the user this cell has unsaved changes. */}
      {isDirty && <span className="dirtyMarker" title="Unsaved change" />}
    </td>
  );
});
