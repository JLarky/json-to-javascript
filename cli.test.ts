import { describe, it, expect } from "bun:test";
import { jsonToJavascript, type Options } from "./index";
import { $ } from "bun";

async function convert(input: unknown, options: Options = {}) {
  return await jsonToJavascript(input, {
    prefix: "function x() { const js = (",
    suffix: ");return js}",
    ...options,
  });
}

describe("cli", () => {
  it("testing default options", async () => {
    const tmpFolder = (await $`mktemp -d`.text()).trim();
    const inputFile = `${tmpFolder}/input.json`;
    const outputFile = `${tmpFolder}/output.js`;
    await Bun.write(inputFile, JSON.stringify({ name: "John\nDoe", age: 30 }));
    const text =
      await $`bun run cli.ts --inputFile ${inputFile} --outputFile ${outputFile}`.text();
    expect(text).toMatchInlineSnapshot(`""`);
    const output = await Bun.file(outputFile).text();
    expect(output).toMatchInlineSnapshot(`
      "({ name: "John\\nDoe", age: 30 });
      "
    `);
  });

  it("testing default options", async () => {
    const tmpFolder = (await $`mktemp -d`.text()).trim();
    const inputFile = `${tmpFolder}/input.json`;
    const outputFile = `${tmpFolder}/output.js`;
    await Bun.write(inputFile, JSON.stringify({ name: "John\nDoe", age: 30 }));
    const text =
      await $`bun run cli.ts --inputFile ${inputFile} --outputFile ${outputFile} --useDedent true --prefix "import dedent from 'dedent'; const x = ("`.text();
    expect(text).toMatchInlineSnapshot(`""`);
    const output = await Bun.file(outputFile).text();
    expect(output).toMatchInlineSnapshot(`
      "import dedent from "dedent";
      const x = { name:  dedent\`
        John
        Doe
      \`, age: 30 };
      "
    `);
  });
});
