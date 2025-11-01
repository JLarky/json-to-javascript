/**
 * Convert JSON data to JavaScript code literals with smart handling of multiline strings.
 *
 * This module provides utilities to transform JSON into properly formatted JavaScript code,
 * automatically converting multiline strings into template literals with dedent support for
 * clean indentation.
 *
 * @example
 * ```typescript
 * import { jsonToJavascript } from "@jlarky/json-to-javascript";
 *
 * const data = { greeting: "Hello\nWorld" };
 * const result = await jsonToJavascript(data, {
 *   useDedent: true,
 *   prefix: "export const config = (",
 *   suffix: ") as const",
 * });
 * console.log(result.code);
 * ```
 *
 * @module
 */

import { format, type Options as PrettierOptions } from "prettier";

// it's random, I swear
let randomString = "MARKER_b67575ae-db24-47f3-9c7d-e8b46b84228b_";

/**
 * Set a custom marker string for replacing multiline strings during conversion.
 *
 * By default, a UUID-based marker is used to temporarily replace multiline strings
 * before they are converted to template literals. Use this function to override it
 * if needed (e.g., for testing purposes).
 *
 * @param string - The custom marker string to use
 *
 * @example
 * ```typescript
 * setRandomString("CUSTOM_MARKER_");
 * ```
 */
export function setRandomString(string: string) {
  randomString = string;
}

/**
 * Configuration options for the JSON to JavaScript conversion.
 */
export interface Options {
  /**
   * String to prefix the output with.
   * @default "("
   */
  prefix?: string;

  /**
   * String to suffix the output with.
   * @default ")"
   */
  suffix?: string;

  /**
   * Whether to format the output using Prettier.
   * @default true
   */
  usePrettier?: boolean;

  /**
   * Prettier configuration options (e.g., `{ parser: "babel-ts" }`).
   * @default undefined
   */
  prettierOptions?: PrettierOptions;

  /**
   * Custom transformation function to apply before Prettier formatting.
   * @default undefined
   */
  beforePrettier?: (string: string) => string;

  /**
   * Whether to convert multiline strings to template literals with dedent function calls.
   * @default false
   */
  useDedent?: boolean;

  /**
   * Function or keyword name to use for dedent template literals.
   * @default " dedent"
   */
  dedentPrefix?: string;

  /**
   * Suffix to add after dedent template literals.
   * @default ""
   */
  dedentSuffix?: string;

  /**
   * Custom replacer function for JSON.stringify (passed directly to JSON.stringify).
   * @default undefined
   */
  jsonStringifyReplacer?: (key: string, value: unknown) => unknown;

  /**
   * Indentation spaces or string for JSON.stringify output.
   * @default undefined
   */
  jsonStringifySpace?: string | number;
}

/**
 * Result of converting JSON to JavaScript code.
 */
export interface JavascriptOutput {
  /**
   * The generated JavaScript code.
   */
  code: string;

  /**
   * Whether the output contains dedent template literals and requires the dedent function to be imported.
   */
  needsDedent: boolean;
}

export function shouldConvertMultiline(value: string): boolean {
  // Convert any string with \n to template literal, but exclude CRLF strings
  // because JavaScript template literals normalize \r\n to \n
  return value.includes("\n") && !value.includes("\r");
}

/**
 * Convert JSON data to JavaScript code literals.
 *
 * This function transforms JSON into properly formatted JavaScript code, with optional support
 * for converting multiline strings to template literals and automatic code formatting.
 *
 * @param json - The JSON data to convert
 * @param options - Configuration options for the conversion
 * @returns A promise that resolves to an object containing the generated code and metadata
 *
 * @throws {Error} If Prettier formatting fails and usePrettier is enabled
 *
 * @example
 * ```typescript
 * const result = await jsonToJavascript({ name: "John" });
 * console.log(result.code); // ({ name: "John" });
 * ```
 *
 * @example
 * ```typescript
 * // With multiline string handling
 * const result = await jsonToJavascript(
 *   { message: "Line 1\nLine 2" },
 *   { useDedent: true, prefix: "const x = (" }
 * );
 * // Output includes dedent template literal for the multiline string
 * ```
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
        if (typeof value === "string" && shouldConvertMultiline(value)) {
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
  // Don't format with prettier yet - we need to replace markers first
  // Format after replacement to ensure template literals are formatted correctly
  const dedentPrefix = options.dedentPrefix ?? " dedent";
  const dedentSuffix = options.dedentSuffix ?? "";
  for (let index = 0; index < markerCount; index++) {
    let escaped = multilineStrings[index]!;
    // Escape backticks and template expressions for template literals
    // We need to escape backslashes that appear before backticks or dollar signs
    // to ensure they're literal backslashes, not escape sequences
    // Process character by character to handle backslash sequences correctly
    // Escape for template literals:
    // - Backslashes must be escaped to \\ to appear as literal backslashes
    // - Backticks must be escaped to \`
    // - ${ must be escaped to \${
    // - $ must be escaped to \$ to preserve $$ (prettier may normalize $$ to $ otherwise)
    // - Newlines and other escape sequences work as-is in template literals
    escaped = escaped
      .replaceAll("\\", "\\\\") // Escape all backslashes first
      .replaceAll("`", "\\`")   // Then escape backticks
      .replaceAll("${", "__TEMP_TEMPLATE_START__")  // Temporarily replace ${
      .replaceAll("$", "\\$")   // Escape all remaining $ to preserve $$
      .replaceAll("__TEMP_TEMPLATE_START__", "\\${"); // Restore ${ as \${
    const marker = randomString + index;
    const quotedMarker = `"${marker}"`;
    // Find the marker in the unformatted JSON string
    if (!formatted.includes(quotedMarker)) {
      throw new Error(`Marker ${quotedMarker} not found in code`);
    }
    // Find the line containing the marker to get indentation
    const line = formatted.split("\n").find((line) => line.includes(marker));
    const indent = line?.match(/^(\s*)/)?.[1] || "";
    const indented = escaped.replaceAll("\n", "\n" + indent + "  ");
    const linesExpression = [
      dedentPrefix + "`",
      indent + "  " + indented,
      indent + "  `" + dedentSuffix, // Closing backtick should have same indent as content
    ].join("\n");
    formatted = formatted.replace(quotedMarker, linesExpression);
  }
  // Format with prettier after all replacements are done
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
  return {
    code: formatted,
    needsDedent: markerCount > 0,
  };
}
