import { parseArgs, type ParseArgsConfig } from "util";
import { jsonToJavascript } from "./index.ts";
import { readFileSync, writeFileSync } from "fs";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    prefix: {
      type: "string",
    },
    suffix: {
      type: "string",
    },
    usePrettier: {
      type: "string",
    },
    prettierOptions: {
      type: "string",
    },
    useDedent: {
      type: "string",
    },
    dedentPrefix: {
      type: "string",
    },
    dedentSuffix: {
      type: "string",
    },
    jsonStringifySpace: {
      type: "string",
    },
    //
    inputFile: {
      type: "string",
    },
    outputFile: {
      type: "string",
    },
    //
    help: {
      type: "boolean",
    },
  },
  strict: true,
  allowPositionals: true,
} satisfies ParseArgsConfig);

if (positionals.length > 0) {
  console.error("Unknown arguments: " + positionals.join(" "));
  process.exit(1);
}

if (values.help) {
  console.log("Usage: json-to-javascript [options]");
  console.log("Options:");
  console.log("  --inputFile <string>           Input file");
  console.log("  --outputFile <string>          Output file");
  console.log(
    "  --prefix <string>              Prefix the output with a string",
  );
  console.log(
    "  --suffix <string>              Suffix the output with a string",
  );
  console.log(
    "  --usePrettier <boolean>        Use prettier to format the output",
  );
  console.log("  --prettierOptions <string>     Options for prettier");
  console.log(
    "  --useDedent <boolean>          Use dedent to format the output",
  );
  console.log("  --dedentPrefix <string>        Prefix for dedent");
  console.log("  --dedentSuffix <string>        Suffix for dedent");
  console.log("  --jsonStringifySpace <string>  Space for jsonStringify");
  console.log("  --help                         Show help");
  console.log();
  process.exit(0);
}

if (!values.inputFile || !values.outputFile) {
  console.error("--inputFile and --outputFile must be provided");
  process.exit(1);
}

const input = readFileSync(values.inputFile, "utf8");
const json = JSON.parse(input);
console.log(json);
const output = await jsonToJavascript(json, {
  prefix: values.prefix,
  suffix: values.suffix,
  usePrettier: values.usePrettier ? values.usePrettier === "true" : undefined,
  prettierOptions: values.prettierOptions
    ? JSON.parse(values.prettierOptions)
    : undefined,
  useDedent: values.useDedent ? values.useDedent === "true" : undefined,
  dedentPrefix: values.dedentPrefix,
  dedentSuffix: values.dedentSuffix,
  jsonStringifySpace: values.jsonStringifySpace
    ? parseInt(values.jsonStringifySpace)
    : undefined,
});
writeFileSync(values.outputFile, output.code);
