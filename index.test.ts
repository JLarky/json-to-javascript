import { describe, it, expect } from "bun:test";
import {
  jsonToJavascript,
  shouldConvertMultiline,
  type Options,
} from "./index";
import { $ } from "bun";
import fc from "fast-check";

// Configure fast-check iterations from environment variable
// FC_FACTOR=10 means 10x more tests than default
const FC_FACTOR = parseFloat(process.env.FC_FACTOR || "1");
function withBackticksAllowed<T>(fn: () => Promise<T>): () => Promise<T> {
  return async () => {
    const prev = process.env.JSON_TO_JS_DEBUG_ALLOW_BACKTICKS;
    process.env.JSON_TO_JS_DEBUG_ALLOW_BACKTICKS = "1";
    try {
      return await fn();
    } finally {
      process.env.JSON_TO_JS_DEBUG_ALLOW_BACKTICKS = prev;
    }
  };
}

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
        const expected = shouldConvertMultiline(randomStr, {});
        expect(result.needsDedent).toBe(expected);
        const evalCode = expected
          ? `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(x()))`
          : `${result.code}\nconsole.log(JSON.stringify(x()))`;
        const evalResult = await myEval(evalCode);
        const parsedResult = JSON.parse(evalResult.trim());
        expect(parsedResult.text).toBe(expected ? randomStr.trim() : randomStr);
        if (expected) {
          expect(result.code).toContain("dedent`");
        } else {
          expect(result.code).not.toContain("dedent`");
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

        const evalCode = result.needsDedent
          ? `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`
          : `${result.code}\nconsole.log(JSON.stringify(obj))`;

        const evalResult = await myEval(evalCode);
        const parsedResult = JSON.parse(evalResult.trim());
        expect(parsedResult.text).toBe(
          result.needsDedent ? randomStr.trim() : randomStr,
        );
      }),
      { numRuns: 10 * FC_FACTOR },
    );
  });

  it("should handle negative zero correctly", async () => {
    const input = { value: -0 };
    const result = await convert(input, {
      prefix: "const obj = (",
      suffix: ")",
    });
    const evalCode = `${result.code}\nconsole.log(JSON.stringify(obj))`;
    const evalResult = await myEval(evalCode);
    const parsedResult = JSON.parse(evalResult.trim());
    expect(parsedResult.value).toBe(0);
    expect(Object.is(parsedResult.value, 0)).toBe(true);
    expect(typeof parsedResult.value).toBe("number");
  });

  it("should handle strings with special characters", async () => {
    const specialString = "` $\"'\n\\";
    const input = { text: specialString };
    const result = await convert(input, {
      prefix: "const obj = (",
      suffix: ")",
    });
    // Conservative heuristic excludes backtick; debug env JSON_TO_JS_DEBUG_ALLOW_BACKTICKS=1 can relax this (relax flags removed)
    expect(result.needsDedent).toBe(false);
    // Backtick still blocks conversion; relaxed flags removed.
    const relaxed = await convert(input, {
      prefix: "const obj = (",
      suffix: ")",
    });
    expect(relaxed.needsDedent).toBe(false); // backtick still blocks unless debug env set
    const evalCode = `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`;
    const evalResult = await myEval(evalCode);
    const parsedResult = JSON.parse(evalResult.trim());
    expect(parsedResult.text.trim()).toBe(specialString.trim());
  });

  it("should handle strings with special characters including template literal syntax", async () => {
    const specialString = "` ${test} `";
    const input = { text: specialString };
    const result = await convert(input, {
      useDedent: true,
      prefix: "const obj = (",
      suffix: ")",
    });
    expect(result.needsDedent).toBe(false);
    const evalCode = `${result.code}\nconsole.log(JSON.stringify(obj))`;
    const evalResult = await myEval(evalCode);
    const parsedResult = JSON.parse(evalResult.trim());
    expect(parsedResult.text).toBe(specialString);
  });

  it("should handle multiline strings with special characters", async () => {
    // Conservative heuristic: newline + no risky chars; this contains backtick so excluded.
    const specialString = "` $ \" ' \n\\";
    const input = { text: specialString };
    const result = await convert(input, {
      useDedent: true,
      prefix: "const obj = (",
      suffix: ")",
    });
    expect(result.needsDedent).toBe(false);
    // Backtick still blocks conversion; relaxed flags removed.
    const relaxed = await convert(input, {
      useDedent: true,
      prefix: "const obj = (",
      suffix: ")",
    });
    expect(relaxed.needsDedent).toBe(false);
    const evalCode = `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`;
    const evalResult = await myEval(evalCode);
    const parsedResult = JSON.parse(evalResult.trim());
    expect(parsedResult.text.trim()).toBe(specialString.trim());
  });

  it("should handle backslash followed by newline", async () => {
    const specialString = "\\\n";
    const input = { text: specialString };
    const result = await convert(input, {
      useDedent: true,
      prefix: "const obj = (",
      suffix: ")",
    });
    expect(result.needsDedent).toBe(false); // excluded: backslash+newline alters semantics
    const evalCode = `${result.code}\nconsole.log(JSON.stringify(obj))`;
    const evalResult = await myEval(evalCode);
    const parsedResult = JSON.parse(evalResult.trim());
    expect(parsedResult.text.trim()).toBe(specialString.trim());
  });

  it("should exclude double backslash before newline", async () => {
    const specialString = "\\\\\n"; // two backslashes then newline
    const input = { text: specialString };
    const result = await convert(input, {
      useDedent: true,
      prefix: "const obj = (",
      suffix: ")",
    });
    expect(result.needsDedent).toBe(false);
    expect(shouldConvertMultiline(specialString, {})).toBe(false);
  });
  it("should exclude triple backslash before newline", async () => {
    const specialString = "\\\\\\\n"; // three backslashes then newline
    const input = { text: specialString };
    const result = await convert(input, {
      useDedent: true,
      prefix: "const obj = (",
      suffix: ")",
    });
    expect(result.needsDedent).toBe(false);
    expect(shouldConvertMultiline(specialString, {})).toBe(false);
  });
  it("should exclude single trailing backslash at end", async () => {
    const specialString = "line1\nline2\\"; // ends with one backslash
    const input = { text: specialString };
    const result = await convert(input, {
      useDedent: true,
      prefix: "const obj = (",
      suffix: ")",
    });
    expect(result.needsDedent).toBe(false);
    expect(shouldConvertMultiline(specialString, {})).toBe(false);
  });
  it("should exclude multiple trailing backslashes at end", async () => {
    const specialString = "line1\nline2\\\\\\\\"; // ends with four backslashes
    const input = { text: specialString };
    const result = await convert(input, {
      useDedent: true,
      prefix: "const obj = (",
      suffix: ")",
    });
    expect(result.needsDedent).toBe(false);
    expect(shouldConvertMultiline(specialString, {})).toBe(false);
  });
  it("should include backslash not before newline and not at end", async () => {
    const specialString = "line1\\x\nline2 end"; // backslash mid-string
    const input = { text: specialString };
    const result = await convert(input, {
      useDedent: true,
      prefix: "const obj = (",
      suffix: ")",
    });
    expect(result.needsDedent).toBe(true);
    expect(shouldConvertMultiline(specialString, {})).toBe(true);
    expect(result.code).toContain("dedent`");
  });
  it("should include backslash followed by space at end (not excluded)", async () => {
    const specialString = "line1\nline2\\ "; // trailing backslash + space
    const input = { text: specialString };
    const result = await convert(input, {
      useDedent: true,
      prefix: "const obj = (",
      suffix: ")",
    });
    // Currently heuristic only excludes strict /\\+$/ so this should be converted.
    expect(result.needsDedent).toBe(true);
    expect(shouldConvertMultiline(specialString, {})).toBe(true);
  });
  it("should include backslash followed by two spaces at end (not excluded)", async () => {
    const specialString = "line1\nline2\\  "; // trailing backslash + two spaces
    const input = { text: specialString };
    const result = await convert(input, {
      useDedent: true,
      prefix: "const obj = (",
      suffix: ")",
    });
    expect(result.needsDedent).toBe(true);
    expect(shouldConvertMultiline(specialString, {})).toBe(true);
  });

  describe("fast-check special character tests", () => {
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
        {
          minLength: 1,
          maxLength: 50,
        },
      )
      .map((arr) => arr.join(""));

    it("should handle random strings with special characters", async () => {
      await fc.assert(
        fc.asyncProperty(stringWithSpecialChars, async (randomStr) => {
          const input = { text: randomStr };
          const result = await convert(input, {
            prefix: "const obj = (",
            suffix: ")",
          });
          const evalCode = result.needsDedent
            ? `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`
            : `${result.code}\nconsole.log(JSON.stringify(obj))`;
          const evalResult = await myEval(evalCode);
          const parsedResult = JSON.parse(evalResult.trim());
          if (result.needsDedent) {
            expect(parsedResult.text.trim()).toBe(randomStr.trim());
          } else {
            expect(parsedResult.text).toBe(randomStr);
          }
        }),
        { numRuns: 10 * FC_FACTOR },
      );
    });

    it("fc: should handle newline + backslashes without risky chars", async () => {
      const gen = fc
        .array(
          fc.oneof(
            fc.string({ maxLength: 5 }),
            fc.constant("\\"),
            fc.constant("\n"),
          ),
          { minLength: 2, maxLength: 30 },
        )
        .map((arr) => arr.join(""))
        .filter((s) => s.includes("\n"))
        .filter((s) => !s.includes("$") && !s.includes("`"))
        .filter((s) => !/\\+\n/.test(s))
        .filter((s) => !/\\+$/.test(s));

      await fc.assert(
        fc.asyncProperty(gen, async (str) => {
          const input = { text: str };
          const result = await convert(input, {
            useDedent: true,
            prefix: "const obj = (",
            suffix: ")",
          });
          // shouldConvertMultiline should return true (no `$`, no backtick, no backslash-newline).
          expect(shouldConvertMultiline(str, {})).toBe(true);
          expect(result.needsDedent).toBe(true);
          expect(result.code).toContain("dedent`");
          const evalCode = `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`;
          const evalResult = await myEval(evalCode);
          const parsedResult = JSON.parse(evalResult.trim());
          expect(parsedResult.text.trim()).toBe(str.trim());
        }),
        { numRuns: 10 * FC_FACTOR },
      );
    });

    it("should handle strings with backticks (dedent only if newline)", async () => {
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
          const conservativeShould = shouldConvertMultiline(randomStr, {});
          expect(result.needsDedent).toBe(conservativeShould);
          if (conservativeShould) {
            expect(result.code).toContain("dedent`");
          } else {
            expect(result.code).not.toContain("dedent`");
          }
          const evalCode = result.needsDedent
            ? `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`
            : `${result.code}\nconsole.log(JSON.stringify(obj))`;
          const evalResult = await myEval(evalCode);
          const parsedResult = JSON.parse(evalResult.trim());
          if (result.needsDedent) {
            expect(parsedResult.text.trim()).toBe(randomStr.trim());
          } else {
            expect(parsedResult.text).toBe(randomStr);
          }
        }),
        { numRuns: 10 * FC_FACTOR },
      );
    });

    it("should handle strings with newlines (conservative heuristic)", async () => {
      const stringWithNewlines = fc
        .array(fc.oneof(fc.string({ maxLength: 10 }), fc.constant("\n")), {
          minLength: 2,
          maxLength: 50,
        })
        .map((arr) => arr.join(""))
        .filter((str) => str.includes("\n") && str.trim().length > 0);

      await fc.assert(
        fc.asyncProperty(stringWithNewlines, async (randomStr) => {
          const input = { text: randomStr };
          const result = await convert(input, {
            useDedent: true,
            prefix: "const obj = (",
            suffix: ")",
          });
          const conservativeShould = shouldConvertMultiline(randomStr, {});
          expect(result.needsDedent).toBe(conservativeShould);
          if (conservativeShould) {
            expect(result.code).toContain("dedent`");
          } else {
            expect(result.code).not.toContain("dedent`");
          }
          const evalCode = `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`;
          const evalResult = await myEval(evalCode);
          const parsedResult = JSON.parse(evalResult.trim());
          expect(parsedResult.text.trim()).toBe(randomStr.trim());
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
        fc.float().filter((n) => isFinite(n)),
        fc.boolean(),
        fc.constant(null),
        fc.constant(undefined),
      );

      await fc.assert(
        fc.asyncProperty(jsonValue, async (value) => {
          if (value === undefined) return;
          const result = await jsonToJavascript(value, {
            useDedent: true,
            prefix: "const obj = (",
            suffix: ")",
          });
          const evalCode = result.needsDedent
            ? `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`
            : `${result.code}\nconsole.log(JSON.stringify(obj))`;
          const evalResult = await myEval(evalCode);
          const parsedResult = JSON.parse(evalResult.trim());
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
          fc.float().filter((n) => isFinite(n)),
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
          const evalCode = result.needsDedent
            ? `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`
            : `${result.code}\nconsole.log(JSON.stringify(obj))`;
          const evalResult = await myEval(evalCode);
          const parsedResult = JSON.parse(evalResult.trim());
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
          fc.float().filter((n) => isFinite(n)),
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
          const evalCode = result.needsDedent
            ? `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`
            : `${result.code}\nconsole.log(JSON.stringify(obj))`;
          const evalResult = await myEval(evalCode);
          const parsedResult = JSON.parse(evalResult.trim());
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
          { weight: 1, arbitrary: fc.float().filter((n) => isFinite(n)) },
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
          const evalCode = result.needsDedent
            ? `const dedent = require("dedent");\n${result.code}\nconsole.log(JSON.stringify(obj))`
            : `${result.code}\nconsole.log(JSON.stringify(obj))`;
          const evalResult = await myEval(evalCode);
          const parsedResult = JSON.parse(evalResult.trim());
          const normalizedOriginal = normalizeForComparison(input);
          const normalizedResult = normalizeForComparison(parsedResult);
          expect(normalizedResult).toEqual(normalizedOriginal);
        }),
        { numRuns: 10 * FC_FACTOR },
      );
    });

    it("should generate executable code with default convert function", async () => {
      const jsonValue = fc.oneof(
        fc.string(),
        fc.integer(),
        fc.float().filter((n) => isFinite(n)),
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
          const evalCode = result.needsDedent
            ? `const dedent = require("dedent");
${result.code}
console.log(JSON.stringify(x()))`
            : `${result.code}
console.log(JSON.stringify(x()))`;
          const evalResult = await myEval(evalCode);
          const parsedResult = JSON.parse(evalResult.trim());
          const normalizedOriginal = normalizeForComparison(input);
          const normalizedResult = normalizeForComparison(parsedResult);
          expect(normalizedResult).toEqual(normalizedOriginal);
        }),
        // Reduced iterations for broad default convert property to mitigate timeout risk
        { numRuns: 5 * FC_FACTOR },
      );
    });
  });
});

