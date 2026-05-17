// Pre-built Intl formatters. I create them once at module level instead of on
// every render because Intl.NumberFormat is surprisingly expensive to build.
//
// For currency I format the bare number and append "$" manually instead of
// using `style: "currency"`. Intl always puts the USD symbol on the left
// ($1,200), but the product copy here prefers it on the right (1,200$).
const currencyAmountFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
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
    if (rawValue === "" || rawValue === null || rawValue === undefined) {
      return null;
    }

    // We compare as strings because <option value> is always a string,
    // even when the original option value was a number.
    const matchingOption = normalizeOptions(column.options).find(
      (option) => String(option.value) === String(rawValue),
    );

    return matchingOption ? matchingOption.value : rawValue;
  }

  if (column.type === "date") {
    // <input type="date"> hands us a "YYYY-MM-DD" string. I store the value
    // as a full ISO string so sorting and display can be consistent.
    if (!rawValue) {
      return null;
    }
    const parsed = new Date(rawValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
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
    if (column.format === "currency") {
      return `${currencyAmountFormatter.format(value)}$`;
    }
    return numberFormatter.format(value);
  }

  if (column.type === "select" || column.type === "selection") {
    const matchingOption = normalizeOptions(column.options).find(
      (option) => option.value === value,
    );

    return matchingOption ? matchingOption.label : String(value);
  }

  if (column.type === "date") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Not set" : dateFormatter.format(date);
  }

  return String(value);
}

// Convert an ISO date string to the "YYYY-MM-DD" format that
// <input type="date"> requires. Returns "" if the value is missing.
export function toDateInputValue(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
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
