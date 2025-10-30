#!/usr/bin/env -S node --no-warnings
import { workflow } from "@jlarky/gha-ts/workflow-types";
import { generateWorkflowYaml } from "./utils/yaml.ts";
import { checkoutStep } from "./utils/steps.ts";
import { installMise } from "./utils/steps.ts";
import { lines } from "@jlarky/gha-ts/utils";

const wf = workflow({
  name: "Publish to npm",
  on: {
    push: {
      branches: ["feat-npm-publish"],
      tags: ["v*"],
    },
  },
  permissions: {
    "id-token": "write",
    contents: "read",
  },
  jobs: {
    publishNpm: {
      name: "Publish to npm",
      "runs-on": "ubuntu-latest",
      steps: [
        {
          name: "Extract version from tag",
          id: "version",
          run: lines(`
            VERSION="\${{ github.ref }}"
            VERSION="\${VERSION#refs/tags/v}"
            echo "version=\${VERSION}" >> "$GITHUB_OUTPUT"`),
        },
        {
          run: lines`echo "Hello world! Publishing version \${{ steps.version.outputs.version }}"`,
        },
        checkoutStep(),
        installMise(),
        {
          name: "Publish package",
          run: lines`mise run clone-to-npm --publish --ci -d "$RUNNER_TEMP" --publish`,
        },
        {
          run: lines`pwd && ls -la`,
          "working-directory": "${{ runner.temp }}/npm",
        },
        {
          uses: "actions/setup-node@v4",
          with: {
            "node-version": 24,
            "registry-url": "https://registry.npmjs.org",
          },
        },
        {
          uses: "actions/upload-artifact@v4",
          if: "${{ always() }}",
          with: {
            name: "npm-package-${{ steps.version.outputs.version }}",
            path: "${{ runner.temp }}/npm",
            "retention-days": 3,
          },
        },
      ],
    },
  },
});

await generateWorkflowYaml(wf, import.meta.url);
