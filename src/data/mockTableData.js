/*
 * Demo data for the assignment.
 *
 * The PDF Q&A suggests Faker, so I use @faker-js/faker here. I call
 * faker.seed(42) before generating so the data is the same across refreshes,
 * which makes it easier to demo the table and easier to debug.
 *
 * The column set covers all four required types plus a bonus "date" type:
 *   - string  (name, location, team)
 *   - number  (salary, ticketsClosed)
 *   - boolean (active)
 *   - select  (role, level)
 *   - date    (joinedAt) -- bonus type, see README "Schema extensions".
 */

import { faker } from "@faker-js/faker";

const roleOptions = ["Frontend", "Backend", "Full Stack", "QA", "Product"];
const levelOptions = ["Junior", "Mid", "Senior", "Lead"];
const teamOptions = ["Platform", "Growth", "Core Product", "Operations", "Infrastructure"];

export const employeeColumns = [
  {
    id: "name",
    ordinalNo: 1,
    title: "Name",
    type: "string",
    width: 190,
  },
  {
    id: "role",
    ordinalNo: 2,
    title: "Role",
    type: "select",
    width: 160,
    options: roleOptions,
  },
  {
    id: "salary",
    ordinalNo: 3,
    title: "Salary",
    type: "number",
    width: 130,
    format: "currency",
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

// Generate a row using Faker. Seeding happens once outside this function so
// the whole batch shares one deterministic sequence.
function createRow(index) {
  return {
    id: `employee-${index + 1}`,
    name: faker.person.fullName(),
    role: faker.helpers.arrayElement(roleOptions),
    salary: faker.number.int({ min: 60000, max: 200000 }),
    active: faker.datatype.boolean(),
    location: faker.location.city(),
    level: faker.helpers.arrayElement(levelOptions),
    ticketsClosed: faker.number.int({ min: 0, max: 150 }),
    team: faker.helpers.arrayElement(teamOptions),
    joinedAt: faker.date.past({ years: 5 }).toISOString(),
  };
}

// 2,500 rows is enough to feel the difference virtualization makes but still
// loads quickly. Faker also lets the caller request a different size if they
// want to stress test the table.
export function createEmployeeRows(count = 2500) {
  faker.seed(42);
  return Array.from({ length: count }, (_, index) => createRow(index));
}