describe("escaping issues", () => {
  it.skip("legacy crash reproduction (pre-consolidation)", async () => {
    // Kept skipped as documentation; under unified heuristic this round-trips.
    const input =
      "const commentBody = `string with ticks in it \\`git rebase -i\\`\nlast line`\n";
    const result = await convert(input);
    expect(result.needsDedent).toBe(true);
  });
  it("multiline with backticks excluded under conservative heuristic", async () => {
    const input =
      "const commentBody = `string with ticks in it \\`git rebase -i\\`\nlast line`\n";
    const result = await convert(input);
    expect(result.needsDedent).toBe(false);
    const { evalResult } = await roundTripTest(input).catch(() => ({
      evalResult: "crashed",
    }));
    expect(evalResult.trim()).toBe(input.trim());
  });
  it(
    "debug flag allows multiline with backticks",
    withBackticksAllowed(async () => {
      const input =
        "const commentBody = `string with ticks in it `git rebase -i`\nlast line`\n";
      const result = await convert(input);
      expect(result.needsDedent).toBe(true);
      // shouldConvertMultiline should return true under debug flag
      expect(shouldConvertMultiline(input, {})).toBe(true);
      const { evalResult, result: roundResult } = await roundTripTest(input);
      expect(roundResult.needsDedent).toBe(true);
      expect(evalResult.trim()).toBe(input.trim());
    }),
  );
  it("regression: newline + double dollars", async () => {
    const input = "\n$$";
    const { evalResult } = await roundTripTest(input);
    expect(evalResult.trim()).toBe(input.trim());
  });
});

const myEval = async (code: string) => {
  // Write code to a workspace temp file to avoid shell interpolation and keep node cwd for module resolution
  const tmpFileName = `./playpen/tmp-node-eval/node_eval_${Date.now()}_${Math.random().toString(36).slice(2)}.cjs`;
  await Bun.write(tmpFileName, code);
  const out = await $`node ${tmpFileName}`.text();
  await $`rm -f ${tmpFileName}`;
  return out;
};

function normalizeForComparison(value: unknown): unknown {
  if (typeof value === "number") {
    if (isNaN(value)) return NaN;
    if (value === 0) return 0;
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
  const result = await convert(input, { prefix: "console.log(", suffix: ")" });
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
