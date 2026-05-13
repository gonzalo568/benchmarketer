import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import type { BenchmarkResult, BenchmarkOptions, QualityMetrics } from '@benchmarketer/shared';
import type { IProvider, CompletionOptions } from './provider-interface';

const DEFAULT_TIMEOUT_MS = 300000;

export interface LlamaCppConfig {
  id?: string;
  name: string;
  serverPath: string;
  modelPath: string;
  host?: string;
  port?: number;
  contextSize?: number;
  gpuLayers?: number;
  settings?: {
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
  };
}

export class LlamaCppProvider implements IProvider {
  readonly type = 'llamacpp' as const;
  readonly id: string;
  readonly name: string;
  readonly serverPath: string;
  readonly modelPath: string;
  readonly host: string;
  readonly port: number;
  readonly contextSize: number;
  readonly gpuLayers: number;
  private readonly settings: NonNullable<LlamaCppConfig['settings']>;
  private server?: ChildProcess;
  private serverReady = false;
  private serverUrl: string;

  constructor(config: LlamaCppConfig) {
    this.id = config.id || `llamacpp-${crypto.randomUUID()}`;
    this.name = config.name;
    this.serverPath = config.serverPath;
    this.modelPath = config.modelPath;
    this.host = config.host || '127.0.0.1';
    this.port = config.port || 8080;
    this.contextSize = config.contextSize || 4096;
    this.gpuLayers = config.gpuLayers || 99;
    this.settings = config.settings || { temperature: 0.1, maxTokens: 400, timeoutMs: DEFAULT_TIMEOUT_MS };
    this.serverUrl = `http://${this.host}:${this.port}`;
  }

  private async ensureServer(): Promise<void> {
    let needsRestart = false;
    let currentModel = '';

    if (this.server && this.serverReady) {
      try {
        const res = await fetch(`${this.serverUrl}/v1/models`);
        if (res.ok) {
          const data = await res.json() as { models?: Array<{ name?: string }> };
          currentModel = data.models?.[0]?.name || '';
          const expectedModel = this.modelPath.split('/').pop() || '';
          if (currentModel && !currentModel.includes(expectedModel)) {
            needsRestart = true;
            this.server.kill();
            this.server = undefined;
            this.serverReady = false;
          }
        }
      } catch {
        needsRestart = true;
        this.serverReady = false;
      }
    } else if (!this.server) {
      needsRestart = true;
    }

    if (needsRestart || !this.server) {
      this.server = spawn(this.serverPath, [
        '-m', this.modelPath,
        '-c', String(this.contextSize),
        '-ngl', String(this.gpuLayers),
        '--port', String(this.port),
        '--host', this.host,
      ], { stdio: 'pipe' });

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 20000);
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
  }

  async complete(options: CompletionOptions): Promise<{ output: string; tokensUsed: number; elapsedMs: number }> {
    const start = Date.now();
    const timeout = options.timeoutMs || this.settings.timeoutMs || DEFAULT_TIMEOUT_MS;

    await this.ensureServer();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const stopTokens = ['\n\n\n\n\n'];

      const res = await fetch(`${this.serverUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
            { role: 'user' as const, content: options.prompt }
          ],
          temperature: options.temperature ?? this.settings.temperature,
          max_tokens: options.maxTokens ?? this.settings.maxTokens,
          stop: stopTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json() as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { completion_tokens?: number };
        timings?: {
          prompt_per_second?: number;
          predicted_per_second?: number;
        };
      };

      const elapsed = Date.now() - start;
      let output = data.choices?.[0]?.message?.content || '';

      output = output
        .replace(/<\|channel\|思想\|>/gi, '')
        .replace(/<\|channel\|>/gi, '')
        .replace(/<\|思想\|>/gi, '')
        .replace(/<channel\|思想\|>/gi, '')
        .replace(/<channel\|>/gi, '')
        .replace(/<\|channel\|thought\|>/gi, '')
        .replace(/<\|thought\|>/gi, '')
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/^[\s\n\-#*]+/gm, '')
        .trim();

      const codeBlockMatch = output.match(/```(?:python)?\n([\s\S]*?)\n```/);
      if (codeBlockMatch) {
        output = codeBlockMatch[1].trim();
      }

      const tokensUsed = data.usage?.completion_tokens || Math.ceil(output.length / 4);

      return { output, tokensUsed, elapsedMs: elapsed };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  async benchmark(options: BenchmarkOptions): Promise<BenchmarkResult> {
    const start = Date.now();
    const id = randomUUID();
    const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    const task = options.task.trim();

    try {
      const { output, tokensUsed, elapsedMs } = await this.complete({
        prompt: `You are a coding assistant. Output ONLY code, no explanations, no markdown.\n${task}\n\nCode:\n`,
        temperature: 0.1,
        timeoutMs,
      });

      const tokensPerSecond = tokensUsed > 0 && elapsedMs > 0 ? (tokensUsed / elapsedMs) * 1000 : 0;

      const metrics: QualityMetrics = {
        testsPassed: 0,
        testsTotal: 0,
        lintErrors: 0,
        outputLength: output.length,
      };

      return {
        id,
        taskId: options.task,
        providerId: this.name,
        providerName: this.name,
        executionTimeMs: elapsedMs,
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
        providerName: this.name,
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

  async verifyConnection(): Promise<{ verified: boolean; message: string }> {
    try {
      await this.ensureServer();
      const res = await fetch(`${this.serverUrl}/health`);
      if (res.ok) {
        return { verified: true, message: `llama.cpp server running on port ${this.port}` };
      }
      return { verified: false, message: `llama.cpp health check failed` };
    } catch (err) {
      return { verified: false, message: `llama.cpp server not reachable: ${err instanceof Error ? err.message : String(err)}` };
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
