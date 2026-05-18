// popover that lets the user pick one column + one value and apply it to all selected rows at once.
//
// on the website: whenever the user selects rows by clicking checkboxes, a button appears
// in the toolbar that says "Edit field (N)" where N is the number of selected rows.
// clicking the button opens a small panel below it with two steps:
//
//   step 1: a dropdown to choose which column to change (e.g. "Role", "Salary", "Active")
//   step 2: an input field matching that column's type — for example:
//              selecting "Active" (boolean) shows a Yes/No dropdown
//              selecting "Role"   (select)  shows a dropdown of role options
//              selecting "Salary" (number)  shows a number input
//              selecting "Start Date" (date) shows a date picker
//              selecting "Name"   (string)  shows a plain text input
//
//   then the user clicks "Apply to N rows" and all selected rows get that new value
//   as a draft (shown with an orange "unsaved" highlight). the user can still Cancel or Save.
//
// the panel closes automatically when the user clicks anywhere outside it.
// the value input resets to blank whenever the user switches to a different column.
// read-only columns (like the ID column) are excluded from the dropdown.

import { useEffect, useRef, useState } from "react";
import { normalizeOptions, parseCellValue } from "../../utils/cellValueUtils.js";

export function BulkEditPopover({ columns, selectedCount, onApply }) {
  // isOpen: controls whether the panel below the button is visible.
  // starts closed; clicking the "Edit field (N)" button opens it.
  const [isOpen, setIsOpen] = useState(false);

  // columnId: the id of the column the user has chosen in the first dropdown.
  // empty string means nothing is selected yet.
  const [columnId, setColumnId] = useState("");

  // rawValue: the raw string coming from the input element.
  // always a string from the DOM — parseCellValue converts it to the right type on Apply.
  // example: user picks "Active" and chooses "Yes" → rawValue = "true" (string)
  //          parseCellValue converts it to → true (boolean) when Apply is clicked
  const [rawValue, setRawValue] = useState("");

  // ref to the outer container div so we can detect clicks outside the panel.
  const containerRef = useRef(null);

  // close the panel when the user clicks outside it.
  // we listen on the whole document and check if the click landed inside our container.
  // the listener is only active when the panel is open (not needed when closed).
  // cleanup (return) removes the listener when the panel closes or the component unmounts.
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e) => {
      if (!containerRef.current?.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isOpen]);

  // reset the value input whenever the user picks a different column.
  // example: user had "Salary" selected and typed "90000", then switches to "Active" —
  // the "90000" is cleared so the boolean dropdown starts blank instead of showing "90000".
  useEffect(() => {
    setRawValue("");
  }, [columnId]);

  // build the list of columns that can be bulk-edited.
  // we exclude: readOnly columns (like the auto-generated ID column)
  //             selection columns (they are row-level UI, not data)
  // example: [name, role, salary, active, team, startDate]  — not [id]
  const editableColumns = columns.filter((c) => !c.readOnly && c.type !== "selection");

  // look up the full column definition object for the currently selected column id.
  // we need this to know the type (for the input), options (for selects), and min/max (for numbers).
  // null when nothing is selected yet (no column chosen in step 1).
  const column = editableColumns.find((c) => c.id === columnId) ?? null;

  // called when the user clicks "Apply to N rows".
  // converts the raw string from the input into the correct JS type for this column,
  // then passes it up to the parent (useEditableTable.bulkUpdateField) which writes
  // the value as a draft to every selected row.
  // then closes the popover and resets everything for the next use.
  function handleApply() {
    // guard: do nothing if no column is selected or the value is empty.
    if (!column || rawValue === "") return;

    // parseCellValue converts the raw DOM string to the correct stored type.
    // example: column type "number", rawValue "90000" → parsed = 90000 (number)
    //          column type "boolean", rawValue "true"  → parsed = true  (boolean)
    //          column type "date", rawValue "2024-03-15" → parsed = "2024-03-15T00:00:00.000Z"
    onApply(column.id, parseCellValue(column, rawValue));

    // close the panel and reset both selections for next time.
    setIsOpen(false);
    setColumnId("");
    setRawValue("");
  }

  function handleToggle() {
    setIsOpen((v) => !v);
  }

  return (
    // the container div holds both the trigger button and the floating panel.
    // containerRef is used by the outside-click handler above.
    <div className="bulkEditPopover" ref={containerRef}>

      {/* the button the user clicks to open the panel.
          title shows a tooltip on hover explaining what it does.
          the number in parentheses updates live as selection changes. */}
      <button
        type="button"
        className="secondaryButton"
        onClick={handleToggle}
        title={`Set a field on all ${selectedCount} selected rows`}
      >
        Edit field ({selectedCount})
      </button>

      {/* the floating panel — only rendered when isOpen is true */}
      {isOpen && (
        <div className="bulkEditPanel">

          {/* hint text at the top so the user knows what the panel does.
              example: "apply one change to 15 selected rows" */}
          <p className="bulkEditHint">
            apply one change to {selectedCount} selected row{selectedCount === 1 ? "" : "s"}
          </p>

          {/* step 1: choose which column to edit.
              only editable columns are listed — read-only and selection columns are excluded. */}
          <select
            className="bulkEditSelect"
            value={columnId}
            onChange={(e) => setColumnId(e.target.value)}
          >
            <option value="">— choose a column —</option>
            {editableColumns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          {/* step 2: enter the value.
              only shown after a column is selected.
              the ValueInput component renders the right input type for the column. */}
          {column && (
            <ValueInput column={column} value={rawValue} onChange={setRawValue} />
          )}

          {/* the apply button.
              disabled until both a column and a value have been provided.
              clicking it writes the value to every selected row as a draft. */}
          <button
            type="button"
            className="primaryButton"
            disabled={!column || rawValue === ""}
            onClick={handleApply}
          >
            Apply to {selectedCount} row{selectedCount === 1 ? "" : "s"}
          </button>
        </div>
      )}
    </div>
  );
}

