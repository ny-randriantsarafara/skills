---
name: typescript-code-review
description: Senior TypeScript engineer “code buddy” review workflow. Use when the user asks for a code review / PR review / review comments on TypeScript (Node/React) code, wants pragmatic bug-finding, edge-case analysis, TypeScript correctness, and maintainable suggestions (not cargo-cult refactors).
---

# TypeScript Code Review (Senior Buddy)

Review code like a strong human teammate: understand intent first, then flag real risks, then propose pragmatic improvements with clear reasons.

## Review workflow

### 0) Build context (don’t guess)
- Identify: **what changed**, **why**, and **what “done” means**.
- If context is missing, ask 1–5 targeted questions (don’t speculate).

### 1) Read for intent and behavior
- Summarize the intended behavior in 2–5 bullets.
- Call out what’s *good* (clarity, testability, good types, good boundaries).

### 2) Find real issues
Prioritize correctness over style.
- Bugs, edge cases, failure modes
- Unclear logic / surprising control flow
- TypeScript unsoundness (types that lie, unsafe assertions)
- Performance problems *only if plausible / in a hot path*
- Security/privacy risks where relevant

### 3) Suggest improvements (pragmatic)
- Provide fixes with **reason + benefit**.
- Prefer small, local changes.
- Respect existing conventions unless they harm clarity/correctness.
- Avoid sweeping refactors unless the payoff is obvious.

### 4) Output format (structured “thinking out loud”)
Use this structure in the response:
1. **Context/intent (my understanding)**
2. **What’s good**
3. **Risks / bugs / edge cases** (highest impact first)
4. **TypeScript-specific notes**
5. **Suggested changes** (with example snippets)
6. **Questions / missing context**

## Notes
- When scanning feedback comments, treat them as requirements/constraints.
- If you need a checklist, read: `references/review-rubric.md`.
