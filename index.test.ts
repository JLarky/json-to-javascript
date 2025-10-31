import { describe, it, expect } from "bun:test";
import { jsonToJavascript, type Options } from "./index";
import { $ } from "bun";
import fc from "fast-check";

// Configure fast-check iterations from environment variable
// FC_FACTOR=10 means 10x more tests than default
const FC_FACTOR = parseFloat(process.env.FC_FACTOR || "1");

async function convert(input: unknown, options: Options = {}) {
  return await jsonToJavascript(input, {
    useDedent: true,
    prefix: "function x() { const js = (",
    suffix: ");return js}",
    ...options,
  });
}

describe("jsonToJavascript", () => {
  it("should convert simple objects without newlines", async () => {
    const input = { name: "John", age: 30 };
    const result = await convert(input);
    expect(result.needsDedent).toBe(false);
    expect(result.code).toMatchInlineSnapshot(
      `
        "function x() {
          const js = { name: "John", age: 30 };
          return js;
        }
        "
      `,
    );
  });

  it("should replace strings with newlines with MARKER", async () => {
    const input = { text: "Hello\nWorld" };
    const result = await convert(input);
    expect(result.needsDedent).toBe(true);
    expect(result.code).toMatchInlineSnapshot(`
      "function x() {
        const js = { text:  dedent\`
          Hello
          World
        \` };
        return js;
      }
      "
    `);
  });

  it("should handle arrays with mixed content", async () => {
    const input = ["line1", "line1\nline2", 42];
    const result = await convert(input);
    expect(result.needsDedent).toBe(true);
    expect(result.code).toMatchInlineSnapshot(`
      "function x() {
        const js = ["line1",  dedent\`
          line1
          line2
        \`, 42];
        return js;
      }
      "
    `);
  });

  it("should handle nested objects with newlines", async () => {
    const input = {
      outer: {
        inner: "text\nwith\nnewlines",
        normal: "no newlines",
      },
    };
    const result = await convert(input);
    expect(result.needsDedent).toBe(true);
    expect(result.code).toMatchInlineSnapshot(
      `
        "function x() {
          const js = {
            outer: {
              inner:  dedent\`
                text
                with
                newlines
              \`,
              normal: "no newlines",
            },
          };
          return js;
        }
        "
      `,
    );
  });

  it("should preserve non-string values", async () => {
    const input = {
      string: "hello",
      number: 42,
      boolean: true,
      null: null,
      array: [1, 2, 3],
    };
    const result = await convert(input);
    expect(result.needsDedent).toBe(false);
    expect(result.code).toMatchInlineSnapshot(
      `
        "function x() {
          const js = {
            string: "hello",
            number: 42,
            boolean: true,
            null: null,
            array: [1, 2, 3],
          };
          return js;
        }
        "
      `,
    );
  });

  it("should handle empty strings", async () => {
    const input = { empty: "" };
    const result = await convert(input);
    expect(result.needsDedent).toBe(false);
    expect(result.code).toMatchInlineSnapshot(
      `
        "function x() {
          const js = { empty: "" };
          return js;
        }
        "
      `,
    );
  });

  it("should handle strings with only newlines", async () => {
    const input = { text: "\n" };
    const result = await convert(input);
    expect(result.needsDedent).toBe(true);
    expect(result.code).toMatchInlineSnapshot(`
      "function x() {
        const js = { text:  dedent\`
          
          
        \` };
        return js;
      }
      "
    `);
  });

  it("how dedent trims whitespace", async () => {
    const input = { text: "\n\n x \n\n x \n\n" };
    const { evalResult, result } = await roundTripTest(input);
    expect(result).toMatchInlineSnapshot(`
      {
        "code": 
      "console.log({ text:  dedent\`
        
        
         x 
        
         x 
        
        
      \` });
      "
      ,
        "needsDedent": true,
      }
    `);
    expect(evalResult).toMatchInlineSnapshot(`
      "{ text: 'x \\n\\nx' }
      "
    `);
  });

  it("how lines trims whitespace", async () => {
    const input = { text: "\n\n x \n\n x \n\n" };
    const { evalResult, result } = await roundTripTestLines(input);
    expect(result).toMatchInlineSnapshot(`
      {
        "code": 
      "console.log({ text: lines\`
        
        
         x 
        
         x 
        
        
      \` });
      "
      ,
        "needsDedent": true,
      }
    `);
    expect(evalResult).toMatchInlineSnapshot(`
      "{ text: 'x \\n  \\n   x\\n' }
      "
    `);
  });

  it("should handle multiple newline variations", async () => {
    const input = {
      unix: "line1\nline2",
      carriage: "line1\rline2",
      windows: "line1\r\nline2",
    };
    const result = await convert(input);
    expect(result.needsDedent).toBe(true);
    expect(result.code).toMatchInlineSnapshot(
      `
        "function x() {
          const js = {
            unix:  dedent\`
              line1
              line2
            \`,
            carriage: "line1\\rline2",
            windows:  dedent\`
              line1
              line2
            \`,
          };
          return js;
        }
        "
      `,
    );
  });

  it("should handle deeply nested structures", async () => {
    const input = {
      level1: {
        test: "multi\nline\ntext",
        level2: {
          test: "multi\nline\ntext",
          level3: {
            text: "multi\nline\ntext",
          },
        },
      },
    };
    const result = await convert(input);
    expect(result.needsDedent).toBe(true);
    expect(result.code).toMatchInlineSnapshot(
      `
        "function x() {
          const js = {
            level1: {
              test:  dedent\`
                multi
                line
                text
              \`,
              level2: {
                test:  dedent\`
                  multi
                  line
                  text
                \`,
                level3: { text:  dedent\`
                  multi
                  line
                  text
                \` },
              },
            },
          };
          return js;
        }
        "
      `,
    );
  });

  it("should handle random strings correctly", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (randomStr) => {
        const input = { text: randomStr };
        const result = await convert(input);

        // If the string contains newlines, needsDedent should be true
        if (randomStr.includes("\n")) {
          expect(result.needsDedent).toBe(true);
          // The generated code should contain dedent template literal
          expect(result.code).toContain("dedent`");
        } else {
          expect(result.needsDedent).toBe(false);
          // For strings without newlines, verify the code is valid JavaScript
          // by doing a round-trip test
          const evalCode = `${result.code}\nconsole.log(JSON.stringify(x()))`;
          const evalResult = await myEval(evalCode);
          const parsedResult = JSON.parse(evalResult.trim());
          expect(parsedResult.text).toBe(randomStr);
        }
      }),
      { numRuns: 10 * FC_FACTOR },
    );
  });

  it("fc: should round-trip random string objects correctly", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (randomStr) => {
        const input = { text: randomStr };
        const result = await convert(input, {
          prefix: "const obj = (",
          suffix: ")",
        });

        // Evaluate the generated code
        const evalCode = result.needsDedent
          ? `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`
          : `${result.code}\nconsole.log(JSON.stringify(obj))`;

        const evalResult = await myEval(evalCode);
        const parsedResult = JSON.parse(evalResult.trim());

        // The original string should match the result
        expect(parsedResult.text).toBe(randomStr);
      }),
      { numRuns: 10 * FC_FACTOR },
    );
  });

  it("should handle negative zero correctly", async () => {
    // JSON.stringify converts -0 to 0, so roundtrip through JSON loses the sign
    const input = { value: -0 };
    const result = await convert(input, {
      prefix: "const obj = (",
      suffix: ")",
    });

    const evalCode = `${result.code}\nconsole.log(JSON.stringify(obj))`;
    const evalResult = await myEval(evalCode);
    const parsedResult = JSON.parse(evalResult.trim());

    // JSON.stringify(-0) returns "0", so we get +0 back
    expect(parsedResult.value).toBe(0);
    expect(Object.is(parsedResult.value, 0)).toBe(true);
    // The generated code should still work correctly
    expect(typeof parsedResult.value).toBe("number");
  });

  it("should handle strings with special characters", async () => {
    // Test string with backticks, dollar signs, quotes, newlines, backslashes
    const specialString = "` $\"'\n\\";
    const input = { text: specialString };
    const result = await convert(input, {
      prefix: "const obj = (",
      suffix: ")",
    });

    // The generated code should be executable (convert uses useDedent: true by default)
    const evalCode = result.needsDedent
      ? `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`
      : `${result.code}\nconsole.log(JSON.stringify(obj))`;
    const evalResult = await myEval(evalCode);
    const parsedResult = JSON.parse(evalResult.trim());

    // Should roundtrip correctly
    expect(parsedResult.text).toBe(specialString);
  });

  it("should handle strings with special characters including template literal syntax", async () => {
    // Test string that could break template literals: ${} expressions
    const specialString = "` ${test} `";
    const input = { text: specialString };
    const result = await convert(input, {
      useDedent: true,
      prefix: "const obj = (",
      suffix: ")",
    });

    // Should use dedent since it contains newlines might not be in this case, but let's check
    // The generated code should be executable
    const evalCode = result.needsDedent
      ? `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`
      : `${result.code}\nconsole.log(JSON.stringify(obj))`;

    const evalResult = await myEval(evalCode);
    const parsedResult = JSON.parse(evalResult.trim());

    // Should roundtrip correctly
    expect(parsedResult.text).toBe(specialString);
  });

  it("should handle multiline strings with special characters", async () => {
    // Test multiline string with special chars: backticks, $, quotes, newline, backslash
    // Note: strings with backticks won't use dedent to avoid escaping issues
    const specialString = "` $ \" ' \n\\";
    const input = { text: specialString };
    const result = await convert(input, {
      useDedent: true,
      prefix: "const obj = (",
      suffix: ")",
    });

    // Strings with backticks won't use dedent
    expect(result.needsDedent).toBe(false);

    // The generated code should be executable (using regular JSON string escaping)
    const evalCode = `${result.code}\nconsole.log(JSON.stringify(obj))`;
    const evalResult = await myEval(evalCode);
    const parsedResult = JSON.parse(evalResult.trim());

    // Should roundtrip correctly
    expect(parsedResult.text).toBe(specialString);
  });

  it("should handle backslash followed by newline", async () => {
    // Test string with backslash followed by newline: "\\\n"
    const specialString = "\\\n";
    const input = { text: specialString };
    const result = await convert(input, {
      useDedent: true,
      prefix: "const obj = (",
      suffix: ")",
    });

    // The generated code should be executable
    const evalCode = result.needsDedent
      ? `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`
      : `${result.code}\nconsole.log(JSON.stringify(obj))`;

    const evalResult = await myEval(evalCode);
    const parsedResult = JSON.parse(evalResult.trim());

    // Should roundtrip correctly
    // Note: dedent may trim leading/trailing whitespace, so we compare trimmed versions
    if (result.needsDedent) {
      const normalizedExpected = specialString.trim();
      const normalizedResult = parsedResult.text.trim();
      expect(normalizedResult).toBe(normalizedExpected);
    } else {
      expect(parsedResult.text).toBe(specialString);
    }
  });

  describe("fast-check special character tests", () => {
    it("should handle random strings with special characters", async () => {
      // Generate strings that include special characters: backticks, $, quotes, newlines, backslashes
      const specialChars = fc.constantFrom(
        "`",
        "$",
        '"',
        "'",
        "\n",
        "\\",
        "${",
        "`${",
      );
      const stringWithSpecialChars = fc
        .array(
          fc.oneof(fc.string({ minLength: 0, maxLength: 10 }), specialChars),
          { minLength: 1, maxLength: 50 },
        )
        .map((arr) => arr.join(""));

      await fc.assert(
        fc.asyncProperty(stringWithSpecialChars, async (randomStr) => {
          const input = { text: randomStr };
          const result = await convert(input, {
            prefix: "const obj = (",
            suffix: ")",
          });

          // Build executable code
          const evalCode = result.needsDedent
            ? `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`
            : `${result.code}\nconsole.log(JSON.stringify(obj))`;

          // Verify code executes without errors
          const evalResult = await myEval(evalCode);
          const parsedResult = JSON.parse(evalResult.trim());

          // Should roundtrip correctly
          // Note: dedent may trim leading/trailing whitespace, so we compare trimmed versions
          // if dedent was used, otherwise do exact comparison
          // Also, strings with $, `, or \n are excluded from dedent
          if (result.needsDedent) {
            const normalizedExpected = randomStr.trim();
            const normalizedResult = parsedResult.text.trim();
            expect(normalizedResult).toBe(normalizedExpected);
          } else {
            // Strings excluded from dedent (contain $, `, or \n) should match exactly
            expect(parsedResult.text).toBe(randomStr);
          }
        }),
        { numRuns: 10 * FC_FACTOR },
      );
    });

    it("should handle strings with backticks (should not use dedent)", async () => {
      // Generate strings that definitely contain backticks
      const stringWithBackticks = fc
        .tuple(fc.string(), fc.constant("`"), fc.string())
        .map(([before, backtick, after]) => before + backtick + after);

      await fc.assert(
        fc.asyncProperty(stringWithBackticks, async (randomStr) => {
          const input = { text: randomStr };
          const result = await convert(input, {
            useDedent: true,
            prefix: "const obj = (",
            suffix: ")",
          });

          // Strings with backticks should not use dedent
          expect(result.needsDedent).toBe(false);

          // The generated code should be executable
          const evalCode = `${result.code}\nconsole.log(JSON.stringify(obj))`;
          const evalResult = await myEval(evalCode);
          const parsedResult = JSON.parse(evalResult.trim());

          // Should roundtrip correctly
          expect(parsedResult.text).toBe(randomStr);
        }),
        { numRuns: 10 * FC_FACTOR },
      );
    });

    it("should handle strings with newlines but no backticks (should use dedent)", async () => {
      // Generate strings with newlines but no backticks
      // Avoid strings that are only newlines (which dedent trims to empty)
      const stringWithNewlines = fc
        .array(
          fc.oneof(
            fc
              .string({ minLength: 1, maxLength: 10 })
              .filter(
                (s) =>
                  !s.includes("`") &&
                  !s.includes("\n") &&
                  !s.includes("$") &&
                  !s.includes("\\"),
              ),
            fc.constant("\n"),
          ),
          { minLength: 2, maxLength: 50 },
        )
        .map((arr) => arr.join(""))
        .filter(
          (str) =>
            str.includes("\n") &&
            !str.includes("`") &&
            !str.includes("$") &&
            !str.includes("\\\n") &&
            str.trim().length > 0,
        );

      await fc.assert(
        fc.asyncProperty(stringWithNewlines, async (randomStr) => {
          const input = { text: randomStr };
          const result = await convert(input, {
            useDedent: true,
            prefix: "const obj = (",
            suffix: ")",
          });

          // Strings with newlines (but no backticks) should use dedent
          expect(result.needsDedent).toBe(true);

          // The generated code should be executable
          const evalCode = `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`;
          const evalResult = await myEval(evalCode);
          const parsedResult = JSON.parse(evalResult.trim());

          // Note: dedent trims leading/trailing whitespace, so we compare normalized versions
          // The dedent result should match the original when normalized
          const normalized = parsedResult.text.replace(/^\s+|\s+$/g, "");
          const normalizedOriginal = randomStr.replace(/^\s+|\s+$/g, "");
          expect(normalized).toBe(normalizedOriginal);
        }),
        { numRuns: 10 * FC_FACTOR },
      );
    });
  });

  describe("fast-check roundtrip tests", () => {
    it("should generate executable code for arbitrary JSON values", async () => {
      const jsonValue = fc.oneof(
        fc.string(),
        fc.integer(),
        fc.float().filter((n) => isFinite(n)), // Exclude Infinity and -Infinity
        fc.boolean(),
        fc.constant(null),
        fc.constant(undefined),
      );

      await fc.assert(
        fc.asyncProperty(jsonValue, async (value) => {
          // Skip undefined as it's not valid JSON
          if (value === undefined) return;

          const result = await jsonToJavascript(value, {
            useDedent: true,
            prefix: "const obj = (",
            suffix: ")",
          });

          // Build executable code
          const evalCode = result.needsDedent
            ? `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`
            : `${result.code}\nconsole.log(JSON.stringify(obj))`;

          // Verify code executes without errors
          const evalResult = await myEval(evalCode);
          const parsedResult = JSON.parse(evalResult.trim());

          // Verify roundtrip matches original
          // Note: JSON.stringify converts -0 to 0, so we normalize for comparison
          const normalizedValue = normalizeForComparison(value);
          const normalizedResult = normalizeForComparison(parsedResult);
          expect(normalizedResult).toEqual(normalizedValue);
        }),
        { numRuns: 10 * FC_FACTOR },
      );
    });

    it("should generate executable code for arbitrary JSON objects", async () => {
      const jsonObject = fc.dictionary(
        fc.string(),
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.float().filter((n) => isFinite(n)), // Exclude Infinity and -Infinity
          fc.boolean(),
          fc.constant(null),
        ),
      );

      await fc.assert(
        fc.asyncProperty(jsonObject, async (input) => {
          const result = await jsonToJavascript(input, {
            useDedent: true,
            prefix: "const obj = (",
            suffix: ")",
          });

          // Build executable code
          const evalCode = result.needsDedent
            ? `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`
            : `${result.code}\nconsole.log(JSON.stringify(obj))`;

          // Verify code executes without errors
          const evalResult = await myEval(evalCode);
          const parsedResult = JSON.parse(evalResult.trim());

          // Verify roundtrip matches original (normalize NaN and -0)
          const normalizedInput = normalizeForComparison(input);
          const normalizedResult = normalizeForComparison(parsedResult);
          expect(normalizedResult).toEqual(normalizedInput);
        }),
        { numRuns: 10 * FC_FACTOR },
      );
    });

    it("should generate executable code for arbitrary JSON arrays", async () => {
      const jsonArray = fc.array(
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.float().filter((n) => isFinite(n)), // Exclude Infinity and -Infinity
          fc.boolean(),
          fc.constant(null),
        ),
        { maxLength: 10 },
      );

      await fc.assert(
        fc.asyncProperty(jsonArray, async (input) => {
          const result = await jsonToJavascript(input, {
            useDedent: true,
            prefix: "const obj = (",
            suffix: ")",
          });

          // Build executable code
          const evalCode = result.needsDedent
            ? `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`
            : `${result.code}\nconsole.log(JSON.stringify(obj))`;

          // Verify code executes without errors
          const evalResult = await myEval(evalCode);
          const parsedResult = JSON.parse(evalResult.trim());

          // Verify roundtrip matches original
          // Note: JSON.stringify converts -0 to 0, so we normalize for comparison
          const normalizedInput = normalizeForComparison(input);
          const normalizedResult = normalizeForComparison(parsedResult);
          expect(normalizedResult).toEqual(normalizedInput);
        }),
        { numRuns: 10 * FC_FACTOR },
      );
    });

    it("should generate executable code for nested structures", async () => {
      const jsonValue = fc.letrec((tie) => ({
        value: fc.oneof(
          { weight: 1, arbitrary: fc.string() },
          { weight: 1, arbitrary: fc.integer() },
          { weight: 1, arbitrary: fc.float().filter((n) => isFinite(n)) }, // Exclude Infinity
          { weight: 1, arbitrary: fc.boolean() },
          { weight: 1, arbitrary: fc.constant(null) },
          { weight: 2, arbitrary: fc.dictionary(fc.string(), tie("value")!) },
          { weight: 2, arbitrary: fc.array(tie("value")!, { maxLength: 5 }) },
        ),
      })).value;

      await fc.assert(
        fc.asyncProperty(jsonValue, async (input) => {
          const result = await jsonToJavascript(input, {
            useDedent: true,
            prefix: "const obj = (",
            suffix: ")",
          });

          // Build executable code
          const evalCode = result.needsDedent
            ? `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`
            : `${result.code}\nconsole.log(JSON.stringify(obj))`;

          // Verify code executes without errors
          const evalResult = await myEval(evalCode);
          const parsedResult = JSON.parse(evalResult.trim());

          // Normalize for comparison (handles NaN, -0, etc.)
          const normalizedOriginal = normalizeForComparison(input);
          const normalizedResult = normalizeForComparison(parsedResult);
          expect(normalizedResult).toEqual(normalizedOriginal);
        }),
        { numRuns: 10 * FC_FACTOR }, // Configurable via FC_FACTOR environment variable
      );
    });

    it("should generate executable code with default convert function", async () => {
      const jsonValue = fc.oneof(
        fc.string(),
        fc.integer(),
        fc.float().filter((n) => isFinite(n)), // Exclude Infinity and -Infinity
        fc.boolean(),
        fc.constant(null),
        fc.dictionary(
          fc.string(),
          fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
        ),
        fc.array(
          fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
          { maxLength: 5 },
        ),
      );

      await fc.assert(
        fc.asyncProperty(jsonValue, async (input) => {
          const result = await convert(input);

          // Build executable code using the default function wrapper
          const evalCode = result.needsDedent
            ? `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(x()))`
            : `${result.code}\nconsole.log(JSON.stringify(x()))`;

          // Verify code executes without errors
          const evalResult = await myEval(evalCode);
          const parsedResult = JSON.parse(evalResult.trim());

          // Verify roundtrip matches original
          // Note: JSON.stringify converts -0 to 0, so we normalize for comparison
          const normalizedOriginal = normalizeForComparison(input);
          const normalizedResult = normalizeForComparison(parsedResult);
          expect(normalizedResult).toEqual(normalizedOriginal);
        }),
        { numRuns: 10 * FC_FACTOR },
      );
    });
  });
});

