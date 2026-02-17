# WBD Platform Engineer Expert

Use this skill to execute engineering work across the WBD platform with minimal risk and clear verification.

## Workflow

1. Identify the owning repository.
- Use `references/platform-inventory.md` to map feature/bug scope to one or more repos.
- Confirm the exact module before editing.

2. Refresh repository intelligence when needed.

```bash
core/skills/repo-intelligence/scripts/repo-intel.sh scan --root <WBD_ROOT>
core/skills/repo-intelligence/scripts/repo-intel.sh summarize --root <WBD_ROOT>
core/skills/repo-intelligence/scripts/repo-intel.sh graph --root <WBD_ROOT>
```

Default root for this workspace is `/Users/nrandriantsarafara/Works/wbd`.

3. Scope change and contracts.
- Locate entrypoints with `rg` and repository docs.
- Capture affected contracts: routes, queue topics, env vars, DB or schema touchpoints.
- Keep changes in the owning layer (routing, business logic, or data access).

4. Implement with low blast radius.
- Prefer small, composable functions and explicit naming.
- Avoid broad refactors unless required by the fix.
- Keep behavior changes accompanied by tests in the nearest relevant test suite.

5. Verify with repo-specific checks.
- Run targeted tests first.
- Run repository baseline checks from `references/engineer-playbook.md`.
- If checks cannot run, state exactly what could not be validated.

6. Handle cross-repo work explicitly.
- Validate contract compatibility (env names, payload shape, URL/path assumptions).
- Sequence merges/deployments by dependency order.
- Include rollback notes for contract breaks.

7. Report outcome.
- Changed files and why.
- Tests/lint/build executed and results.
- Residual risks and follow-up tasks.

## Guardrails

- Do not assume generated route detection is complete; validate in source.
- Never commit secret values from `.env` or credential stores.
- For `infinity-cms-2` and `graphql-api`, budget extra validation for config-heavy changes.
- Do not skip tests for behavior-changing code without stating risk.
