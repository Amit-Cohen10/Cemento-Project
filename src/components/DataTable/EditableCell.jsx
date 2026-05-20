import { memo } from "react";
import {
  formatCellValue,
  getColumnAlignment,
  normalizeOptions,
  parseCellValue,
  toDateInputValue,
} from "../../utils/cellValueUtils.js";

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

  const displayValue = formatCellValue(column, value);

  const hasError = Boolean(error);
  const isReadOnly = Boolean(column.readOnly);

  const startEditing = () => {
    if (isReadOnly) {
      return;
    }
    onStartEdit(rowId, column.id);
  };

  const handleCellKeyDown = (event) => {
    if (isEditing) {
      return;
    }

    if (!isReadOnly && event.key === "Enter") {
      event.preventDefault();
      startEditing();
    }
  };

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

  const cellTitle = hasError ? error : undefined;

  return (
    <td

      className={`editableCell align-${alignment} ${isDirty ? "isDirty" : ""} ${
        hasError ? "isInvalid" : ""
      } ${isReadOnly ? "isReadOnly" : ""}`}
      onClick={startEditing}
      onKeyDown={handleCellKeyDown}

      tabIndex={isReadOnly ? undefined : 0}
      style={{ width: column.width }}
      title={isReadOnly ? "Row ID" : cellTitle}
      aria-invalid={hasError ? "true" : undefined}
    >

      {isEditing ? renderEditor() : renderValue()}

      {isDirty && <span className="dirtyMarker" title="Unsaved change" />}

      {hasError && <span className="errorMarker" title={error}>!</span>}
    </td>
  );
});
