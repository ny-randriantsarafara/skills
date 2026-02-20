# WBD Platform PO Expert

Use this skill to convert product asks into delivery-ready plans grounded in the current WBD codebase.

## Workflow

1. Clarify outcome and constraints.
- Capture target users, markets/domains, KPI, deadline, and non-goals.
- If information is missing, state assumptions explicitly before planning.

2. Define editorial business rules before solutioning.
- For Multiplex-related asks, require the exact business definition (classification rule by content context), not only a UI label.
- For Highlight-related asks, list current side effects (for example metadata updates, field resets) and require preservation unless intentionally changed.
- Separate field visibility and mandatory behavior; require explicit validation rules for both.
- Require end-to-end validation scope: interaction level (UI) and business logic/API enforcement.
- Split scope by functional path: manual editorial flow, automated/bulk ingestion flow, or both.
- List existing entry prerequisites/gates that can block the path and hide downstream behavior.
- State explicit regression guardrails for non-targeted contexts and existing publishing flows.

3. Refresh repository intelligence when freshness matters.

```bash
core/skills/repo-intelligence/scripts/repo-intel.sh scan --root <WBD_ROOT>
core/skills/repo-intelligence/scripts/repo-intel.sh summarize --root <WBD_ROOT>
core/skills/repo-intelligence/scripts/repo-intel.sh graph --root <WBD_ROOT>
```

Default root for this workspace is `/Users/nrandriantsarafara/Works/wbd`.

4. Map scope to repositories.
- Read `references/platform-inventory.md`.
- Identify impacted repos and integration contracts (HTTP, queues, env vars, data stores).

5. Build a delivery-ready spec.
- Problem statement and measurable outcome.
- Scope in / scope out.
- Business rules and classification logic (including Multiplex definition when relevant).
- Visibility vs mandatory rules and end-to-end validation points.
- Scope split by flow (editorial vs ingestion) and upstream gates.
- Regression guardrails for unaffected contexts and flows.
- Impact matrix by repository.
- Incremental slices with dependency order.
- Acceptance criteria per slice.
- Rollout and rollback checks.

6. Convert to execution backlog.
- Create small, testable stories with a clear owner repo.
- Add integration checkpoints for multi-repo work.
- Add risk controls for high-risk repos (strict-mode gaps, cycle hotspots, high env complexity).

7. Produce decision-ready output.
- Use `references/po-output-template.md`.
- Distinguish facts, assumptions, and open questions.
- Cite evidence with repository or `.repo-intel` file paths.

## Guardrails

- Do not invent endpoints, queues, environments, or ownership boundaries.
- Treat `.repo-intel` and repository files as source of truth.
- Always include integration and rollout validation when scope spans multiple repos.
- Never treat UI visibility as proof of business mandatory constraints; both must be specified and tested separately.
- Any requirement that touches Highlight must document current side effects and expected side-effect behavior after change.
- Any requirement that touches Multiplex must provide an auditable business classification rule.
- Always state what remains unchanged for non-targeted contexts, non-highlighted cases, and existing publishing paths.
- Never expose secrets; keep credential values as placeholders.
