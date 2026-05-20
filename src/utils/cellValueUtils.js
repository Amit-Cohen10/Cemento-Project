const currencyAmountFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

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

    const matchingOption = normalizeOptions(column.options).find(
      (option) => String(option.value) === String(rawValue),
    );
    return matchingOption ? matchingOption.value : rawValue;
  }

  if (column.type === "date") {

    if (!rawValue) {
      return null;
    }
    const parsed = new Date(rawValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  return String(rawValue ?? "");
}

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

export function getColumnAlignment(column) {
  if (column.type === "number") {
    return "right";
  }

  if (column.type === "boolean") {
    return "center";
  }

  return "left";
}
