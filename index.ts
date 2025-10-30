import { format, type Options as PrettierOptions } from "prettier";

// it's random, I swear
let randomString = "MARKER_b67575ae-db24-47f3-9c7d-e8b46b84228b_";

/**
 * just in case if you don't think my string is random enough
 */
export function setRandomString(string: string) {
  randomString = string;
}

export interface Options {
  /** prefix the output with a string, default is "(" */
  prefix?: string;
  /** suffix the output with a string, default is ")" */
  suffix?: string;
  /** use prettier, true by default */
  usePrettier?: boolean;
  prettierOptions?: PrettierOptions;
  beforePrettier?: (string: string) => string;
  /** use dedent, false by default */
  useDedent?: boolean;
  /** by default it's a string " dedent" */
  dedentPrefix?: string;
  /** by default it's an empty string */
  dedentSuffix?: string;
  jsonStringifyReplacer?: (key: string, value: unknown) => unknown;
  jsonStringifySpace?: string | number;
}

export interface JavascriptOutput {
  code: string;
  needsDedent: boolean;
}

/**
 * Convert JSON to JavaScript.
 */
export async function jsonToJavascript(
  json: unknown,
  options: Options = {},
): Promise<JavascriptOutput> {
  const usePrettier = options.usePrettier ?? true;
  const useDedent = options.useDedent ?? false;
  let markerCount = 0;
  const multilineStrings: string[] = [];
  const string = JSON.stringify(
    json,
    (key, value) => {
      let replacedValue = value;
      if (useDedent) {
        if (typeof value === "string" && value.includes("\n")) {
          replacedValue = randomString + markerCount++;
          multilineStrings.push(value);
        }
      }
      return (
        options.jsonStringifyReplacer?.(key, replacedValue) ?? replacedValue
      );
    },
    options.jsonStringifySpace,
  );
  let formatted = (options.prefix ?? "(") + string + (options.suffix ?? ")");
  formatted = options.beforePrettier
    ? options.beforePrettier(formatted)
    : formatted;
  if (usePrettier) {
    try {
      formatted = await format(formatted, {
        parser: "babel",
        ...options.prettierOptions,
      });
    } catch (error) {
      throw new Error(
        `Failed to format code with prettier, consider turning off prettier with --usePrettier false`,
        { cause: error },
      );
    }
  }
  const dedentPrefix = options.dedentPrefix ?? " dedent";
  const dedentSuffix = options.dedentSuffix ?? "";
  for (let index = 0; index < markerCount; index++) {
    const escaped = multilineStrings[index]!.replaceAll("`", "\\`").replaceAll(
      "${",
      "\\${",
    );
    const marker = randomString + index;
    const line = formatted.split("\n").find((line) => line.includes(marker));
    const indent = line?.match(/^(\s*)/)?.[1] || "";
    const indented = escaped.replaceAll("\n", `\n${indent}  `);
    const linesExpression = [
      `${dedentPrefix}\``,
      `${indent}  ${indented}`, //
      `${indent}\`${dedentSuffix}`,
    ].join("\n");
    formatted = formatted.replace(`"${marker}"`, linesExpression);
  }
  return {
    code: formatted,
    needsDedent: markerCount > 0,
  };
}
