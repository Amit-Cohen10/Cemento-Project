// utility functions for reading, writing, and displaying cell values.
// they handle the conversion between what is stored in the data (raw values)
// and what the user sees or types (formatted strings).
//
// used by EditableCell (to display and parse values),
//         FilterPanel (for the date input),
//         SelectionSummary (to format stats),
//         TableHeader (to decide text alignment).

// we create these formatters once at module level instead of inside a function
// because creating an Intl formatter is expensive and we call format() many times per render.

// formats a plain number with commas: 120000 -> "120,000"
const currencyAmountFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

// formats a number with up to 2 decimal places: 3.14159 -> "3.14"
const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

// formats a date: 2024-03-15 -> "Mar 15, 2024"
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

// select column options can be written as plain strings ("Junior")
// or as objects ({ label: "Junior", value: "junior" }).
// this function normalizes both formats into the object shape
// so the rest of the code only needs to handle one format.
export function normalizeOptions(options = []) {
  return options.map((option) => {
    if (option && typeof option === "object") {
      return {
        label: String(option.label ?? option.value),
        value: option.value,
      };
    }
    // plain string — use it as both the label and the value.
    return {
      label: String(option),
      value: option,
    };
  });
}

// convert the raw string from an <input> element into the correct type for the column.
// inputs always give us strings, so number columns need to parse the string back to a number.
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
    // a checkbox gives us true/false directly, but a string input might give "true" or "on".
    return rawValue === "true" || rawValue === "on" || rawValue === 1;
  }

  if (column.type === "select" || column.type === "selection") {
    if (rawValue === "" || rawValue === null || rawValue === undefined) {
      return null;
    }
    // find the matching option so we store the original value, not just the string version of it.
    const matchingOption = normalizeOptions(column.options).find(
      (option) => String(option.value) === String(rawValue),
    );
    return matchingOption ? matchingOption.value : rawValue;
  }

  if (column.type === "date") {
    // <input type="date"> gives us "YYYY-MM-DD". we store it as a full ISO string
    // so sorting and comparisons work consistently.
    if (!rawValue) {
      return null;
    }
    const parsed = new Date(rawValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  // default: keep it as a string.
  return String(rawValue ?? "");
}

// turn a stored value into the human-readable text shown in the cell.
export function formatCellValue(column, value) {
  if (value === null || value === undefined || value === "") {
    return "Not set";
  }

  if (column.type === "boolean") {
    return value ? "Yes" : "No";
  }

  if (column.type === "number") {
    if (column.format === "currency") {
      // append the "$" on the right: "120,000$"
      return `${currencyAmountFormatter.format(value)}$`;
    }
    return numberFormatter.format(value);
  }

  if (column.type === "select" || column.type === "selection") {
    // find the option label. falls back to the raw value if no match.
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

// convert a stored ISO date string to "YYYY-MM-DD" which is what <input type="date"> needs.
// returns an empty string if the value is missing or invalid.
export function toDateInputValue(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  // toISOString() returns "2024-03-15T00:00:00.000Z", we only need the first 10 characters.
  return date.toISOString().slice(0, 10);
}

// returns the CSS text alignment for a column based on its type.
// numbers are right-aligned (conventional), booleans are centered (the pill is small),
// everything else is left-aligned.
export function getColumnAlignment(column) {
  if (column.type === "number") {
    return "right";
  }

  if (column.type === "boolean") {
    return "center";
  }

  return "left";
}
