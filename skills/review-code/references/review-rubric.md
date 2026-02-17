# TypeScript Code Review Rubric

Use this as a checklist while reviewing.

## Understand first (ask if missing)
- What is the user/business intent?
- What are the success criteria and edge cases?
- What are the performance/reliability constraints?
- What conventions/patterns already exist in this codebase?

## Correctness & behavior
- Logic bugs, wrong assumptions, race conditions
- Error handling and failure modes
- Input validation / nullability / boundary conditions
- Concurrency (async flows), retries, idempotency

## TypeScript quality
- Sound types (avoid `any`, avoid unsafe assertions)
- Narrowing and exhaustiveness (`never` checks)
- Proper generics usage (not over-generic)
- Runtime vs type-level mismatch (types that lie)

## API & architecture
- Clear responsibilities, minimal coupling
- Naming expresses intent
- Public API shape: ergonomic, hard to misuse
- Avoid abstraction unless it pays for itself

## Maintainability
- Readability, clear control flow
- Unnecessary complexity or cleverness
- Tests: what’s covered/missing, flaky risks
- Localized change vs sweeping refactors

## Performance (only where it matters)
- Hot paths, unnecessary allocations
- I/O: over-fetching, n+1, batching
- Caching correctness

## Security (as applicable)
- Injection, authz/authn, secrets, logging PII