// renders the right input control for the column's data type.
// each column type needs a different input so the user sees a sensible UI:
//
//   boolean  → a Yes/No dropdown  (not a free-text box — there are only two valid values)
//   select   → a dropdown listing all the column's options  (e.g. Frontend / Backend / QA)
//   date     → a calendar date picker  (<input type="date">)
//   number   → a number input with optional min/max from the column definition
//   string   → a plain text input
//
// value and onChange are passed from the parent — all state lives in BulkEditPopover.
function ValueInput({ column, value, onChange }) {
  // boolean column: only two valid values — show a Yes/No dropdown.
  // example: "Active" column → user picks "Yes" → rawValue = "true" (string)
  //          parseCellValue later converts "true" → true (boolean)
  if (column.type === "boolean") {
    return (
      <select
        className="bulkEditSelect"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— choose —</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  // select / selection column: show all the defined options as a dropdown.
  // normalizeOptions converts both plain strings and {label, value} objects to a consistent format.
  // example: "Role" column options ["Frontend", "Backend", "QA"] →
  //          dropdown shows Frontend / Backend / QA
  if (column.type === "select" || column.type === "selection") {
    const opts = normalizeOptions(column.options);
    return (
      <select
        className="bulkEditSelect"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— choose —</option>
        {opts.map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  // date column: show the browser's native calendar date picker.
  // the user picks a date and the input gives back "YYYY-MM-DD" (e.g. "2024-03-15").
  // parseCellValue later converts it to a full ISO string for consistent storage.
  if (column.type === "date") {
    return (
      <input
        type="date"
        className="bulkEditInput"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  // number column: show a numeric input with optional min and max constraints.
  // example: "Salary" column with min=30000 max=500000 shows placeholder "number ≥ 30000 ≤ 500000"
  // the browser enforces min/max natively so the user can't type out-of-range values easily.
  if (column.type === "number") {
    return (
      <input
        type="number"
        className="bulkEditInput"
        value={value}
        min={column.min}
        max={column.max}
        placeholder={`number${column.min !== undefined ? ` ≥ ${column.min}` : ""}${column.max !== undefined ? ` ≤ ${column.max}` : ""}`}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  // string column (and any unrecognised type): show a plain text input.
  // example: "Name" column → user types "Amit Cohen"
  return (
    <input
      type="text"
      className="bulkEditInput"
      value={value}
      placeholder="enter a value"
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