describe("escaping issues", () => {
  it.skip("reproduce string inside string eval crash", async () => {
    const input =
      "const commentBody = `string with ticks in it \\`git rebase -i\\`\nlast line`\n";
    const result = await convert(input);
    expect(result.needsDedent).toBe(true);
    expect(result.code).toMatchInlineSnapshot(`
      "function x() {
        const js =  dedent\`
          const commentBody = \\\`string with ticks in it \\\\\`git rebase -i\\\\\`
          last line\\\`
          
        \`;
        return js;
      }
      "
    `);
    const { evalResult } = await roundTripTest(input).catch(() => ({
      evalResult: "crashed",
    }));
    expect(evalResult.trim()).toMatchInlineSnapshot(`"crashed"`);
  });
  it("new test", async () => {
    const input =
      "const commentBody = `string with ticks in it \\`git rebase -i\\`\nlast line`\n";
    const result = await convert(input);
    expect(result.needsDedent).toBe(false);
    expect(result.code).toMatchInlineSnapshot(`
      "function x() {
        const js =
          "const commentBody = \`string with ticks in it \\\\\`git rebase -i\\\\\`\\nlast line\`\\n";
        return js;
      }
      "
    `);
    const { evalResult } = await roundTripTest(input).catch(() => ({
      evalResult: "crashed",
    }));
    expect(evalResult.trim()).toMatchInlineSnapshot(`
      "const commentBody = \`string with ticks in it \\\`git rebase -i\\\`
      last line\`"
    `);
    expect(evalResult.trim()).toBe(input.trim());
  });
});

const myEval = async (code: string) => {
  return $`node -e ${code}`.text();
};

// Helper to normalize values for comparison (handles -0 vs +0, NaN, etc.)
// Note: Infinity is excluded from fast-check tests since JSON.stringify converts it to null
function normalizeForComparison(value: unknown): unknown {
  if (typeof value === "number") {
    if (isNaN(value)) return NaN;
    if (value === 0) return 0; // Normalize -0 and +0 to +0
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeForComparison);
  }
  if (value && typeof value === "object") {
    const normalized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      normalized[key] = normalizeForComparison(val);
    }
    return normalized;
  }
  return value;
}

async function roundTripTest(input: unknown) {
  const result = await convert(input, {
    prefix: "console.log(",
    suffix: ")",
  });

  const evalResult = await myEval(`
        const dedent = require("dedent");
        ${result.code}
      `);

  return { evalResult, result };
}

async function roundTripTestLines(input: unknown) {
  const result = await convert(input, {
    dedentPrefix: "lines",
    prefix: "console.log(",
    suffix: ")",
  });

  const evalResult = await myEval(`
        const { lines } = require("@jlarky/gha-ts/utils");
        ${result.code}
      `);

  return { evalResult, result };
}
