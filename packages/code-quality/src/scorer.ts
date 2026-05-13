import type { ScoredFunction, CodeQualityResult } from './types';

const PASS_THRESHOLD = 8;
const BONUS_CAP = 40;

export function scoreFunction(
  expected: string[],
  predicted: string[],
  options: {
    passThreshold?: number;
    bonusCap?: number;
    relaxIndent?: boolean;
  } = {}
): ScoredFunction {
  const passThreshold = options.passThreshold ?? PASS_THRESHOLD;
  const bonusCap = options.bonusCap ?? BONUS_CAP;
  const relaxIndent = options.relaxIndent ?? false;

  const primaryTotal = Math.min(expected.length, 20);
  const primaryExpected = expected.slice(0, primaryTotal);
  const bonusExpected = expected.slice(primaryTotal, primaryTotal + bonusCap);

  const normalize = (line: string) => {
    let n = line.replace(/\s+$/, ''); // trailing whitespace
    if (relaxIndent) {
      n = n.trim();
    }
    // Normalize quotes: single → double for comparison
    n = n.replace(/'/g, '"');
    return n;
  };

  const normalizedExpected = primaryExpected.map(normalize);
  const normalizedPredicted = predicted.map(normalize);

  const matched = new Map<number, number>();
  const matchedIndices = new Set<number>();

  for (let i = 0; i < normalizedExpected.length; i++) {
    if (normalizedExpected[i] === '') continue;

    for (let j = 0; j < normalizedPredicted.length; j++) {
      if (matchedIndices.has(j)) continue;
      if (normalizedExpected[i] === normalizedPredicted[j]) {
        matched.set(i, j);
        matchedIndices.add(j);
        break;
      }
    }
  }

  let primaryMatched = 0;
  let bonusMatched = 0;

  for (const [expIdx, predIdx] of matched.entries()) {
    if (expIdx < primaryTotal) {
      primaryMatched++;
    } else if (expIdx < expected.length) {
      bonusMatched++;
    }
  }

  const hallucinated = normalizedPredicted.filter((line, idx) => {
    if (line === '') return false;
    return !matchedIndices.has(idx);
  }).length;

  const passed = primaryMatched >= passThreshold;

  return {
    name: '',
    passed,
    primaryMatched,
    primaryTotal,
    hallucinated,
    bonusMatched,
    latencyMs: 0,
  };
}

export function calculateCodeQualityScore(result: ScoredFunction): number {
  if (result.primaryTotal === 0) return 0;

  const primaryRatio = result.primaryMatched / result.primaryTotal;
  const bonusRatio = result.bonusMatched > 0 ? Math.min(result.bonusMatched / 20, 0.2) : 0;
  const hallucinationPenalty = result.hallucinated > 0
    ? Math.min(result.hallucinated / result.primaryTotal, 0.3)
    : 0;

  const score = primaryRatio + bonusRatio - hallucinationPenalty;
  return Math.max(0, Math.min(1, score));
}

export function aggregateResults(results: ScoredFunction[]): CodeQualityResult {
  const totalPass = results.filter(r => r.passed).length;
  const passRate = results.length > 0 ? totalPass / results.length : 0;

  const totalMatched = results.reduce((sum, r) => sum + r.primaryMatched, 0);
  const totalPrimary = results.reduce((sum, r) => sum + r.primaryTotal, 0);
  const totalHallucinated = results.reduce((sum, r) => sum + r.hallucinated, 0);
  const totalBonus = results.reduce((sum, r) => sum + r.bonusMatched, 0);

  const recall = totalPrimary > 0 ? totalMatched / totalPrimary : 0;
  const precision = (totalMatched + totalHallucinated) > 0
    ? totalMatched / (totalMatched + totalHallucinated)
    : 0;

  const score = (recall + precision) > 0
    ? 2 * (precision * recall) / (precision + recall)
    : 0;

  return {
    functions: results,
    passRate,
    totalMatched,
    totalPrimary,
    totalHallucinated,
    totalBonus,
    score,
  };
}

export function processOutput(output: string): string[] {
  let processed = output;

  processed = processed.replace(/<think>[\s\S]*?<\/think>/gi, '');

  processed = processed.replace(/```[\s\S]*?```/g, (match) => {
    const inner = match.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '');
    return inner;
  });

  const lines = processed.split('\n');

  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  return lines;
}
