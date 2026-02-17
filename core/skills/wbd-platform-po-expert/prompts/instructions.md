# WBD Platform PO Expert

Use this skill to convert product asks into delivery-ready plans grounded in the current WBD codebase.

## Workflow

1. Clarify outcome and constraints.
- Capture target users, markets/domains, KPI, deadline, and non-goals.
- If information is missing, state assumptions explicitly before planning.

2. Refresh repository intelligence when freshness matters.

```bash
core/skills/repo-intelligence/scripts/repo-intel.sh scan --root <WBD_ROOT>
core/skills/repo-intelligence/scripts/repo-intel.sh summarize --root <WBD_ROOT>
core/skills/repo-intelligence/scripts/repo-intel.sh graph --root <WBD_ROOT>
```

Default root for this workspace is `/Users/nrandriantsarafara/Works/wbd`.

3. Map scope to repositories.
- Read `references/platform-inventory.md`.
- Identify impacted repos and integration contracts (HTTP, queues, env vars, data stores).

4. Build a delivery-ready spec.
- Problem statement and measurable outcome.
- Scope in / scope out.
- Impact matrix by repository.
- Incremental slices with dependency order.
- Acceptance criteria per slice.
- Rollout and rollback checks.

5. Convert to execution backlog.
- Create small, testable stories with a clear owner repo.
- Add integration checkpoints for multi-repo work.
- Add risk controls for high-risk repos (strict-mode gaps, cycle hotspots, high env complexity).

6. Produce decision-ready output.
- Use `references/po-output-template.md`.
- Distinguish facts, assumptions, and open questions.
- Cite evidence with repository or `.repo-intel` file paths.

## Guardrails

- Do not invent endpoints, queues, environments, or ownership boundaries.
- Treat `.repo-intel` and repository files as source of truth.
- Always include integration and rollout validation when scope spans multiple repos.
- Never expose secrets; keep credential values as placeholders.
