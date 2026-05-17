# Reusable React Data Table

This project implements the client-side assignment from the provided PDF. It is a generic editable data table built with plain JavaScript and React, without TypeScript and without using a table library.

## Features

- Generic table input: `columns` schema plus `data` rows.
- Different renderers and editors for `string`, `number`, `boolean`, and `select` columns.
- Column visibility picker.
- Direct cell editing with local draft state.
- Explicit save and cancel actions.
- Custom row virtualization for large data sets.
- Unit-tested helper functions for row updates, parsing, column filtering, and virtualization.
- Small enough to be realistic for a focused three-day junior assignment.

## Run Locally

Install dependencies and start the Vite dev server:

```bash
npm install
npm run dev
```

Run the unit tests:

```bash
npm test
```

If `npm` is not available on the machine, install Node.js from the official Node.js installer or use another package manager that can install the dependencies from `package.json`.

## Assignment Schema

The table accepts the required assignment shape:

```js
{
  columns: [
    {
      id: "name",
      ordinalNo: 1,
      title: "Name",
      type: "string",
      width: 190,
    },
  ],
  data: [
    {
      id: "employee-1",
      name: "Amit Cohen",
    },
  ],
}
```

The implementation documents two small schema additions:

- `options`: used by `select` columns so the editor knows which values are allowed.
- `format`: used by number columns for display hints such as `currency`.

These additions do not change or remove any required assignment fields.

## Code Structure

- `src/App.jsx`: creates the demo data and renders the table.
- `src/components/DataTable`: reusable table UI components.
- `src/hooks/useEditableTable.js`: local save/cancel/editing state.
- `src/hooks/useVirtualRows.js`: browser scroll state for virtualization.
- `src/utils`: pure helper functions with unit tests.
- `src/data/mockTableData.js`: deterministic large mock data set.
- `docs/hebrew-guide.md`: Hebrew explanation for interview preparation.

## Performance Notes

The table is optimized for large data sets by rendering only the visible rows plus a small overscan buffer. The virtual row calculation is kept in a pure helper so it is easy to test and explain.

React optimization is used where it is helpful:

- `useMemo` for derived columns, widths, rows, and virtual ranges.
- `useCallback` for stable table actions.
- `React.memo` for repeated table rows and cells.

## Static/CDN Fallback Note

The preferred submission is this Vite project. If package installation is temporarily unavailable, a static fallback could be created with React and ReactDOM loaded from a CDN. That fallback is less professional for GitHub submission and depends on network access, so it should only be used for emergency demo purposes.
