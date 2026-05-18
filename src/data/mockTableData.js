// this file defines the shape of the table — what columns exist, their types, and their rules.
// the actual row data (the employees) lives in public/seed.json, not here.
// this file is used by App.jsx, which passes employeeColumns to DataTable.
//
// each column object can have:
//   id         - the key used to look up the value on each row object
//   ordinalNo  - the display order (0 = leftmost)
//   title      - the header label the user sees
//   type       - how the cell behaves: "string", "number", "boolean", "select", or "date"
//   width      - the default column width in pixels
//   readOnly   - if true, the user cannot edit this cell
//   required   - if true, the cell cannot be left empty
//   options    - list of choices for "select" columns
//   format     - optional display hint (e.g. "currency" formats a number with a $ sign)
//   min / max  - allowed range for number columns
//   sortType   - override the sort behavior (e.g. the id column looks like a number even though it is stored as a string)

const roleOptions = ["Frontend", "Backend", "Full Stack", "QA", "Product"];
const levelOptions = ["Junior", "Mid", "Senior", "Lead"];

export const employeeColumns = [
  {
    id: "id",
    ordinalNo: 0,
    title: "ID",
    type: "string",
    sortType: "number", // sort numerically even though the value is stored as a string
    width: 130,
    readOnly: true,    // the user cannot change the id
  },
  {
    id: "name",
    ordinalNo: 1,
    title: "Name",
    type: "string",
    width: 190,
    required: true,    // name must not be left empty
  },
  {
    id: "role",
    ordinalNo: 2,
    title: "Role",
    type: "select",    // renders as a dropdown with fixed choices
    width: 160,
    options: roleOptions,
    required: true,
  },
  {
    id: "salary",
    ordinalNo: 3,
    title: "Salary",
    type: "number",
    width: 130,
    format: "currency", // displayed as "120,000$"
    min: 0,
    max: 1_000_000,
  },
  {
    id: "active",
    ordinalNo: 4,
    title: "Active",
    type: "boolean",   // renders as a Yes/No pill
    width: 100,
  },
  {
    id: "location",
    ordinalNo: 5,
    title: "Location",
    type: "string",
    width: 150,
  },
  {
    id: "level",
    ordinalNo: 6,
    title: "Level",
    type: "select",
    width: 120,
    options: levelOptions,
  },
  {
    id: "ticketsClosed",
    ordinalNo: 7,
    title: "Tickets",
    type: "number",
    width: 110,
    min: 0,
  },
  {
    id: "team",
    ordinalNo: 8,
    title: "Team",
    type: "string",
    width: 160,
  },
  {
    id: "joinedAt",
    ordinalNo: 9,
    title: "Joined",
    type: "date",      // renders as a formatted date and edits with a date picker
    width: 140,
  },
];
