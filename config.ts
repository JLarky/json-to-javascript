// Central configuration for debug / experimental flags.
// DEBUG_ALLOW_BACKTICKS: when true, multiline strings containing backticks (`) are eligible
// for conversion into template literals (they will have backticks escaped as \`).
export function debugAllowBackticks(): boolean {
  return process.env.JSON_TO_JS_DEBUG_ALLOW_BACKTICKS === "1";
}
