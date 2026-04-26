---
title: 'Quality Scoring Enhancement'
type: 'feature'
created: '2026-04-26'
status: 'done'
baseline_commit: 'b6b5eaba0774113aa156db281fcee701776aacfe5648b32c3fac3851eab42202'
context:
  - 'apps/api/src/routes/benchmarks.ts'
---

## Intent

**Problem:** Quality scoring was basic (0.5 base + patterns) and didn't distinguish between concise code and verbose/boilerplate-heavy code.

**Approach:**
1. Penalize common boilerplate patterns (if __name__ == "__main__", def main(), etc.)
2. Reward concise outputs that are close to minimum expected length
3. Bonus for high code density (code characters / total characters)

## Quality Scoring Algorithm

```
Base: 0.5

Expected patterns match: +0 to 0.4 (based on % of expected patterns found)
Forbidden patterns: -0 to 0.5 (based on % of forbidden patterns found)

Triple backticks: -0.5
Output > 100 lines: -0.2
Output > 200 lines: -0.2
Repeated patterns: -0.3

Boilerplate (if __name__, def main(), etc.): -0.1
Concise output bonus: +0.15 (if lines > minExpected and <= minExpected + 5)
Code density > 0.5: +0.1

Final: clamped to [0, 1]
```

## Code Map

- `apps/api/src/routes/benchmarks.ts` -- MODIFY -- calculateQualityScore() function

## Tasks & Acceptance

- [x] `apps/api/src/routes/benchmarks.ts` -- MODIFY -- Added boilerplate penalty (-0.1)
- [x] `apps/api/src/routes/benchmarks.ts` -- MODIFY -- Added concise output bonus (+0.15)
- [x] `apps/api/src/routes/benchmarks.ts` -- MODIFY -- Added code density bonus (+0.1)

## Acceptance Criteria

- Given a boilerplate-heavy output (if __name__ == "__main__"), when scored, then 0.1 penalty is applied
- Given a concise output close to minimum expected lines, when scored, then 0.15 bonus is applied
- Given an output with high code density (>50% non-whitespace), when scored, then 0.1 bonus is applied

## Spec Change Log

- 2026-04-26: Initial spec created
- 2026-04-26: Boilerplate penalty (-0.1), concise bonus (+0.15), code density bonus (+0.1) implemented