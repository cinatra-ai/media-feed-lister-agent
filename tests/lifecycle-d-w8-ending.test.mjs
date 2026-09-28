// Lifecycle D W8 — the media feed lister agent's plain-language ending
// (cinatra#3096 items 16 and 19).
//
// (19) A run that ends closes with a plain sentence — how many episodes were
// listed, that none were found for the count and the dates the person set, or
// why none could be listed — never with a bare failure code or an empty list.
// Every failure code the listing step names reaches a sentence, so a new code
// added to the step without a sentence fails this suite.
//
// (16) The count and the window stay fields the person sets.
//
// The last two arms re-state the runtime loader's two mount rules over this
// flow, as cinatra-ai/email-recipient-selection-agent holds them in its own
// suite: (A) every input a step requires has a source on every path that
// reaches it, and (B) an OutputMessageNode declares only inputs its template
// reads.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const oas = JSON.parse(readFileSync(path.join(root, "cinatra/oas.json"), "utf8"));

const refs = oas.$referenced_components;
const nodesOfType = (type) => Object.values(refs).filter((n) => n.component_type === type);
const startNode = () => {
  const [start] = nodesOfType("StartNode");
  assert.ok(start, "the flow has no start node");
  return start;
};
const controlEdges = (oas.control_flow_connections ?? []).map((e) => ({
  from: e.from_node.$component_ref,
  to: e.to_node.$component_ref,
  branch: e.from_branch,
}));
const hasEdge = (from, to) => controlEdges.some((e) => e.from === from && e.to === to);
const dataEdges = (oas.data_flow_connections ?? []).map((e) => [
  e.source_node.$component_ref + "." + e.source_output,
  e.destination_node.$component_ref + "." + e.destination_input,
]);
const countDataEdges = (from, to) => dataEdges.filter(([f, t]) => f === from && t === to).length;
const outsideComment = (message) => String(message ?? "").replace(/\{#[\s\S]*?#\}/g, "");

const ENDING =
  "{# pyagentspec-input-hint (do not remove): {{ episodes }} {{ failureCode }} {{ sourceTitle }} #}" +
  "{% if failureCode == 'UNSUPPORTED_URL' or failureCode == 'MEDIA_FEED_YOUTUBE_INVALID_URL' or failureCode == 'MEDIA_FEED_PODCAST_INVALID_URL' %}" +
  "No episodes were listed: the address is not a YouTube channel or a podcast website this agent can read." +
  "{% elif failureCode == 'MEDIA_FEED_YOUTUBE_KEY_MISSING' or failureCode == 'MEDIA_FEED_YOUTUBE_AUTH' %}" +
  "No episodes were listed: the YouTube connection is not set up or was refused, so the channel could not be read." +
  "{% elif failureCode == 'MEDIA_FEED_YOUTUBE_QUOTA' %}" +
  "No episodes were listed: the YouTube connection has used up its daily allowance, so try again later." +
  "{% elif failureCode == 'MEDIA_FEED_PODCAST_NO_FEED' %}" +
  "No episodes were listed: no podcast feed was found on that website." +
  "{% elif failureCode %}" +
  "No episodes were listed: the channel or the feed could not be read." +
  "{% elif not episodes %}" +
  "No episodes were found at this address for the count and the dates you set." +
  "{% elif episodes | length == 1 %}" +
  "One episode was listed{% if sourceTitle %} from {{ sourceTitle }}{% endif %}." +
  "{% else %}" +
  "{{ episodes | length }} episodes were listed{% if sourceTitle %} from {{ sourceTitle }}{% endif %}." +
  "{% endif %}";

const LISTING_CODES = [
  "UNSUPPORTED_URL",
  "MEDIA_FEED_YOUTUBE_KEY_MISSING",
  "MEDIA_FEED_YOUTUBE_AUTH",
  "MEDIA_FEED_YOUTUBE_QUOTA",
  "MEDIA_FEED_YOUTUBE_FETCH",
  "MEDIA_FEED_YOUTUBE_INVALID_URL",
  "MEDIA_FEED_YOUTUBE_NO_CHANNEL",
  "MEDIA_FEED_PODCAST_INVALID_URL",
  "MEDIA_FEED_PODCAST_FETCH",
  "MEDIA_FEED_PODCAST_NO_FEED",
  "MEDIA_FEED_PODCAST_PARSE",
];

// ---------------------------------------------------------------------------
// (19) a plain-language ending on an empty or failed listing
// ---------------------------------------------------------------------------

test("(19) the run ends in plain language, never in the envelope", () => {
  const summary = refs.feed_summary;
  assert.ok(summary, "the run has no closing statement");
  assert.equal(summary.component_type, "OutputMessageNode");
  assert.ok(oas.nodes.some((n) => n.$component_ref === "feed_summary"), "the closing statement is not a step of the flow");
  assert.ok(hasEdge("list", "feed_summary"), "the listing step does not pass the closing statement");
  assert.ok(hasEdge("feed_summary", "end"), "the closing statement does not lead to the end");
  assert.ok(!hasEdge("list", "end"), "the run still jumps straight to its end");
  assert.deepEqual(
    refs.end.outputs.map((o) => o.title),
    ["sourceTitle", "sourceUrl", "detectedType", "episodes", "failureCode"],
    "the end node no longer carries the values the run hands on",
  );
});

test("(19) an empty, failed or listed run ends in plain language", () => {
  const summary = refs.feed_summary;
  assert.ok(summary, "the run has no closing statement");
  const message = String(summary.message ?? "");
  assert.equal(message, ENDING, "each outcome does not reach its own sentence: failed, empty, one listed, several listed");
  assert.match(message, /no episodes were found/i, "an empty feed has no plain-language ending");
  assert.match(message, /no episodes were listed/i, "a failed listing has no plain-language ending");
  assert.match(message, /episodes were listed/i, "a listed feed has no plain-language ending");
  const rendered = outsideComment(message);
  assert.match(rendered, /\bepisodes\b/, "the sentence never reads the episodes");
  assert.match(rendered, /\bfailureCode\b/, "the sentence never reads the failure code");
  assert.match(rendered, /\bsourceTitle\b/, "the sentence never reads the source title");
  assert.equal(summary.metadata?.cinatra?.purpose, "plain-language-feed-listing-ending");
  assert.deepEqual(summary.inputs, [
    { title: "episodes", type: "array", default: [] },
    { title: "failureCode", type: "string", default: "" },
    { title: "sourceTitle", type: "string", default: "" },
  ]);
  assert.equal(countDataEdges("list.episodes", "feed_summary.episodes"), 1);
  assert.equal(countDataEdges("list.failureCode", "feed_summary.failureCode"), 1);
  assert.equal(countDataEdges("list.sourceTitle", "feed_summary.sourceTitle"), 1);
});

test("(19) every failure code the listing step names reaches a plain sentence", () => {
  const summary = refs.feed_summary;
  assert.ok(summary, "the run has no closing statement");
  const system = String(refs.list.data.system ?? "");
  const named = [...new Set(system.match(/\b(?:MEDIA_FEED_[A-Z_]+|UNSUPPORTED_URL)\b/g) ?? [])].sort();
  assert.deepEqual(
    named,
    [...LISTING_CODES].sort(),
    "the listing step names a failure code the closing statement was not written for",
  );
  const message = String(summary.message ?? "");
  const explicit = [...message.matchAll(/failureCode == '([A-Z_]+)'/g)].map((m) => m[1]);
  assert.ok(explicit.length > 0, "the closing statement names no failure code");
  for (const code of explicit) {
    assert.ok(LISTING_CODES.includes(code), `the closing statement names ${code}, which the listing step never returns`);
  }
  const fallback = message.indexOf("{% elif failureCode %}");
  const empty = message.indexOf("{% elif not episodes %}");
  assert.ok(fallback >= 0, "a failure code without its own sentence has no fallback sentence");
  assert.ok(empty >= 0, "an empty feed has no sentence of its own");
  assert.ok(fallback < empty, "a failed listing would read as an empty feed");
  assert.doesNotMatch(outsideComment(message), /\{\{\s*failureCode\s*\}\}/, "the closing statement prints the bare failure code");
});

// ---------------------------------------------------------------------------
// (16) the count and the window stay fields the person sets
// ---------------------------------------------------------------------------

test("(16) the count and the window stay fields the person sets", () => {
  const meta = startNode().metadata?.cinatra ?? {};
  assert.deepEqual(meta.required, ["url", "latestCount", "filterMode", "dateFrom", "dateTo"]);
  assert.deepEqual(meta.hidden, ["source"]);
});

// ---------------------------------------------------------------------------
// (A) every required step input has a source on every path that reaches it
// ---------------------------------------------------------------------------

/** The inputs a node CONSUMES: an EndNode names them under `outputs`, every
 *  other node declares `inputs`. */
function consumedInputs(node) {
  if (node.component_type === "EndNode") return node.outputs ?? [];
  return node.inputs ?? [];
}

/** Walk the flow the way the runtime loader does, returning each input it
 *  would demand from the StartStep. */
function unsourcedInputs() {
  const steps = new Map();
  for (const ref of oas.nodes ?? []) steps.set(ref.$component_ref, refs[ref.$component_ref]);
  const beginId = oas.start_node.$component_ref;
  const startTitles = new Set((steps.get(beginId)?.inputs ?? []).map((i) => i.title));
  const flowDataEdges = (oas.data_flow_connections ?? []).map((e) => ({
    from: e.source_node.$component_ref,
    key: `${e.destination_node.$component_ref}.${e.destination_input}`,
  }));
  const successors = (id) => controlEdges.filter((e) => e.from === id).map((e) => e.to);

  const violations = [];
  const visited = new Map();
  const queue = [[beginId, new Set()]];
  while (queue.length > 0) {
    const [id, incoming] = queue.pop();
    let produced = incoming;
    if (visited.has(id)) {
      const seen = visited.get(id);
      if ([...seen].every((k) => produced.has(k))) continue;
      produced = new Set([...produced].filter((k) => seen.has(k)));
    }
    visited.set(id, produced);

    const node = steps.get(id);
    if (!node) continue;
    if (id !== beginId) {
      for (const descriptor of consumedInputs(node)) {
        const key = `${id}.${descriptor.title}`;
        if (produced.has(key)) continue;
        if (Object.hasOwn(descriptor, "default")) continue;
        if (startTitles.has(descriptor.title)) continue;
        violations.push(key);
      }
    }

    const next = new Set(produced);
    for (const edge of flowDataEdges) if (edge.from === id) next.add(edge.key);
    for (const child of successors(id)) queue.push([child, new Set(next)]);
  }
  return violations;
}

test("every required step input has a source on every path that reaches it", () => {
  const found = unsourcedInputs();
  assert.deepEqual(
    found,
    [],
    "the runtime refuses to mount a flow whose step requires an input the StartStep does not carry: " + found.join(", "),
  );
});

// ---------------------------------------------------------------------------
// (B) an OutputMessageNode declares only inputs its template reads
// ---------------------------------------------------------------------------

test("an output message declares only inputs its template reads", () => {
  const offenders = [];
  for (const node of nodesOfType("OutputMessageNode")) {
    const rendered = outsideComment(node.message);
    for (const { title } of node.inputs ?? []) {
      if (!new RegExp(`\\b${title}\\b`).test(rendered)) offenders.push(`${node.id}.${title}`);
    }
  }
  assert.deepEqual(offenders, [], "the runtime rejects an input the template never reads: " + offenders.join(", "));
});
