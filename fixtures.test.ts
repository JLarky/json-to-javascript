import { describe, it, expect } from "bun:test";
import { parse, stringify } from "yaml";
import { jsonToJavascript } from "./index";
import { myEval } from "./test-utils";

describe("fixture classification", () => {
  it("classifies workflow-cases samples", async () => {
    const raw = await Bun.file("./fixtures/workflow-cases.yml").text();
    const doc = parse(raw);
    await Bun.write("./fixtures/workflow-cases-output.yml", stringify(doc));
    const jsonDoc = JSON.stringify(doc, null, 2);
    await Bun.write("./fixtures/workflow-cases-output.json", jsonDoc);
    const output = await jsonToJavascript(doc);
    await Bun.write("./fixtures/workflow-cases-output.js", output.code);
    const out = await myEval(
      "const x =" + output.code + "console.log(JSON.stringify(x, null, 2))",
    );
    await Bun.write("./fixtures/workflow-cases-from-js.json", out);
    const fancierOutput = await jsonToJavascript(doc, { useDedent: true });
    await Bun.write(
      "./fixtures/workflow-cases-output-fancier.js",
      fancierOutput.code,
    );
    const linesPath = require.resolve("./lines.ts");
    const fancierOut = await myEval(
      `const {lines: dedent} = require(${JSON.stringify(linesPath)});\nconst x =` +
        fancierOutput.code +
        "console.log(JSON.stringify(x, null, 2))",
    );
    await Bun.write(
      "./fixtures/workflow-cases-from-js-fancier.json",
      fancierOut,
    );

    // Same steps with the real dedent package
    await Bun.write(
      "./fixtures/workflow-cases-output-fancier-dedent.js",
      fancierOutput.code,
    );
    const fancierOutDedent = await myEval(
      'const dedent = require("dedent");\nconst x =' +
        fancierOutput.code +
        "console.log(JSON.stringify(x, null, 2))",
    );
    await Bun.write(
      "./fixtures/workflow-cases-from-js-fancier-dedent.json",
      fancierOutDedent,
    );

    // expects
    expect(out.trimEnd()).toBe(jsonDoc);
    expect(fancierOut.trimEnd()).toBe(jsonDoc);

    // For the real dedent path, compare strings one-by-one with trim normalization
    const actualDedentObj = JSON.parse(fancierOutDedent.trim());
    const expectedObj = doc;

    // Keys that need exact comparison with hard-coded values due to dedent behavior
    const exceptionValues: Record<string, string> = {
      "samples.escaped_backticks_code":
        'const commentBody = `string with ticks in it \\`git rebase -i\\`\nlast line`\n    echo "Done"',
      "samples.escaped_vs_real":
        "Real line 1\nReal line 2\nEscaped newline sequence literal\nAnother line",
    };

    const compareWithExceptions = (
      actual: unknown,
      expected: unknown,
      path = "",
    ): void => {
      if (typeof actual === "string" && typeof expected === "string") {
        if (path in exceptionValues) {
          expect(actual).toBe(exceptionValues[path]!);
        } else {
          expect(actual.trim()).toBe(expected.trim());
        }
      } else if (Array.isArray(actual) && Array.isArray(expected)) {
        expect(actual.length).toBe(expected.length);
        for (let i = 0; i < expected.length; i++) {
          compareWithExceptions(actual[i], expected[i], `${path}[${i}]`);
        }
      } else if (
        actual !== null &&
        expected !== null &&
        typeof actual === "object" &&
        typeof expected === "object"
      ) {
        const aKeys = Object.keys(actual as Record<string, unknown>).sort();
        const eKeys = Object.keys(expected as Record<string, unknown>).sort();
        expect(aKeys).toEqual(eKeys);
        for (const k of eKeys) {
          const nextPath = path ? `${path}.${k}` : k;
          compareWithExceptions(
            (actual as Record<string, unknown>)[k],
            (expected as Record<string, unknown>)[k],
            nextPath,
          );
        }
      } else {
        expect(actual).toEqual(expected);
      }
    };

    compareWithExceptions(actualDedentObj, expectedObj);
  });
});
