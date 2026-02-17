
# GitHub PR Review Assistant

Review pull requests with a risk-first process using `gh`.

## Workflow

1. Require an explicit PR reference.
   - Accept only PR number (example: `123`) or PR URL.
   - Do not auto-select a PR from the current branch.

2. Collect deterministic PR context.
   - Run:

   ```bash
   core/skills/gh-review-assistant/scripts/collect_pr_context.sh <PR_NUMBER_OR_URL>
   ```

   - Optional environment variables:
     - `REPO=owner/repo` for cross-repo queries when the PR input is a number.
     - `MAX_DIFF_LINES=400` to cap diff excerpt lines.
     - `OUT_FORMAT=markdown` (default) or `OUT_FORMAT=json`.

3. Review with a risk-first lens.
   - Load `references/risk-review-checklist.md`.
   - Prioritize correctness, regressions, edge cases, CI/test gaps, and security risks.
   - Avoid style-only feedback unless it blocks maintainability.

4. Return feedback in this structure.
   1. Context/intent
   2. Risks/findings (highest severity first)
   3. Missing tests
   4. Suggested review comments (draft, not posted)
   5. Open questions

5. Keep default behavior read-only.
   - Prepare draft review text locally.
   - Do not run write actions unless the user explicitly asks to publish and confirms.

## Publish Escalation (Explicit Confirmation Required)

Run these commands only after clear user confirmation.

Comment on a PR:

```bash
gh pr comment <PR_NUMBER_OR_URL> --body-file <FILE>
```

Submit a review comment:

```bash
gh pr review <PR_NUMBER_OR_URL> --comment --body-file <FILE>
```

Request changes:

```bash
gh pr review <PR_NUMBER_OR_URL> --request-changes --body-file <FILE>
```

Approve:

```bash
gh pr review <PR_NUMBER_OR_URL> --approve --body-file <FILE>
```

