import { describe, it, expect } from "bun:test";
import { parse, stringify } from "yaml";
import { jsonToJavascript } from "./index";

describe("fixture classification", () => {
  it("classifies workflow-cases samples", async () => {
    const raw = await Bun.file("./fixtures/workflow-cases.yml").text();
    const doc = parse(raw);
    await Bun.write("./fixtures/workflow-cases-output.yml", stringify(doc));
    await Bun.write(
      "./fixtures/workflow-cases-output.json",
      JSON.stringify(doc, null, 2),
    );
    const output = await jsonToJavascript(doc);
    await Bun.write("./fixtures/workflow-cases-output.js", output.code);
    // expect(stringify(doc)).toMatchSnapshot();
  });
});
