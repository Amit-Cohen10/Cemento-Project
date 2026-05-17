/**
 * Mock data for the assignment.
 * No faker dependency is used so the project stays easy to run and understand.
 */

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
    width: 170,
    options: ["Frontend", "Backend", "Full Stack", "QA", "Product"],
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
    width: 110,
  },
  {
    id: "location",
    ordinalNo: 5,
    title: "Location",
    type: "string",
    width: 160,
  },
  {
    id: "level",
    ordinalNo: 6,
    title: "Level",
    type: "select",
    width: 130,
    options: ["Junior", "Mid", "Senior", "Lead"],
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
];

const firstNames = [
  "Amit",
  "Maya",
  "Noa",
  "Daniel",
  "Lior",
  "Tamar",
  "Eyal",
  "Dana",
  "Roni",
  "Shira",
];

const lastNames = [
  "Cohen",
  "Levi",
  "Mizrahi",
  "Azoulay",
  "Biton",
  "Friedman",
  "Shani",
  "Mor",
  "Bar",
  "Katz",
];

const locations = ["Tel Aviv", "Jerusalem", "Haifa", "Beer Sheva", "Herzliya"];
const teams = ["Platform", "Growth", "Core Product", "Operations", "Infrastructure"];
const roles = ["Frontend", "Backend", "Full Stack", "QA", "Product"];
const levels = ["Junior", "Mid", "Senior", "Lead"];

function pickValue(values, index, step = 1) {
  return values[(index * step) % values.length];
}

// Creates a predictable large data set.
// Predictable data is useful in interviews because it is easy to explain and debug.
export function createEmployeeRows(count = 2500) {
  return Array.from({ length: count }, (_, index) => {
    const rowNumber = index + 1;

    return {
      id: `employee-${rowNumber}`,
      name: `${pickValue(firstNames, index)} ${pickValue(lastNames, index, 3)}`,
      role: pickValue(roles, index, 2),
      salary: 65000 + ((index * 1375) % 70000),
      active: index % 5 !== 0,
      location: pickValue(locations, index, 4),
      level: pickValue(levels, index, 3),
      ticketsClosed: 8 + ((index * 7) % 140),
      team: pickValue(teams, index, 2),
    };
  });
}
