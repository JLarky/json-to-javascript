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

  if (!strInput) {
    return strInput;
  }

  let linesArray = strInput.split("\n");

  if (linesArray.length > 0 && /^\s*$/.test(linesArray[0]!)) {
    linesArray = linesArray.slice(1);
  }

  if (
    linesArray.length > 0 &&
    /^\s*$/.test(linesArray[linesArray.length - 1]!)
  ) {
    linesArray = linesArray.slice(0, -1);
  }

  if (linesArray.length === 0) {
    return "";
  }

  let minIndent = Infinity;
  let hasAnyIndentation = false;

  for (let i = 0; i < linesArray.length; i++) {
    const line = linesArray[i];
    if (line) {
      const leadingSpaces = line.match(/^( +)/)?.[1]?.length || 0;
      if (leadingSpaces > 0) {
        hasAnyIndentation = true;
        if (leadingSpaces < minIndent) {
          minIndent = leadingSpaces;
        }
      }
    }
  }

  if (hasAnyIndentation && minIndent > 0 && minIndent !== Infinity) {
    const indentPattern = new RegExp(`^ {${minIndent}}`);
    return linesArray
      .map((line) => {
        if (line && line.length >= minIndent && /^ +/.test(line)) {
          return line.replace(indentPattern, "");
        }
        return line;
      })
      .join("\n");
  } else {
    return linesArray.join("\n");
  }
}
