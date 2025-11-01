# Dedent Conversion Task Context (Session Snapshot)

## Current Status (Post Implementation)

Added trailing backslash exclusion: any multiline string ending with one or more backslashes (`/\\+$/`) now skipped to prevent silent trimming.
Broadened earlier rule already in place for runs of backslashes before newline (`/\\+\n/`). All docs and tests updated.
Whitespace-tail variant (e.g. `\\ ` at end) intentionally still allowed; may revisit if needed.

## Current Heuristic (index.ts)

Excludes multiline conversion if string contains:

- Backticks (unless debug override flag is set)
- Dollar signs (to avoid accidental interpolation) — slated for future relaxation
- Any run of backslashes directly before a newline (`/\\+\n/`)

Pending addition:

- Trailing backslashes at end of the entire multiline string (`/\\+$/`)

## Needed Changes

1. Implement trailing backslash exclusion in `shouldConvertMultiline`.
2. Update inline comment in `index.ts` documenting both backslash rules.
3. Update `README.md`, `CONTRIBUTING.md`, and `plan.md` to mention both exclusions (run-before-newline and trailing).
4. Adjust property-test generator filter: exclude samples matching `/\\+$/`.
5. Add explicit tests verifying exclusion for endings like `"line\\n\\"` and `"line\\n\\\\"`.
6. Run test suite; confirm all pass.
7. Briefly scan for whitespace-tail variants (e.g. backslash + spaces + end). Decide whether to keep strict `/\\+$/` or expand to `/\\+\s*$/` (currently favor strict form to avoid over-exclusion).
8. Final summary & possible instrumentation idea (optional): emit reason for exclusion.

## Todo List

- [COMPLETED] Add trailing backslash exclusion heuristic (`/\\+$/`).
- [COMPLETED] Update docs with new exclusion rule.
- [COMPLETED] Adjust tests & add trailing backslash cases.
- [COMPLETED] Run test suite to verify changes.
- [COMPLETED] Finalize summary and next steps.

## Edge Case Notes

- Multiple trailing backslashes: ensure no conversion (e.g. ends with `\\\\`)
- Avoid false positives: single backslash elsewhere in string not before newline and not at end should still convert (unless other exclusions apply).
- Dollar sign rule might later switch to heuristic allowing if no `${` present.

## Rationale for Trailing Backslash Exclusion

Template literals treat backslashes as escape initiators; final trimming/dedent may alter representation, leading to silent loss. Safer to skip conversion until a robust preservation method is implemented.

## Next Immediate Action

Modify `index.ts` `shouldConvertMultiline` to add: `if (/\\+$/.test(value)) return false;` right after the existing backslash-newline check, then proceed with docs/tests updates.

---

This file is a checkpoint so the next session can resume without re-deriving context.
