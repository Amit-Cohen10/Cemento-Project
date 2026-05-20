import { useEffect, useRef, useState } from "react";
import { normalizeOptions, parseCellValue } from "../../utils/cellValueUtils.js";

export function BulkEditPopover({ columns, selectedCount, onApply }) {

  const [isOpen, setIsOpen] = useState(false);

  const [columnId, setColumnId] = useState("");

  const [rawValue, setRawValue] = useState("");

  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e) => {
      if (!containerRef.current?.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isOpen]);

  useEffect(() => {
    setRawValue("");
  }, [columnId]);

  const editableColumns = columns.filter((c) => !c.readOnly && c.type !== "selection");

  const column = editableColumns.find((c) => c.id === columnId) ?? null;

  function handleApply() {

    if (!column || rawValue === "") return;

    onApply(column.id, parseCellValue(column, rawValue));

    setIsOpen(false);
    setColumnId("");
    setRawValue("");
  }

  function handleToggle() {
    setIsOpen((v) => !v);
  }

  return (

    <div className="bulkEditPopover" ref={containerRef}>

      <button
        type="button"
        className="secondaryButton"
        onClick={handleToggle}
        title={`Set a field on all ${selectedCount} selected rows`}
      >
        Edit field ({selectedCount})
      </button>

      {isOpen && (
        <div className="bulkEditPanel">

          <p className="bulkEditHint">
            apply one change to {selectedCount} selected row{selectedCount === 1 ? "" : "s"}
          </p>

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

          {column && (
            <ValueInput column={column} value={rawValue} onChange={setRawValue} />
          )}

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

function ValueInput({ column, value, onChange }) {

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
