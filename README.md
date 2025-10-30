# json-to-javascript

Convert JSON data to JavaScript code literals with smart handling of multiline strings.

This tool transforms JSON into properly formatted JavaScript code, automatically converting multiline strings into template literals with dedent support for clean indentation.

## CLI Usage

### Example: Converting JSON with Multiline Strings

Input file (`input.json`):

```json
{
  "greeting": "Hello\nWorld",
  "message": "Line 1\nLine 2\nLine 3",
  "count": 42
}
```

**Node.js:**

```bash
npx @jlarky/json-to-javascript \
  --inputFile input.json \
  --outputFile output.ts \
  --useDedent true \
  --prefix "import dedent from 'dedent'; export const data = (" \
  --suffix ") as const" \
  --prettierOptions '{"parser":"babel-ts"}'
```

**Bun:**

```bash
bunx @jlarky/json-to-javascript \
  --inputFile input.json \
  --outputFile output.ts \
  --useDedent true \
  --prefix "import dedent from 'dedent'; export const data = (" \
  --suffix ") as const" \
  --prettierOptions '{"parser":"babel-ts"}'
```

**Deno:**

```bash
deno run --allow-sys=cpus --allow-env --allow-read=. --allow-write=. \
  jsr:@jlarky/json-to-javascript/cli \
  --inputFile input.json \
  --outputFile output.ts \
  --useDedent true \
  --prefix "import dedent from 'dedent'; export const data = (" \
  --suffix ") as const" \
  --prettierOptions '{"parser":"babel-ts"}'
```

Output file (`output.ts`):

```typescript
import dedent from "dedent";
export const data = {
  greeting: dedent`
    Hello
    World
  `,
  message: dedent`
    Line 1
    Line 2
    Line 3
  `,
  count: 42,
} as const;
```

### Basic Usage

```bash
npx @jlarky/json-to-javascript \
  --inputFile input.json \
  --outputFile output.js
```

This outputs the same JSON with default prefix `(` and suffix `)`:

```javascript
({
  greeting: "Hello\nWorld",
  message: "Line 1\nLine 2\nLine 3",
  count: 42,
});
```

The difference from the previous example: no custom prefix/suffix, import statement, or dedent - just the data wrapped in parentheses with escaped newlines.

### CLI Options

```
json-to-javascript [options]

Required:
  --inputFile <path>              Input JSON file
  --outputFile <path>             Output JavaScript file

Optional:
  --prefix <string>               Prefix for output (default: "(")
  --suffix <string>               Suffix for output (default: ")")
  --usePrettier <boolean>         Format with Prettier (default: true)
  --prettierOptions <json>        Prettier options as JSON string
  --useDedent <boolean>           Convert multiline strings to template literals
  --dedentPrefix <string>         Prefix for dedent (default: " dedent")
  --dedentSuffix <string>         Suffix for dedent (default: "")
  --jsonStringifySpace <number>   Indentation spaces for JSON.stringify
  --help                          Show help
```

## Installation

If you want to use the library in your code or install it locally:

### If using Deno:

```bash
deno add jsr:@jlarky/json-to-javascript
```

### If using Bun:

```bash
bunx jsr add @jlarky/json-to-javascript # or bun add @jlarky/json-to-javascript
```

### If using Node.js:

```bash
npx jsr add @jlarky/json-to-javascript # or npm install @jlarky/json-to-javascript
```

## Library Usage

```typescript
import { jsonToJavascript } from "@jlarky/json-to-javascript";

const data = { name: "John", age: 30 };
const result = await jsonToJavascript(data);
console.log(result.code); // ({ name: "John", age: 30 });
```

## Use Cases

- Generate configuration files from JSON
- Create test fixtures from JSON data
- Convert API responses to TypeScript constants
- Generate code with proper template literal formatting for multiline content

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, testing, and publishing guidelines.

## License

MIT
