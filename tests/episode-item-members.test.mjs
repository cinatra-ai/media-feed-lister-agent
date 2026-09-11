// Issue #40 — the bridge output `episodes` declares its item members.
// The runtime sends an object level with no declared members CLOSED and EMPTY,
// so an answer carries nothing inside it. The members below are the ones the
// node's own system prompt spells out for both branches (YouTube and podcast)
// and the ones the downstream transcript agent reads.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const oas = JSON.parse(readFileSync(path.join(root, "cinatra/oas.json"), "utf8"));

const MEMBERS = [
  "id",
  "title",
  "link",
  "mediaUrl",
  "description",
  "publishedAt",
  "duration",
];

function episodesOutput(outputs) {
  const found = (outputs ?? []).find((o) => o?.title === "episodes");
  assert.ok(found, "no `episodes` output on this outputs list");
  return found;
}

function itemMembers(output, where) {
  const items = output.items ?? output.json_schema?.items;
  assert.ok(items && typeof items === "object" && !Array.isArray(items), `${where}: episodes declares no items schema`);
  const members = items.properties ?? items.json_schema?.properties;
  assert.ok(
    members && typeof members === "object" && Object.keys(members).length > 0,
    `${where}: episodes[] declares no members — the request is sent closed and empty there`,
  );
  return members;
}

const sites = [
  ["the flow's own outputs", () => episodesOutput(oas.outputs)],
  ["the bridge ApiNode `list`", () => episodesOutput(oas.$referenced_components.list.outputs)],
  ["the EndNode `end`", () => episodesOutput(oas.$referenced_components.end.outputs)],
];

for (const [where, pick] of sites) {
  test(`${where}: episodes[] declares its item members`, () => {
    const members = itemMembers(pick(), where);
    for (const member of MEMBERS) {
      assert.ok(member in members, `${where}: episodes[] does not declare \`${member}\``);
      assert.equal(members[member].type, "string", `${where}: episodes[].${member} is not declared a string`);
    }
    assert.deepEqual(
      Object.keys(members).sort(),
      [...MEMBERS].sort(),
      `${where}: episodes[] declares members the system prompt does not name`,
    );
  });
}
