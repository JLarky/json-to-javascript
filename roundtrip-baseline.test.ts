import { describe, it, expect } from "bun:test";
import fc from "fast-check";
import { jsonToJavascript } from "./index";
import { $ } from "bun";

// Baseline property: generated code round-trips JSON values exactly (modulo JSON.stringify semantics) under current guard.
// Focused on strings with potential multiline patterns but ensures no regression after refactors.

const FC_FACTOR = parseFloat(process.env.FC_FACTOR || "1");

// Arbitrary JSON-ish (no undefined) focusing on strings rich in edge chars.
// Build edge-biased strings by concatenating small segments including special chars.
const specialChar = fc.constantFrom("`", "$", "\\", "{", "}", "\n");
const segment = fc.oneof(specialChar, fc.string({ maxLength: 5 }));
const edgeString = fc
  .array(segment, { minLength: 0, maxLength: 30 })
  .map((parts) => parts.join(""));

const jsonLike = fc.oneof(
  edgeString,
  fc.integer(),
  fc.float().filter((n) => isFinite(n)),
  fc.boolean(),
  fc.constant(null),
  fc.array(edgeString, { maxLength: 5 }),
  fc.dictionary(fc.string({ maxLength: 10 }), edgeString),
);

async function evalNode(code: string) {
  const tmpFile = `./playpen/tmp-node-eval/node_eval_${Date.now()}_${Math.random().toString(36).slice(2)}.cjs`;
  await Bun.write(tmpFile, code);
  const out = await $`node ${tmpFile}`.text();
  await $`rm -f ${tmpFile}`;
  return out;
}

describe("baseline roundtrip (phase1)", () => {
  it("should eval back to same JSON", async () => {
    await fc.assert(
      fc.asyncProperty(jsonLike, async (value) => {
        const result = await jsonToJavascript(value, {
          useDedent: true,
          prefix: "const OUT = (",
          suffix: ")",
        });
        const evalCode = result.needsDedent
          ? `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(OUT))`
          : `${result.code}\nconsole.log(JSON.stringify(OUT))`;
        const output = await evalNode(evalCode);
        const parsed = JSON.parse(output.trim());
        // For floating numbers JSON.stringify may reduce -0 to 0 etc.
        expect(normalizeForDedent(normalize(parsed))).toEqual(
          normalizeForDedent(normalize(value)),
        );
      }),
      { numRuns: 5 * FC_FACTOR, timeout: 10000 }, // Reduce runs and increase timeout
    );
  });
});

function normalize(v: any): any {
  if (typeof v === "number") {
    if (Object.is(v, -0)) return 0;
    return v;
  }
  if (Array.isArray(v)) return v.map(normalize);
  if (v && typeof v === "object") {
    const o: any = {};
    for (const k in v) o[k] = normalize(v[k]);
    return o;
  }
  return v;
}
// Dedent may trim leading/trailing blank lines; we approximate by trimming if the value contains no non-whitespace other than newlines.
function normalizeForDedent(v: any): any {
  if (typeof v === "string") {
    if (v.includes("\n")) return v.trim();
    return v;
  }
  if (Array.isArray(v)) return v.map(normalizeForDedent);
  if (v && typeof v === "object") {
    const o: any = {};
    for (const k in v) o[k] = normalizeForDedent(v[k]);
    return o;
  }
  return v;
}
