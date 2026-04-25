import { Router } from 'express';
import type { BenchmarkExecution, LLMProvider, BenchmarkResult } from '@benchmarketer/shared';
import { LlamaCppProvider } from '@benchmarketer/providers';
import { loadBenchmarks, saveBenchmarks } from '../lib/benchmarks-persistence';
import { loadProviders } from '../lib/persistence';

export const benchmarksRouter = Router();

let executions: Map<string, BenchmarkExecution> = new Map();
let initialized = false;

async function initBenchmarks() {
  if (!initialized) {
    executions = await loadBenchmarks();
    initialized = true;
  }
}

benchmarksRouter.get('/', async (_req, res) => {
  await initBenchmarks();
  res.json(Array.from(executions.values()));
});

benchmarksRouter.get('/:id', async (req, res) => {
  await initBenchmarks();
  const execution = executions.get(req.params.id);
  if (!execution) {
    res.status(404).json({ error: 'Benchmark not found' });
    return;
  }
  res.json(execution);
});

benchmarksRouter.post('/', async (req, res) => {
  await initBenchmarks();
  const execution: BenchmarkExecution = {
    id: crypto.randomUUID(),
    taskId: req.body.taskId,
    providerIds: req.body.providerIds,
    status: 'pending',
    progress: 0,
    results: [],
    hardwareContext: req.body.hardwareContext || {
      cpu: { model: 'unknown', cores: 0, clockSpeedGHz: 0 },
      ram: { totalGB: 0, availableGB: 0 },
      os: { platform: 'unknown', distribution: 'unknown', kernelVersion: 'unknown' }
    },
    startedAt: new Date().toISOString(),
  };
  executions.set(execution.id, execution);
  await saveBenchmarks(executions);
  res.status(201).json(execution);
});

benchmarksRouter.post('/:id/start', async (req, res) => {
  await initBenchmarks();
  const execution = executions.get(req.params.id);
  if (!execution) {
    res.status(404).json({ error: 'Benchmark not found' });
    return;
  }

  const allProviders = await loadProviders();
  execution.status = 'running';

  for (const providerId of execution.providerIds) {
    const provider = allProviders.get(providerId);
    if (!provider) continue;

    try {
      const result = await runBenchmark(provider, req.body.prompt, req.body.timeoutMs);
      execution.results.push(result);
    } catch (err) {
      console.log('[Benchmark] Error:', err);
    }

    execution.progress = Math.round(
      (execution.results.length / execution.providerIds.length) * 100
    );
  }

  execution.status = 'completed';
  execution.completedAt = new Date().toISOString();
  await saveBenchmarks(executions);
  res.json(execution);
});

benchmarksRouter.post('/:id/cancel', async (req, res) => {
  await initBenchmarks();
  const execution = executions.get(req.params.id);
  if (!execution) {
    res.status(404).json({ error: 'Benchmark not found' });
    return;
  }

  execution.status = 'cancelled';
  await saveBenchmarks(executions);
  res.json(execution);
});

interface OllamaResponse { response?: string }
interface LmStudioResponse { choices?: Array<{ text?: string }>; usage?: { completion_tokens?: number } }

async function runBenchmark(provider: LLMProvider, prompt: string, timeoutMs?: number): Promise<BenchmarkResult> {
  const start = Date.now();
  const id = crypto.randomUUID();

  switch (provider.type) {
    case 'llamacpp': {
      const llmProvider = provider as any;
      const llamaProvider = new LlamaCppProvider({
        name: provider.id,
        serverPath: llmProvider.binaryPath,
        modelPath: llmProvider.modelPath,
        port: llmProvider.serverPort || 8080,
        contextSize: llmProvider.contextSize || 512,
        gpuLayers: llmProvider.gpuLayers || 99,
      });
      return llamaProvider.benchmark({ task: prompt, timeoutMs });
    }

    case 'ollama': {
      const ollamaProvider = provider as any;
      const endpoint = ollamaProvider.endpoint;
      const modelName = ollamaProvider.modelName || 'llama3';

      const res = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt,
          stream: false,
          options: {
            temperature: provider.settings.temperature,
            num_predict: provider.settings.maxTokens,
          },
        }),
      });

      const data = await res.json() as OllamaResponse;
      const output = data.response || '';
      const elapsed = Date.now() - start;
      const tokensUsed = Math.ceil(output.length / 4);
      const tokensPerSecond = tokensUsed > 0 ? (tokensUsed / elapsed) * 1000 : 0;

      return {
        id,
        taskId: prompt,
        providerId: provider.id,
        executionTimeMs: elapsed,
        tokensUsed,
        tokensPerSecond,
        qualityScore: output.includes('print') || output.includes('def ') ? 0.8 : 0.3,
        output,
        qualityMetrics: { testsPassed: 0, testsTotal: 0, lintErrors: 0, outputLength: output.length },
        status: 'success',
        timestamp: new Date().toISOString(),
      };
    }

    case 'lmstudio': {
      const lmProvider = provider as any;
      const endpoint = lmProvider.endpoint;
      const modelName = lmProvider.modelName || '';

      const res = await fetch(`${endpoint}/v1/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt,
          max_tokens: provider.settings.maxTokens,
          temperature: provider.settings.temperature,
        }),
      });

      const data = await res.json() as LmStudioResponse;
      const output = data.choices?.[0]?.text || '';
      const elapsed = Date.now() - start;
      const tokensUsed = data.usage?.completion_tokens || Math.ceil(output.length / 4);
      const tokensPerSecond = tokensUsed > 0 ? (tokensUsed / elapsed) * 1000 : 0;

      return {
        id,
        taskId: prompt,
        providerId: provider.id,
        executionTimeMs: elapsed,
        tokensUsed,
        tokensPerSecond,
        qualityScore: output.length > 0 ? 0.7 : 0,
        output,
        qualityMetrics: { testsPassed: 0, testsTotal: 0, lintErrors: 0, outputLength: output.length },
        status: 'success',
        timestamp: new Date().toISOString(),
      };
    }

    case 'claude':
    case 'minimax':
    default: {
      return {
        id,
        taskId: prompt,
        providerId: provider.id,
        executionTimeMs: Date.now() - start,
        tokensUsed: 0,
        tokensPerSecond: 0,
        qualityScore: 0,
        output: '',
        qualityMetrics: { testsPassed: 0, testsTotal: 0, lintErrors: 0, outputLength: 0 },
        status: 'failed' as const,
        error: `${provider.type} benchmark not yet implemented`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
