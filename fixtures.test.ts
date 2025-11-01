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
    const fancierOut = await myEval(
      'const {lines: dedent} = require("../../lines.ts");\nconst x =' +
        fancierOutput.code +
        "console.log(JSON.stringify(x, null, 2))",
    );
    await Bun.write(
      "./fixtures/workflow-cases-from-js-fancier.json",
      fancierOut,
    );

    // expects
    expect(out.trimEnd()).toBe(jsonDoc);
    expect(fancierOut.trimEnd()).toBe(jsonDoc);
  });
});
