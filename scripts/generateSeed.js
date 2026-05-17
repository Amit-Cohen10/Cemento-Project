/*
 * Generates the initial seed.json for the data table.
 *
 * Run with: npm run seed:regenerate
 *
 * The PDF Q&A recommends Faker, so I use it here to build a realistic data
 * set without writing each row by hand. The output gets committed to git as
 * src/data/seed.json, so anyone who clones the repo sees the same demo
 * data on first load.
 *
 * After the user has edited the table in the browser and clicks the
 * "Export data" button, they get a downloaded JSON that they can drop in
 * here to replace the seed.
 */

import { faker } from "@faker-js/faker";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROW_COUNT = 2500;
const SEED_VALUE = 42;

const here = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(here, "../src/data/seed.json");

const roleOptions = ["Frontend", "Backend", "Full Stack", "QA", "Product"];
const levelOptions = ["Junior", "Mid", "Senior", "Lead"];
const teamOptions = ["Platform", "Growth", "Core Product", "Operations", "Infrastructure"];

// Same seed every run, so the data set is reproducible. This makes the file
// diff-friendly and lets the user trust that "regenerate" gives the same
// result if no code changed.
faker.seed(SEED_VALUE);

const rows = Array.from({ length: ROW_COUNT }, (_, index) => ({
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
}));

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(rows, null, 2));

console.log(`Wrote ${rows.length.toLocaleString()} rows to ${outputPath}`);
