// W8 (cinatra#3096) item 16 — the feed lister's count and window as fields the person sets.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const oas = JSON.parse(readFileSync(path.join(root, "cinatra/oas.json"), "utf8"));
const start = oas.$referenced_components.start;

test("(16) the count and the window are fields the person sets", () => {
  const hidden = start.metadata.cinatra.hidden ?? [];
  for (const field of ["latestCount", "filterMode", "dateFrom", "dateTo"]) {
    assert.ok(!hidden.includes(field), `${field} is still hidden from the person`);
    const declared = start.inputs.find((i) => i.title === field);
    assert.ok(declared, `the form does not carry ${field}`);
    assert.ok(declared.description, `${field} is shown without saying what it does`);
    assert.notEqual(declared.default, undefined, `${field} has no default, so a run cannot omit it`);
  }
});

test("(16) the address stays the only thing the run insists on", () => {
  assert.deepEqual(start.metadata.cinatra.required, ["url"]);
});
