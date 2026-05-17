/*
 * Demo data for the assignment.
 *
 * The actual rows live in public/seed.json, which is a static file committed
 * to the repo and loaded by the browser at runtime. That keeps the demo data
 * out of the JavaScript bundle while still giving every reviewer the same
 * starting data.
 *
 * Workflow:
 *   1. Edit cells in the browser and click "Save changes" (writes to
 *      localStorage). Add/delete rows are written immediately.
 *   2. Click "Export data" in the toolbar to download the current rows as
 *      a JSON file.
 *   3. Replace public/seed.json with that file, commit, push.
 *   4. Anyone who runs the project after that sees the updated data.
 *
 * If I ever want fresh Faker data, I run `npm run seed:regenerate` which
 * uses scripts/generateSeed.js.
 *
 * The column set covers all four required types plus a bonus "date" type:
 *   - string  (id, name, location, team) -- id is numeric-looking but
 *             stays a string to match the PDF schema
 *   - number  (salary, ticketsClosed)
 *   - boolean (active)
 *   - select  (role, level)
 *   - date    (joinedAt) -- bonus type, see README "Schema extensions".
 */

const roleOptions = ["Frontend", "Backend", "Full Stack", "QA", "Product"];
const levelOptions = ["Junior", "Mid", "Senior", "Lead"];

export const employeeColumns = [
  {
    id: "id",
    ordinalNo: 0,
    title: "ID",
    type: "string",
    sortType: "number",
    width: 130,
    readOnly: true,
  },
  {
    id: "name",
    ordinalNo: 1,
    title: "Name",
    type: "string",
    width: 190,
    required: true,
  },
  {
    id: "role",
    ordinalNo: 2,
    title: "Role",
    type: "select",
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
    format: "currency",
    min: 0,
    max: 1_000_000,
  },
  {
    id: "active",
    ordinalNo: 4,
    title: "Active",
    type: "boolean",
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
    type: "date",
    width: 140,
  },
];
