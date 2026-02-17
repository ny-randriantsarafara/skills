# Risk-First PR Review Checklist

Use this checklist to focus feedback on delivery risk first.

## Correctness and Regressions
- Validate behavior against intended outcome, not only implementation details.
- Check for logic breaks in boundary conditions and null/empty inputs.
- Verify backward compatibility on public APIs and data contracts.

## Edge Cases and Failure Handling
- Confirm error paths return actionable, consistent failures.
- Check retries/timeouts/cancellation behavior for async and network flows.
- Ensure partial failures cannot leave inconsistent state.

## CI and Checks
- Read failing and flaky checks before reviewing style concerns.
- Link each blocking finding to concrete failing behavior or missing guard.
- Flag risk when required checks are pending or skipped without reason.

## Testing Gaps
- Look for missing unit tests around new branches and error paths.
- Ask for integration/E2E coverage when changes span boundaries.
- Prefer small targeted tests over broad, brittle snapshots.

## Security and Privacy
- Check authorization assumptions and data access boundaries.
- Flag risky logging (secrets, tokens, PII) and unsafe input handling.
- Verify dependency/tooling changes do not widen attack surface unexpectedly.
