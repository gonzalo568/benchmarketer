import type { BenchmarkResult, BenchmarkTask } from '@benchmarketer/shared';

export interface CompletionOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface IProvider {
  readonly type: string;
  readonly name: string;

  complete(options: CompletionOptions): Promise<{ output: string; tokensUsed: number; elapsedMs: number }>;

  verifyConnection(): Promise<{ verified: boolean; message: string }>;

  listModels?(): Promise<Array<{ name: string; id: string }>>;

  cleanup?(): Promise<void>;
}
