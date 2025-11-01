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
  return (
    value.includes("\n") &&
    !value.includes("`") &&
    !value.includes("\\") &&
    !value.includes("$")
  );
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
    const originalString = multilineStrings[index]!;
    // Extract leading newlines
    const leadingNewlinesMatch = originalString.match(/^(\r?\n)+/);
    const leadingNewlines = leadingNewlinesMatch ? leadingNewlinesMatch[0] : "";
    
    // Extract trailing newlines and whitespace (spaces, tabs, etc.)
    // But only if there's non-whitespace content between leading and trailing
    const afterLeading = originalString.slice(leadingNewlines.length);
    const trailingMatch = afterLeading.match(/([\s]+)$/);
    // If trailing whitespace consumes everything after leading, and leading consumed everything,
    // then this is an all-whitespace string - treat trailing as empty to avoid duplication
    const isAllWhitespace = leadingNewlines.length > 0 && trailingMatch && trailingMatch[0].length === afterLeading.length;
    const trailing = (trailingMatch && !isAllWhitespace) ? trailingMatch[0] : "";
    
    // Get the middle content (without leading/trailing)
    const middleContent = originalString.slice(leadingNewlines.length, trailing ? -trailing.length : undefined);
    
    // Check if middle content contains \r\n sequences that need special handling
    // (template literals normalize \r\n to \n, so we need to use string concatenation)
    const hasCrlf = middleContent.includes("\r\n");
    
    // Escape for template literal
    // Handle \r\n as a unit first, then escape standalone \r
    let escaped = middleContent
      .replaceAll("\\", "\\\\")
      .replaceAll("`", "\\`")
      .replaceAll("${", "\\${")
      // Don't escape \r that's part of \r\n - we'll handle those specially
      // Only escape standalone \r (not followed by \n)
      .replaceAll(/\r(?!\n)/g, "\\r");
    
    const marker = randomString + index;
    const line = formatted.split("\n").find((line) => line.includes(marker));
    const indent = line?.match(/^(\s*)/)?.[1] || "";
    
    // Build expression with leading newlines before dedent, trailing after
    // Escape newlines and other special chars for string literal
    const escapeForString = (str: string) => {
      return str
        .replaceAll("\\", "\\\\")
        .replaceAll("\r", "\\r")
        .replaceAll("\n", "\\n")
        .replaceAll('"', '\\"')
        .replaceAll("\t", "\\t");
    };
    const leadingPart = leadingNewlines ? `"${escapeForString(leadingNewlines)}" + ` : "";
    const trailingPart = trailing ? ` + "${escapeForString(trailing)}"` : "";
    
    let linesExpression: string;
    if (hasCrlf) {
      // For strings with \r\n, convert entire content to escaped string literal
      // because template literals normalize \r\n to \n
      // We'll preserve \r\n by using escaped string concatenation
      const fullString = leadingNewlines + middleContent + (trailing || "");
      const escapedFull = escapeForString(fullString);
      linesExpression = `"${escapedFull}"`;
    } else {
      // Normal case: handle standalone \n first (not preceded by \r), then handle \r\n as a unit
      const indented = escaped
        .replaceAll(/(?<!\r)\n/g, `\n${indent}  `)
        .replaceAll(/\r\n/g, `\r\n${indent}  `);
      linesExpression = [
        `${leadingPart}${dedentPrefix}\``,
        `${indent}  ${indented}`,
        `${indent}\`${dedentSuffix}${trailingPart}`,
      ].join("\n");
    }
    formatted = formatted.replace(`"${marker}"`, linesExpression);
  }
  return {
    code: formatted,
    needsDedent: markerCount > 0,
  };
}
