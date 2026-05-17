# Reusable React Data Table

Client-side assignment from the PDF: a generic, editable data table built with
plain JavaScript and React (no TypeScript, no table library).

## Run locally

You need Node.js (version 18 or newer) and npm. If you don't have them yet:

- **macOS**: `brew install node`
- **Windows / Linux**: install from <https://nodejs.org/en/download>

Then, from the project root:

```bash
npm install   # install dependencies (run once after cloning)
npm run dev   # start the Vite dev server (open the URL it prints)
npm test      # run the unit tests
npm run build # production build into ./dist
```

That's the whole setup. The project ships with everything it needs in
`package.json`, so a fresh `git clone` + `npm install` + `npm run dev` is all
that's required.

## What the table does

- Renders four column types: `string`, `number`, `boolean`, `select`.
- Shows / hides columns from a toolbar (a Column Picker).
- Edits cells inline: click a cell, type or pick a value, press `Enter` to
  commit or `Escape` to cancel.
- Tracks unsaved changes locally and saves them with a "Save changes" button
  (or rolls them back with "Cancel"). No backend involved.
- Renders only the rows in the viewport (custom virtualization) so it stays
  smooth with thousands of rows.
- Keyboard accessible: every cell is focusable and editable with Enter.

## Project structure

```
src/
  App.jsx                       Demo page that feeds the table its data
  main.jsx                      React entry point
  styles.css                    All styling
  components/DataTable/
    DataTable.jsx               Main component: toolbar + virtualized body
    TableHeader.jsx             Sticky header row
    TableRow.jsx                One row, memoized
    EditableCell.jsx            One cell: read view + matching editor per type
    ColumnPicker.jsx            Show / hide columns toolbar
  hooks/
    useEditableTable.js         Saved rows, drafts, visibility, editingCell
    useVirtualRows.js           React glue around the virtualization math
  utils/
    cellValueUtils.js           format / parse / align cell values
    columnUtils.js              sort / filter / toggle columns
    rowUtils.js                 immutable draft and row operations
    virtualRows.js              pure virtualization math (unit-tested)
  data/
    mockTableData.js            Deterministic 2,500-row demo data set
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

The PDF allows adding properties to the column schema as long as the reason is
documented. Two were added:

- **`options`** — only on `type: "select"` columns. It tells the editor which
  values the user is allowed to pick. The PDF Q&A says this is up to the
  implementer to design, so the column schema is the most natural place.
- **`format`** — optional hint for `type: "number"` columns. Currently
  supports `"currency"`. Without it, numbers are formatted with thousand
  separators. This lets one numeric column ("Salary") render as USD while
  another ("Tickets") renders as a plain number.

No existing property was removed or changed.

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

## Tests

`npm test` runs the helper-function unit tests with Node's built-in test
runner (`node --test`). No extra test dependencies needed.

Covered:

- `cellValueUtils`: parse, format, normalizeOptions, getColumnAlignment.
- `columnUtils`: sortColumns, getVisibleColumns, toggleColumnId.
- `rowUtils`: updateRowCell, draft set/has/remove, applyDraftChanges,
  countDraftCells.
- `virtualRows`: getVirtualRange across normal, empty and edge inputs.
