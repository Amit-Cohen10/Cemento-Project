# Reusable React Data Table

Client-side assignment from the PDF: a generic, editable data table built with
plain JavaScript and React (no TypeScript, no table library).

## Run locally

You need Node.js 18 or newer (npm ships with it). If you don't have it:

- **macOS**: `brew install node`
- **Windows / Linux**: install from <https://nodejs.org/en/download>

From the project root:

```bash
npm install   # install dependencies (run once after cloning)
npm run dev   # start the Vite dev server (opens at http://localhost:5173)
npm test      # run the unit tests
npm run build # production build into ./dist
```

Everything the project needs is listed in `package.json`, so a fresh
`git clone` (or unzip) followed by `npm install` gives a working app.

## What the table does

### Required features (from the PDF)

- Renders five column types: `string`, `number`, `boolean`, `select`, `date`.
- Shows / hides columns from a toolbar (a Column Picker).
- Edits cells inline: click a cell, type or pick a value, press `Enter` to
  commit or `Escape` to cancel.
- Tracks unsaved changes locally and saves them with a "Save changes" button
  (or rolls them back with "Cancel"). No backend involved.
- Renders only the rows in the viewport (custom virtualization) so it stays
  smooth with thousands of rows.

### Extra features (the PDF says "You may add any other feature that you want")

- **Click-to-sort** on any column header. Cycle: unsorted → ascending →
  descending → unsorted. Numbers, booleans, dates and strings each use a
  sensible comparator.
- **Global search** across every visible column, case-insensitive.
- **Add row / Delete row**: "+ Add row" button creates an empty row at the
  top; a small `×` on every row deletes it (with confirmation by way of the
  delete-then-save-flow).
- **localStorage persistence**: saved rows and column visibility are
  written to `localStorage` after every change. Refreshing the page keeps
  your edits. Drafts (unsaved cells) are intentionally NOT persisted.
- **Keyboard friendly**: every cell is focusable, Enter opens the editor,
  Escape rolls back, Tab moves between cells.

## Project structure

```
src/
  App.jsx                       Demo page that feeds the table its data
  main.jsx                      React entry point
  styles.css                    All styling
  components/DataTable/
    DataTable.jsx               Main component: toolbar + virtualized body
    TableHeader.jsx             Sticky header row, click-to-sort
    TableRow.jsx                One row + delete button, memoized
    EditableCell.jsx            One cell: read view + matching editor per type
    ColumnPicker.jsx            Show / hide columns toolbar
  hooks/
    useEditableTable.js         Saved rows, drafts, visibility, editingCell,
                                  add/delete row, localStorage hydration
    useVirtualRows.js           React glue around the virtualization math
  utils/
    cellValueUtils.js           format / parse / align cell values (incl. date)
    columnUtils.js              sort / filter / toggle columns
    rowUtils.js                 immutable draft and row operations
    virtualRows.js              pure virtualization math (unit-tested)
    sortUtils.js                cycleSortDirection + sortRows
    filterUtils.js              filterRows (global search)
    storage.js                  localStorage load / save helpers
  data/
    mockTableData.js            @faker-js/faker-based demo data (seeded)
test/
  *.test.js                     node:test unit tests for the helpers
```

## Schema

The table accepts exactly the shape from the PDF:

```js
{
  columns: [
    { id, ordinalNo, title, type, width },
    ...
  ],
  data: [
    { id, [columnId]: value, ... },
    ...
  ]
}
```

### Schema extensions

The PDF allows adding properties to the column schema as long as the reason
is documented. Two were added:

- **`options`** — only on `type: "select"` columns. It tells the editor
  which values the user is allowed to pick. The PDF Q&A says this is up to
  the implementer to design, so the column schema is the most natural place.
- **`format`** — optional hint for `type: "number"` columns. Currently
  supports `"currency"`. Without it, numbers are formatted with thousand
  separators. This lets one numeric column ("Salary") render as USD while
  another ("Tickets") renders as a plain number.

The `type` enum is also extended with `"date"`. The PDF lists
`"string, numbers, boolean, selection list …"` with a trailing ellipsis,
which suggests other types are welcome. `date` uses the native
`<input type="date">` editor and an `Intl.DateTimeFormat` display.

No existing property was removed or had its type changed.

## Performance choices

- **Virtualization**: only the rows currently in the viewport plus a small
  overscan buffer are rendered. The math lives in a pure function
  (`utils/virtualRows.js`) so it can be unit-tested. The hook
  (`hooks/useVirtualRows.js`) hooks up the actual scroll listener.
- **Row lookup as a Map**: `useEditableTable` builds a `Map<rowId, row>`
  with `useMemo`, so each cell edit is O(1) instead of O(n).
- **Memoization**: `TableRow` and `EditableCell` are wrapped in `React.memo`,
  and the callbacks they receive are wrapped in `useCallback`, so editing one
  cell only re-renders the cells that actually changed.
- **CSS variable for row height**: `--row-height` is set once on the table
  wrapper and read by every `td`, so the virtualization math and the CSS
  always agree.
- **Filter → sort → virtualize**: each stage is wrapped in `useMemo`, so a
  pure render with no inputs changing skips all three.

## Tests

`npm test` runs the helper-function unit tests with Node's built-in test
runner (`node --test`). No extra test dependencies needed.

Covered (45 tests total):

- `cellValueUtils`: parse, format, normalizeOptions, getColumnAlignment,
  date round-trip.
- `columnUtils`: sortColumns, getVisibleColumns, toggleColumnId.
- `rowUtils`: updateRowCell, draft set/has/remove, applyDraftChanges,
  countDraftCells.
- `virtualRows`: getVirtualRange across normal, empty and edge inputs.
- `sortUtils`: cycle, asc/desc, numbers / strings / booleans / dates.
- `filterUtils`: empty query, multi-column match, hidden columns, nulls.
- `storage`: round-trip, fallback, bad JSON.
