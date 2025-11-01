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
    expect(out.trimEnd()).toBe(jsonDoc);
    // expect(stringify(doc)).toMatchSnapshot();
  });
});
