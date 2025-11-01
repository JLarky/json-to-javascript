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
  ...substitutions: never[]
): string;
export function lines(scriptOrStrings: string | TemplateStringsArray): string {
  const strInput =
    typeof scriptOrStrings === "string" ? scriptOrStrings : scriptOrStrings[0];
  
  if (!strInput) {
    return strInput;
  }
  
  // Split into lines preserving the structure
  let linesArray = strInput.split("\n");
  
  // Template literals typically have:
  // - First line: empty or just whitespace (from opening backtick on previous line)
  // - Middle lines: content with indentation
  // - Last line: just whitespace (from closing backtick)
  // We want to remove the first empty line and last whitespace-only line
  // if they exist, but preserve the exact content otherwise
  
  // Remove leading empty/whitespace-only line (from template literal opening)
  if (linesArray.length > 0 && /^\s*$/.test(linesArray[0]!)) {
    linesArray = linesArray.slice(1);
  }
  
  // Remove trailing whitespace-only line (from template literal closing)
  if (linesArray.length > 0 && /^\s*$/.test(linesArray[linesArray.length - 1]!)) {
    linesArray = linesArray.slice(0, -1);
  }
  
  if (linesArray.length === 0) {
    return "";
  }
  
  // Find the minimum indentation from all lines (including empty lines that might have spaces)
  // This handles cases like "\n\n\n" which become "    \n    \n    " in template literals
  let minIndent = Infinity;
  let hasAnyIndentation = false;
  
  for (let i = 0; i < linesArray.length; i++) {
    const line = linesArray[i];
    if (line) {
      // Check if line starts with spaces (even if it's just spaces)
      const leadingSpaces = line.match(/^( +)/)?.[1]?.length || 0;
      if (leadingSpaces > 0) {
        hasAnyIndentation = true;
        if (leadingSpaces < minIndent) {
          minIndent = leadingSpaces;
        }
      }
    }
  }
  
  // If we found a common indentation pattern, remove it from all lines
  // This preserves trailing spaces and exact content structure
  if (hasAnyIndentation && minIndent > 0 && minIndent !== Infinity) {
    const indentPattern = new RegExp(`^ {${minIndent}}`);
    return linesArray
      .map((line) => {
        // Remove indentation if the line has at least that many spaces at the start
        if (line && line.length >= minIndent && /^ +/.test(line)) {
          return line.replace(indentPattern, "");
        }
        return line;
      })
      .join("\n");
  } else {
    // No common indentation found, return as-is (but with template literal artifacts removed)
    return linesArray.join("\n");
  }
}
