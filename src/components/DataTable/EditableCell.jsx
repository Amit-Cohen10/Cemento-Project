// this component renders one cell in the table.
// when the user clicks it (or presses Enter while it is focused),
// it switches from showing the value to showing an editor input.
// the editor type changes based on the column type:
//   string  -> text input
//   number  -> number input
//   boolean -> checkbox with a Yes/No label
//   select  -> dropdown
//   date    -> date picker
// pressing Enter saves the edit. pressing Escape cancels it.
// it talks to: TableRow (which creates it), cellValueUtils (for formatting and parsing values).

import { memo } from "react";
import {
  formatCellValue,
  getColumnAlignment,
  normalizeOptions,
  parseCellValue,
  toDateInputValue,
} from "../../utils/cellValueUtils.js";

// memo skips re-rendering this cell if nothing about it changed.
// there can be thousands of cells on screen, so this matters a lot.
export const EditableCell = memo(function EditableCell({
  rowId,
  column,
  value,
  isEditing,
  isDirty,
  error,
  onStartEdit,
  onStopEdit,
  onCancelEdit,
  onChange,
}) {
  const alignment = getColumnAlignment(column);
  // formatCellValue turns the raw value into a readable string (e.g. 120000 -> "120,000$").
  const displayValue = formatCellValue(column, value);
  const hasError = Boolean(error);
  const isReadOnly = Boolean(column.readOnly);

  const startEditing = () => {
    // do not open an editor for read-only cells (e.g. the ID column).
    if (isReadOnly) {
      return;
    }
    onStartEdit(rowId, column.id);
  };

  // keyboard support: pressing Enter on a focused (but not yet editing) cell opens the editor.
  const handleCellKeyDown = (event) => {
    if (isEditing) {
      return; // editor already open, let the editor's own handler deal with keys.
    }

    if (!isReadOnly && event.key === "Enter") {
      event.preventDefault();
      startEditing();
    }
  };

  // keyboard support inside the editor:
  //   Enter  -> commit the value and close the editor.
  //   Escape -> discard the change and close the editor.
  const handleEditorKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onStopEdit();
      event.currentTarget.blur(); // remove focus from the input
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onCancelEdit(rowId, column.id);
    }
  };

  // renders the correct editor widget based on the column type.
  const renderEditor = () => {
    if (column.type === "boolean") {
      return (
        // stopPropagation stops the label click from bubbling to the <td>,
        // which would call startEditing again and cause a loop.
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
          <option value="">Choose value...</option>
          {/* normalizeOptions handles options defined as plain strings or as {label, value} objects. */}
          {normalizeOptions(column.options).map((option) => (
            <option key={String(option.value)} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (column.type === "date") {
      return (
        <input
          autoFocus
          className="cellInput"
          type="date"
          // toDateInputValue converts the stored ISO string to "YYYY-MM-DD" format
          // which is what <input type="date"> needs.
          value={toDateInputValue(value)}
          onClick={(event) => event.stopPropagation()}
          onBlur={onStopEdit}
          onChange={(event) =>
            onChange(rowId, column.id, parseCellValue(column, event.target.value))
          }
          onKeyDown={handleEditorKeyDown}
        />
      );
    }

    // default: text input for strings, number input for numbers.
    // type="number" gives a numeric keyboard on mobile for free.
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

  // renders the read-only display of the value (not editing mode).
  const renderValue = () => {
    if (column.type === "boolean") {
      // yes = green pill, no = red pill.
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

  // show the error message as a native browser tooltip on hover.
  const cellTitle = hasError ? error : undefined;

  return (
    <td
      className={`editableCell align-${alignment} ${isDirty ? "isDirty" : ""} ${
        hasError ? "isInvalid" : ""
      } ${isReadOnly ? "isReadOnly" : ""}`}
      onClick={startEditing}
      onKeyDown={handleCellKeyDown}
      // tabIndex=0 makes the cell reachable by keyboard Tab.
      // read-only cells do not need to be focused.
      tabIndex={isReadOnly ? undefined : 0}
      style={{ width: column.width }}
      title={isReadOnly ? "Row ID" : cellTitle}
      aria-invalid={hasError ? "true" : undefined}
    >
      {/* swap between the editor widget and the display value. */}
      {isEditing ? renderEditor() : renderValue()}

      {/* small orange dot in the corner when this cell has an unsaved change. */}
      {isDirty && <span className="dirtyMarker" title="Unsaved change" />}

      {/* red exclamation mark when the cell value is invalid. */}
      {hasError && <span className="errorMarker" title={error}>!</span>}
    </td>
  );
});
