import { faker } from "@faker-js/faker";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROW_COUNT = 2500;
const SEED_VALUE = 42;

const here = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(here, "../public/seed.json");

const roleOptions = ["Frontend", "Backend", "Full Stack", "QA", "Product"];
const levelOptions = ["Junior", "Mid", "Senior", "Lead"];
const teamOptions = ["Platform", "Growth", "Core Product", "Operations", "Infrastructure"];

faker.seed(SEED_VALUE);

const rows = Array.from({ length: ROW_COUNT }, (_, index) => ({
  id: String(index + 1),
  name: faker.person.fullName(),
  role: faker.helpers.arrayElement(roleOptions),
  salary: faker.number.int({ min: 60000, max: 200000 }),
  active: faker.datatype.boolean(),
  location: faker.location.city(),
  level: faker.helpers.arrayElement(levelOptions),
  ticketsClosed: faker.number.int({ min: 0, max: 150 }),
  team: faker.helpers.arrayElement(teamOptions),
  joinedAt: faker.date.past({ years: 5 }).toISOString(),
}));

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(rows, null, 2));

console.log(`Wrote ${rows.length.toLocaleString()} rows to ${outputPath}`);
