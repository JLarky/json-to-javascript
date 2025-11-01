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
  if (!value.includes("\n")) return false;
  if (value.includes("`") || value.includes("\\") || value.includes("$")) {
    return false;
  }
  // Dedent trims leading/trailing blank lines and trailing whitespace on last line
  // So we can't use dedent for strings with these characteristics
  // Also, strings with CRLF should not use dedent (dedent only handles LF)
  if (value.includes("\r\n")) return false;
  const lines = value.split("\n");
  const firstNonEmpty = lines.findIndex(l => l.length > 0);
  const lastNonEmpty = (() => {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i]!.length > 0) return i;
    }
    return -1;
  })();
  // If all lines are empty (only newlines), dedent will trim everything
  if (firstNonEmpty === -1) return false;
  // Check for leading newlines
  if (firstNonEmpty > 0) return false;
  // Check for trailing newlines
  if (lastNonEmpty >= 0 && lastNonEmpty < lines.length - 1) return false;
  // Check for trailing spaces on last line
  if (lastNonEmpty >= 0 && lines[lastNonEmpty]!.trimEnd() !== lines[lastNonEmpty]!) {
    return false;
  }
  return true;
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
    const marker = randomString + index;
    const line = formatted.split("\n").find((line) => line.includes(marker));
    const indent = line?.match(/^(\s*)/)?.[1] || "";
    
    // Preserve CRLF exactly as it is - don't normalize for output
    // But for processing with dedent, we need LF
    
    // Split the string while preserving CRLF vs LF
    // Split by both \r\n and \n, but we need to know which was used
    // For simplicity with dedent (which only handles \n), we'll convert \r\n to \n for processing
    // but this means CRLF strings won't use dedent (which is fine since they have edge cases)
    const hasCRLF = originalString.includes("\r\n");
    const processingString = hasCRLF ? originalString.replaceAll("\r\n", "\n") : originalString;
    const processingEscaped = processingString.replaceAll("`", "\\`").replaceAll("${", "\\${");
    const allLines = processingEscaped.split("\n");
    
    // Find first non-empty line to determine where leading newlines end
    let firstContentLineIdx = allLines.findIndex(line => line.length > 0);
    if (firstContentLineIdx === -1) {
      // String contains only newlines (empty lines)
      firstContentLineIdx = allLines.length;
    }
    
    // Find last non-empty line to determine where trailing newlines start
    let lastContentLineIdx = -1;
    for (let i = allLines.length - 1; i >= 0; i--) {
      if (allLines[i]!.length > 0) {
        lastContentLineIdx = i;
        break;
      }
    }
    
    // Build the indented string
    const indentedParts: string[] = [];
    
    // Add leading empty lines (these are the leading newlines)
    for (let i = 0; i < firstContentLineIdx; i++) {
      indentedParts.push("\n");
    }
    
    // Add content lines with proper indentation
    if (firstContentLineIdx <= lastContentLineIdx) {
      for (let i = firstContentLineIdx; i <= lastContentLineIdx; i++) {
        const line = allLines[i]!;
        if (i === firstContentLineIdx && firstContentLineIdx === 0) {
          // First line, no leading newlines - add base indentation
          indentedParts.push(`${indent}  ${line}`);
        } else {
          // Subsequent content line - add indentation after newline
          indentedParts.push(`\n${indent}  ${line}`);
        }
      }
    }
    
    // Add trailing empty lines (these are the trailing newlines)
    for (let i = lastContentLineIdx + 1; i < allLines.length; i++) {
      indentedParts.push("\n");
    }
    
    let indented = indentedParts.join("");
    
    // If original had CRLF, convert back (but dedent uses \n, so we need to handle this)
    // Actually, since strings with CRLF won't use dedent (they're treated as having edge cases),
    // this code path shouldn't be hit for CRLF strings. But just in case:
    if (hasCRLF) {
      // Replace \n with \r\n in the indented string
      indented = indented.replaceAll("\n", "\r\n");
      // But the template literal structure uses \n, so we need to adjust
      // Actually, this is complex - let's just not use dedent for CRLF strings
    }
    
    const linesExpression = [
      `${dedentPrefix}\``,
      `${indent}  ${indented}`,
      `${indent}\`${dedentSuffix}`,
    ].join("\n");
    formatted = formatted.replace(`"${marker}"`, linesExpression);
  }
  return {
    code: formatted,
    needsDedent: markerCount > 0,
  };
}
