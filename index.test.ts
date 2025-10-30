import { describe, it, expect } from "bun:test";
import { jsonToJavascript, type Options } from "./index";
import { $ } from "bun";

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
});

const myEval = async (code: string) => {
  return $`node -e ${code}`.text();
};

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
