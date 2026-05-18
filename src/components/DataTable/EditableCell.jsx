// this component renders one cell in the table.
//
// on the website: each cell has two "modes":
//
//   display mode (default):
//     the cell shows the stored value as readable text.
//     example: salary cell shows "120,000$"
//              active cell shows a green "Yes" pill or a dark "No" pill
//              role cell shows a purple "Frontend" pill
//     the user can click the cell (or press Enter while it is focused) to start editing.
//
//   editing mode (after a click):
//     the cell shows an input control matching the column's data type.
//     example: salary cell → number input pre-filled with the current value
//              active cell → checkbox with a Yes/No label
//              role cell   → dropdown listing all role options
//              start date  → calendar date picker
//              name cell   → plain text input
//     pressing Enter saves the new value and closes the editor.
//     pressing Escape cancels the edit and restores the old value.
//
// visual indicators:
//   orange dot in the corner = this cell has an unsaved change (isDirty)
//   red "!" badge = the value failed validation (e.g. salary below the minimum)
//   read-only cells (like the ID column) cannot be clicked at all.
//
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
// there can be thousands of cells on screen at once, so avoiding unnecessary renders
// keeps the table fast. the cell only re-renders when its value, editing state,
// dirty flag, error, or column definition actually changes.
export const EditableCell = memo(function EditableCell({
  rowId,
  column,
  value,         // the current value to display or edit
  isEditing,     // true when this specific cell is open for editing right now
  isDirty,       // true when this cell has an unsaved draft change
  error,         // validation error message to show, or null/undefined
  onStartEdit,   // called when the user clicks or presses Enter to open the editor
  onStopEdit,    // called when the user confirms the edit (Enter / blur)
  onCancelEdit,  // called when the user presses Escape to discard the change
  onChange,      // called with (rowId, columnId, newValue) whenever the input changes
}) {
  // get the text alignment class for this column type:
  // number columns → right-aligned ("120,000$" sits against the right edge, like a spreadsheet)
  // boolean columns → centered (the Yes/No pill is small and looks better centered)
  // everything else → left-aligned (normal reading direction)
  const alignment = getColumnAlignment(column);

  // convert the raw stored value to the human-readable string for display mode.
  // examples: 120000 → "120,000$"    (currency number column)
  //           true   → "Yes"          (boolean column)
  //           null   → "Not set"      (any column with no value)
  //           "2024-03-15T..." → "Mar 15, 2024"
  const displayValue = formatCellValue(column, value);

  const hasError = Boolean(error);
  const isReadOnly = Boolean(column.readOnly); // ID column and similar are read-only

  // called when the user clicks the cell or presses Enter on it.
  // does nothing for read-only cells (the ID column should never be edited).
  const startEditing = () => {
    if (isReadOnly) {
      return;
    }
    onStartEdit(rowId, column.id);
  };

  // keyboard handler for when the cell itself is focused (but not yet editing).
  // pressing Enter opens the editor — same as clicking the cell.
  const handleCellKeyDown = (event) => {
    if (isEditing) {
      return; // editor is already open — let the editor's own key handler deal with keys
    }

    if (!isReadOnly && event.key === "Enter") {
      event.preventDefault();
      startEditing();
    }
  };

  // keyboard handler inside the open editor:
  //   Enter  → save the current value and close the editor (same as clicking away)
  //   Escape → discard the change and restore the previous value
  const handleEditorKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onStopEdit();
      event.currentTarget.blur(); // remove focus from the input so Enter doesn't fire twice
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onCancelEdit(rowId, column.id); // restore the old value for this cell
    }
  };

  // chooses and renders the right editor widget for the column's data type.
  // called only when isEditing is true.
  const renderEditor = () => {
    if (column.type === "boolean") {
      // boolean column: a checkbox with a Yes/No label next to it.
      // toggling the checkbox immediately updates the value (no need to press Enter).
      // example: "Active" column — user sees [✓] Yes / [ ] No
      // stopPropagation on the label prevents the click from bubbling up to the <td>,
      // which would call startEditing again and cause a flicker/loop.
      return (
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
      // select column: a dropdown listing all the column's defined options.
      // example: "Role" column shows a dropdown: Frontend / Backend / QA / ...
      // normalizeOptions handles options defined as plain strings OR as {label, value} objects.
      // parseCellValue converts the string from the DOM to the stored type before calling onChange.
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
          {normalizeOptions(column.options).map((option) => (
            <option key={String(option.value)} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (column.type === "date") {
      // date column: the browser's native calendar date picker.
      // <input type="date"> needs the value in "YYYY-MM-DD" format (e.g. "2024-03-15").
      // toDateInputValue converts our stored ISO string to that format.
      // parseCellValue then converts the picked "YYYY-MM-DD" back to a full ISO string when saving.
      return (
        <input
          autoFocus
          className="cellInput"
          type="date"
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

    // default: text input for string columns, number input for number columns.
    // type="number" gives a numeric keyboard on mobile and prevents non-numeric input.
    // parseCellValue converts the string from the DOM to a JS number when saving.
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

  // renders the read-only display of the value when NOT in editing mode.
  // different column types get different visual treatments:
  const renderValue = () => {
    if (column.type === "boolean") {
      // boolean values appear as coloured pills.
      // isTrue  → green pill with "Yes"
      // isFalse → dark grey pill with "No"
      return (
        <span className={`booleanPill ${value ? "isTrue" : "isFalse"}`}>
          {displayValue}
        </span>
      );
    }

    if (column.type === "select" || column.type === "selection") {
      // select values appear as a light purple pill (e.g. "Frontend").
      return <span className="selectPill">{displayValue}</span>;
    }

    // strings, numbers, dates: plain text inside a span.
    // example: "Amit Cohen",  "120,000$",  "Mar 15, 2024"
    return <span className="cellText">{displayValue}</span>;
  };

  // if there is an error, show it as a browser tooltip when the user hovers over the cell.
  // example: hovering an invalid salary cell shows "Value must be between 30000 and 500000"
  const cellTitle = hasError ? error : undefined;

  return (
    <td
      // CSS classes control the cell's appearance:
      //   align-left/right/center  → text alignment for this column type
      //   isDirty                  → orange left-border to indicate unsaved change
      //   isInvalid                → red border when the value fails validation
      //   isReadOnly               → lighter text, no pointer cursor (ID column)
      className={`editableCell align-${alignment} ${isDirty ? "isDirty" : ""} ${
        hasError ? "isInvalid" : ""
      } ${isReadOnly ? "isReadOnly" : ""}`}
      onClick={startEditing}
      onKeyDown={handleCellKeyDown}
      // tabIndex=0 makes the cell reachable by keyboard Tab navigation.
      // read-only cells do not need to be focused — they have no editor to open.
      tabIndex={isReadOnly ? undefined : 0}
      style={{ width: column.width }}
      title={isReadOnly ? "Row ID" : cellTitle}
      aria-invalid={hasError ? "true" : undefined}
    >
      {/* show the editor widget when editing, otherwise show the formatted value. */}
      {isEditing ? renderEditor() : renderValue()}

      {/* small orange dot in the top-right corner when this cell has an unsaved change.
          disappears after the user saves or cancels.
          example: user typed a new salary but hasn't clicked Save yet → orange dot shows */}
      {isDirty && <span className="dirtyMarker" title="Unsaved change" />}

      {/* red "!" badge when the value is invalid.
          example: salary typed as -5000 when the minimum is 30000 → red ! badge shows */}
      {hasError && <span className="errorMarker" title={error}>!</span>}
    </td>
  );
});
