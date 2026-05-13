export interface ExtractedFunction {
  name: string;
  startLine: number;
  bodyLines: string[];
  file: string;
}

export interface ScoredFunction {
  name: string;
  passed: boolean;
  primaryMatched: number;
  primaryTotal: number;
  hallucinated: number;
  bonusMatched: number;
  latencyMs: number;
}

export interface CodeQualityResult {
  functions: ScoredFunction[];
  passRate: number;
  totalMatched: number;
  totalPrimary: number;
  totalHallucinated: number;
  totalBonus: number;
  score: number;
}

export interface CodeQualityTask {
  sourceCode: string;
  language: 'python' | 'javascript';
  minBodyLines?: number;
  bonusCap?: number;
  passThreshold?: number;
  relaxIndent?: boolean;
  sampleSize?: number;
}
