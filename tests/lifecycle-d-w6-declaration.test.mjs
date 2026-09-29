// Lifecycle D W6 — this agent's declared state, asserted on the shipped
// manifest and the shipped service description.
//
// The declaration key: a dependency is a required `kind: "artifact"` entry in
// `cinatra.dependencies`; produces is `cinatra.produces` on the manifest, which
// is the only authority the host compiler reads; a binding is an end-node
// output's `cinatra.artifact` block. A produces mirror carried in the service
// description is optional, and when present must agree entry for entry with the
// manifest — the compiler refuses a mirror that disagrees.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const oas = JSON.parse(readFileSync(join(root, "cinatra/oas.json"), "utf8"));
const cinatra = pkg.cinatra ?? {};
const components = oas.$referenced_components ?? {};

const artifactDependencies = (cinatra.dependencies ?? []).filter(
  (d) => d.kind === "artifact",
);
const bindings = [];
for (const [id, comp] of Object.entries(components)) {
  if (comp?.component_type !== "EndNode") continue;
  for (const out of comp.outputs ?? []) {
    const binding = out?.cinatra?.artifact;
    if (binding) bindings.push({ node: id, output: out.title, binding });
  }
}
function approvalNodes(value, found = []) {
  if (Array.isArray(value)) {
    for (const v of value) approvalNodes(v, found);
  } else if (value && typeof value === "object") {
    if (value.metadata?.cinatra?.requiresApproval === true) found.push(value.id ?? "(anonymous)");
    for (const v of Object.values(value)) approvalNodes(v, found);
  }
  return found;
}
function startMeta() {
  for (const comp of Object.values(components)) {
    if (comp?.component_type === "StartNode") return comp;
  }
  throw new Error("no StartNode");
}

test("the produces mirror agrees with the manifest, entry for entry", () => {
  const mirror = oas.metadata?.cinatra?.produces;
  if (mirror === undefined) return;
  assert.deepEqual(mirror, cinatra.produces ?? []);
});

test("no start-node input is listed as both required and hidden", () => {
  const meta = startMeta().metadata?.cinatra ?? {};
  const hidden = new Set(meta.hidden ?? []);
  assert.deepEqual((meta.required ?? []).filter((t) => hidden.has(t)), []);
});

test("the manifest claims a gate only when the flow has one", () => {
  const claimed = cinatra.hasApprovalGates === true;
  const real = approvalNodes(oas).length > 0;
  if (claimed) assert.equal(real, true);
});

// ---------------------------------------------------------------------------
// 6c — the episode kind.
//
// The plan's shape for this agent is three parts: the dependency edge on the
// episode extension, a typed produces entry, and a FAN-OUT binding over
// `episodes` filing one artifact per member with the episode's data as the
// agent emits it and the title from the episode's title.
//
// The three parts travel together: the host's member-field fan-out files each
// episode object as its own artifact, and the episode extension is pinned in
// the development extension lock, so the required edge resolves on an
// installation that carries this agent.
//
// This repository's own vendored gate still reads the older single-value
// binding grammar: it names the fan-out block in two warnings, which do not
// fail the kind check.
// ---------------------------------------------------------------------------

const EPISODES = "@cinatra-ai/podcast-artifacts";

test("6c — the episode extension is a required artifact edge", () => {
  const edge = artifactDependencies.find((d) => d.packageName === EPISODES);
  assert.ok(edge, EPISODES + " is not an artifact edge of this agent");
  assert.equal(edge.requirement, "required");
  assert.equal(edge.edgeType, "runtime");
});

test("6c — the episodes output is the one a fan-out binding will name", () => {
  const end = Object.values(components).find((c) => c?.component_type === "EndNode");
  const episodes = (end.outputs ?? []).find((o) => o.title === "episodes");
  assert.ok(episodes, "the end node no longer carries an episodes output");
  assert.equal(episodes.type, "array");
});

test("6c — the typed produces entry and the one fan-out binding stand together", () => {
  assert.deepEqual(cinatra.produces, [
    { extension: EPISODES, objectTypeId: EPISODES + ":artifact" },
  ]);
  assert.equal(oas.metadata?.cinatra?.produces, undefined);
  assert.deepEqual(
    bindings.map((b) => [b.node, b.output, b.binding.extension, b.binding.fanOut?.titleFrom]),
    [["end", "episodes", EPISODES, "member-field"]],
  );
});
