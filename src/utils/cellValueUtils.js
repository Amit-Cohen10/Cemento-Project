const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

// Normalizes select options so the rest of the table can handle one shape.
export function normalizeOptions(options = []) {
  return options.map((option) => {
    if (option && typeof option === "object") {
      return {
        label: String(option.label ?? option.value),
        value: option.value,
      };
    }

    return {
      label: String(option),
      value: option,
    };
  });
}

// Converts user input into the correct value type for the column.
export function parseCellValue(column, rawValue) {
  if (column.type === "number") {
    if (rawValue === "" || rawValue === null || rawValue === undefined) {
      return null;
    }

    const numberValue = Number(rawValue);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  if (column.type === "boolean") {
    if (typeof rawValue === "boolean") {
      return rawValue;
    }

    return rawValue === "true" || rawValue === "on" || rawValue === 1;
  }

  if (column.type === "select" || column.type === "selection") {
    const matchingOption = normalizeOptions(column.options).find(
      (option) => String(option.value) === String(rawValue),
    );

    return matchingOption ? matchingOption.value : rawValue;
  }

  return String(rawValue ?? "");
}

// Converts a saved value into readable UI text.
export function formatCellValue(column, value) {
  if (value === null || value === undefined || value === "") {
    return "Not set";
  }

  if (column.type === "boolean") {
    return value ? "Yes" : "No";
  }

  if (column.type === "number") {
    return column.format === "currency"
      ? currencyFormatter.format(value)
      : numberFormatter.format(value);
  }

  if (column.type === "select" || column.type === "selection") {
    const matchingOption = normalizeOptions(column.options).find(
      (option) => option.value === value,
    );

    return matchingOption ? matchingOption.label : String(value);
  }

  return String(value);
}

// Keeps alignment consistent across the whole table.
export function getColumnAlignment(column) {
  if (column.type === "number") {
    return "right";
  }

  if (column.type === "boolean") {
    return "center";
  }

  return "left";
}
