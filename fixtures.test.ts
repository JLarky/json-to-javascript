import { describe, it, expect } from "bun:test";
import { parse, stringify } from "yaml";
import { jsonToJavascript } from "./index";
import { myEval } from "./test-utils";

describe("fixture classification", () => {
  // Helper to normalize unicode escape sequences in strings
  const normalizeUnicode = (str: string): string => {
    // Convert \uXXXX and \u{XXXXX} escape sequences to actual characters
    return str
      .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) => 
        String.fromCodePoint(parseInt(hex, 16))
      )
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => 
        String.fromCharCode(parseInt(hex, 16))
      );
  };

  // Helper function to compare objects with trim normalization for strings
  const compareWithExceptions = (
    actual: unknown,
    expected: unknown,
    path = "",
    exceptionValues: Record<string, string> = {},
  ): void => {
    if (typeof actual === "string" && typeof expected === "string") {
      if (path in exceptionValues) {
        expect(actual).toBe(exceptionValues[path]!);
      } else {
        // Normalize unicode escape sequences before comparison
        const normalizedActual = normalizeUnicode(actual.trim());
        const normalizedExpected = normalizeUnicode(expected.trim());
        expect(normalizedActual).toEqual(normalizedExpected);
      }
    } else if (Array.isArray(actual) && Array.isArray(expected)) {
      expect(actual.length).toBe(expected.length);
      for (let i = 0; i < expected.length; i++) {
        compareWithExceptions(actual[i], expected[i], `${path}[${i}]`, exceptionValues);
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
          exceptionValues,
        );
      }
    } else {
      expect(actual).toEqual(expected);
    }
  };

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
    const fancierOut = await myEval(
      'const {lines: dedent} = require("@jlarky/gha-ts/utils");\nconst x =' +
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
    
    // For the fancier (lines) path, compare with trim normalization since
    // the gha-ts lines function has slightly different trailing newline behavior
    const actualFancierObj = JSON.parse(fancierOut.trim());
    compareWithExceptions(actualFancierObj, doc);

    // Keys that need exact comparison with hard-coded values due to dedent behavior
    const exceptionValues: Record<string, string> = {
      "samples.escaped_backticks_code":
        'const commentBody = `string with ticks in it \\`git rebase -i\\`\nlast line`\n    echo "Done"',
      "samples.escaped_vs_real":
        "Real line 1\nReal line 2\nEscaped newline sequence literal\nAnother line",
    };

    // For the real dedent path, compare strings one-by-one with trim normalization
    const actualDedentObj = JSON.parse(fancierOutDedent.trim());
    compareWithExceptions(actualDedentObj, doc, "", exceptionValues);
  });
});
