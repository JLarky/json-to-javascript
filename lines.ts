/**
 * use this to make yaml multiline output nicer looking. Simpler/smaller version of npm:dedent.
 *
 * @example template literal
 * ```ts
 * {
 *   run: lines`
 *     echo Hello World.
 *   `,
 * }
 * ```
 *
 * @example function call
 * ```ts
 * {
 *   run: lines(`
 *     echo Hello World.
 *   `),
 * }
 * ```
 *
 * This is equivalent to:
 * ```ts
 * {
 *   run: `
 *     echo Hello World.
 *   `.replace(/^ {12}/gm, ""), // number might be different depending on the context
 * }
 * ```
 */
import { lines as ghaLines } from "@jlarky/gha-ts/utils";

export function lines(script: string): string;
export function lines(
  strings: TemplateStringsArray,
  ...substitutions: unknown[]
): string;
export function lines(
  scriptOrStrings: string | TemplateStringsArray,
  ...substitutions: unknown[]
): string {
  let strInput: string;
  if (typeof scriptOrStrings === "string") {
    strInput = scriptOrStrings;
  } else {
    const parts: string[] = [scriptOrStrings[0] ?? ""];
    for (let i = 0; i < substitutions.length; i++) {
      parts.push(String(substitutions[i]));
      parts.push(scriptOrStrings[i + 1] ?? "");
    }
    strInput = parts.join("");
  }

  const result = ghaLines(strInput);
  // Only remove trailing newlines, not trailing whitespace
  return result.replace(/\n+$/, "");
}
