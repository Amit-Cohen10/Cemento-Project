// Pre-built Intl formatters. I create them once at module level instead of on
// every render because Intl.NumberFormat is surprisingly expensive to build.
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

// Select columns can pass options as plain strings (["Junior", "Senior"]) or
// as { label, value } objects. This normalises both shapes so the rest of the
// table only has to handle one.
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

// Take whatever the user typed in the input and turn it into the right type
// for the column. Inputs always give us strings, so a "number" column needs
// to convert the string back to a real number before saving.
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
    // We compare as strings because <option value> is always a string,
    // even when the original option value was a number.
    const matchingOption = normalizeOptions(column.options).find(
      (option) => String(option.value) === String(rawValue),
    );

    return matchingOption ? matchingOption.value : rawValue;
  }

  return String(rawValue ?? "");
}

// Turn a saved value into the text the user actually sees in the cell.
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

// Numbers feel right-aligned, booleans feel center-aligned (the pill is
// small), everything else stays left.
export function getColumnAlignment(column) {
  if (column.type === "number") {
    return "right";
  }

  if (column.type === "boolean") {
    return "center";
  }

  return "left";
}
