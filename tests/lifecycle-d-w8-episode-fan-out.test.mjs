// Lifecycle D W8 (cinatra#3096) item 16 — each listed episode is filed as its
// own artifact.
//
// The end node's `episodes` list carries a member-field fan-out binding: the
// host files every episode object unchanged as its own JSON body of the
// episode kind, titled from that episode's own `title`. The manifest declares
// the kind it produces and requires the extension that registers it, so an
// installation of this agent always carries the episode kind.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const oas = JSON.parse(readFileSync(path.join(root, "cinatra/oas.json"), "utf8"));
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

const EPISODES = "@cinatra-ai/podcast-artifacts";
const EPISODE_TYPE = "@cinatra-ai/podcast-artifacts:artifact";
const BINDING = {
  extension: EPISODES,
  contentFrom: "episodes",
  declaredMime: "application/json",
  fanOut: { mode: "member", titleFrom: "member-field", titleField: "title" },
};

const refs = oas.$referenced_components;
const endNodes = Object.entries(refs).filter(([, c]) => c?.component_type === "EndNode");
const bindings = [];
for (const [id, end] of endNodes) {
  for (const out of end.outputs ?? []) {
    if (out?.cinatra?.artifact) bindings.push({ node: id, output: out.title, binding: out.cinatra.artifact });
  }
}

test("(16) the end node files each listed episode as its own artifact", () => {
  assert.deepEqual(bindings, [{ node: "end", output: "episodes", binding: BINDING }]);
});

test("(16) the binding fans out a declared list of episode objects titled from a declared string", () => {
  const episodes = refs.end.outputs.find((o) => o.title === "episodes");
  assert.equal(episodes.type, "array");
  assert.equal(episodes.cinatra?.artifact?.contentFrom, episodes.title);
  const items = episodes.json_schema.items;
  assert.equal(items.type, "object");
  assert.equal(items.properties[BINDING.fanOut.titleField].type, "string");
  assert.equal(episodes.cinatra.artifact.titleFrom, undefined);
  assert.equal(episodes.cinatra.artifact.mimeFrom, undefined);
});

test("(16) the manifest produces the episode kind and requires the extension that registers it", () => {
  assert.deepEqual(pkg.cinatra.produces, [{ extension: EPISODES, objectTypeId: EPISODE_TYPE }]);
  const edges = (pkg.cinatra.dependencies ?? []).filter((d) => d.packageName === EPISODES);
  assert.deepEqual(edges, [
    {
      packageName: EPISODES,
      edgeType: "runtime",
      versionConstraint: { kind: "semver-range", range: "^0.1.0" },
      requirement: "required",
      kind: "artifact",
    },
  ]);
});
