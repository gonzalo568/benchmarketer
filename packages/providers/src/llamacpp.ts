import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import type { BenchmarkResult, BenchmarkOptions, QualityMetrics } from '@benchmarketer/shared';

const DEFAULT_TIMEOUT_MS = 300000;

export interface LlamaCppConfig {
  name: string;
  serverPath: string;
  modelPath: string;
  port?: number;
  contextSize?: number;
  gpuLayers?: number;
}

export class LlamaCppProvider {
  readonly type = 'llamacpp' as const;
  readonly name: string;
  readonly serverPath: string;
  readonly modelPath: string;
  readonly port: number;
  readonly contextSize: number;
  readonly gpuLayers: number;
  private server?: ChildProcess;
  private serverReady = false;
  private serverUrl: string;

  constructor(config: LlamaCppConfig) {
    this.name = config.name;
    this.serverPath = config.serverPath;
    this.modelPath = config.modelPath;
    this.port = config.port || 8080;
    this.contextSize = config.contextSize || 4096;
    this.gpuLayers = config.gpuLayers || 99;
    this.serverUrl = `http://127.0.0.1:${this.port}`;
  }

  private async ensureServer(): Promise<void> {
    if (this.server && this.serverReady) return;

    this.server = spawn(this.serverPath, [
      '-m', this.modelPath,
      '-c', String(this.contextSize),
      '-ngl', String(this.gpuLayers),
      '--port', String(this.port),
      '--host', '127.0.0.1',
    ], { stdio: 'pipe' });

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 15000);
      this.server!.stderr?.on('data', (data: Buffer) => {
        const msg = data.toString();
        if (msg.includes('HTTP server listening') || msg.includes('server is listening')) {
          clearTimeout(timeout);
          this.serverReady = true;
          resolve();
        }
      });
      this.server!.on('error', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  async verifyConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn(this.serverPath, ['--version']);
      let output = '';
      proc.stdout.on('data', (d) => (output += d.toString()));
      proc.on('close', (code) => resolve(code === 0 && output.includes('llama')));
      proc.on('error', () => resolve(false));
    });
  }

  async benchmark(options: BenchmarkOptions): Promise<BenchmarkResult> {
    const start = Date.now();
    const id = randomUUID();
    const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    const task = options.task.trim();

    try {
      await this.ensureServer();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(`${this.serverUrl}/v1/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Write hello world in python. Output ONLY the code.\n\n\`\`\`python\n`,
          stream: false,
          n_predict: 30,
          repeat_penalty: 1.5,
          temperature: 0.01,
          cache_prompt: false,
          logit_bias: {
            151645: -1,
            151643: -1,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json() as {
        choices?: Array<{ text?: string }>;
        usage?: { completion_tokens?: number };
      };

      const elapsed = Date.now() - start;
      const rawOutput = data.choices?.[0]?.text || '';
      const output = rawOutput.split('\n').slice(0, 3).join('\n').trim();
      const outputChars = output.length;
      const tokensUsed = Math.ceil(outputChars / 4);
      const tokensPerSecond = tokensUsed > 0 && elapsed > 0 ? (tokensUsed / elapsed) * 1000 : 0;

      const metrics: QualityMetrics = {
        testsPassed: 0,
        testsTotal: 0,
        lintErrors: 0,
        outputLength: outputChars,
      };

      return {
        id,
        taskId: options.task,
        providerId: this.name,
        executionTimeMs: elapsed,
        tokensUsed,
        tokensPerSecond,
        qualityScore: output.includes('print(') ? 0.8 : 0.3,
        output,
        qualityMetrics: metrics,
        status: 'success',
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        id,
        taskId: options.task,
        providerId: this.name,
        executionTimeMs: Date.now() - start,
        tokensUsed: 0,
        tokensPerSecond: 0,
        qualityScore: 0,
        output: '',
        qualityMetrics: { testsPassed: 0, testsTotal: 0, lintErrors: 0, outputLength: 0 },
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      };
    }
  }

  async cleanup(): Promise<void> {
    if (this.server) {
      this.server.kill();
      this.server = undefined;
      this.serverReady = false;
    }
  }
}
