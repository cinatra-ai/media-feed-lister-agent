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
// NONE of the three can land today, and this file pins that state with the
// reason, so a later wave cannot add one part without saying why.
//
// The binding: the host binding grammar (`artifactOutputBindingSchema`) is a
// strict single-value schema — one content output, one mime, one title, with no
// member or fan-out concept. A fan-out annotation is REFUSED by the
// compile-time validator and by this repository's own vendored gate, both of
// which mirror that one grammar.
//
// The typed produces entry: a produces entry no materialization road reaches is,
// from this wave on, a refusal at publish rather than an advisory line, so an
// entry landed ahead of the binding that would resolve it would make this
// package unpublishable.
//
// The dependency edge: the episode extension is in NEITHER extension lock, so
// it is absent from a stock instance catalog. A REQUIRED edge on an absent
// package makes the runtime install gate report a missing required dependency
// and the agent stops being runnable — the edge would break a working agent to
// promise a kind nothing yet resolves.
//
// All three parts therefore travel together with the host-side fan-out road and
// the episode extension pinning, neither of which this wave builds.
// ---------------------------------------------------------------------------

const EPISODES = "@cinatra-ai/podcast-artifacts";

test("6c — no edge on the episode extension stands ahead of its pinning", () => {
  assert.equal(
    artifactDependencies.find((d) => d.packageName === EPISODES),
    undefined,
    EPISODES +
      " is in neither extension lock: a required edge on it would make this " +
      "agent report a missing required dependency and stop being runnable",
  );
});

test("6c — the episodes output is the one a fan-out binding will name", () => {
  const end = Object.values(components).find((c) => c?.component_type === "EndNode");
  const episodes = (end.outputs ?? []).find((o) => o.title === "episodes");
  assert.ok(episodes, "the end node no longer carries an episodes output");
  assert.equal(episodes.type, "array");
});

test("6c — no produces entry and no binding stand ahead of the fan-out road", () => {
  assert.equal(cinatra.produces, undefined);
  assert.equal(oas.metadata?.cinatra?.produces, undefined);
  assert.deepEqual(bindings, []);
});
