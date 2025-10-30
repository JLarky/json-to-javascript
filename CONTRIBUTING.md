# Contributing

## Install dependencies

Use mise to install dependencies:

```bash
mise run install
```

## Mise tasks

Common tasks are available via mise:

- format: Format TypeScript files with oxfmt

```bash
mise run format
```

- test: Run tests with Bun

```bash
mise run test
```

- workflows:build: Generate GitHub Actions workflows from TypeScript

```bash
mise run workflows:build
```

- workflows:clear: Remove generated GitHub Actions workflows

```bash
mise run workflows:clear
```

- actionlint: Run actionlint against workflows

```bash
mise run actionlint
```

## Publishing

Bump the version and push to `main`:

```bash
mise run bump-version
git push origin main
```

When `jsr.json` changes on `main`, the Create Release workflow (`.github/workflows/create-release.main.ts`) automatically creates a draft prerelease on GitHub with tag `v<version>`.

- Review the draft on [Releases](https://github.com/JLarky/gha-ts/releases), adjust notes, and publish it.

New release will trigger the Publish to npm workflow (`.github/workflows/publish-npm.main.ts`) to publish the package to npm.
