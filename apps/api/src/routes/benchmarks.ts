import { Router } from 'express';
import os from 'os';
import type { BenchmarkExecution, LLMProvider, BenchmarkResult, BenchmarkTask } from '@benchmarketer/shared';
import { LlamaCppProvider } from '@benchmarketer/providers';
import {
  extractFunctions,
  stratifiedSample,
  scoreFunction,
  calculateCodeQualityScore,
  aggregateResults,
  processOutput,
} from '@benchmarketer/code-quality';
import { loadBenchmarks, saveBenchmarks } from '../lib/benchmarks-persistence';
import { loadProviders, loadTasks } from '../lib/persistence';
import { sseEmitter } from '../lib/sse-emitter';
import { cliSpawner } from '../lib/cli-spawner';

export const benchmarksRouter = Router();

let executions: Map<string, BenchmarkExecution> = new Map();
let allTasks: BenchmarkTask[] = [];
let initialized = false;

function getGPUInfo(): { model: string; vramGB: number } {
  const platform = os.platform();
  try {
    if (platform === 'linux') {
      const { execSync } = require('child_process');

      let gpu = { model: 'Unknown', vramGB: 0 };

      const vga = execSync('lspci -vmm 2>/dev/null | grep -A 10 VGA 2>/dev/null || lspci -vmm 2>/dev/null | grep -A 10 3D 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
      const lines = vga.split('\n');
      for (const line of lines) {
        if (line.startsWith('Device:')) gpu.model = line.replace('Device:', '').trim();
      }

      try {
        const rocmPaths = ['/opt/rocm/bin/rocm-smi', '/opt/rocm-7.2/bin/rocm-smi', '/opt/rocm-6.1/bin/rocm-smi', 'rocm-smi'];
        let rocmSmi = null;
        for (const p of rocmPaths) {
          try {
            rocmSmi = execSync(p + ' --showproductname --showmeminfo vram 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
            if (rocmSmi && rocmSmi.includes('GPU')) break;
          } catch {}
        }
        if (rocmSmi) {
          const nameMatch = rocmSmi.match(/Card.*:\s*(.+)/i);
          const vramMatch = rocmSmi.match(/VRAM:\s*(\d+)/i) || rocmSmi.match(/Memory Used:\s*(\d+)/i);
          if (nameMatch) gpu.model = nameMatch[1].trim();
          if (vramMatch) gpu.vramGB = Math.round(parseInt(vramMatch[1]) / 1024);
        }
      } catch {}

      return gpu;
    } else if (platform === 'win32') {
      const { execSync } = require('child_process');
      try {
        const gpuInfo = execSync('wmic path win32_VideoController get name,adapterram /format:value 2>nul', { encoding: 'utf8', timeout: 5000 });
        const nameMatch = gpuInfo.match(/Name=(.+)/);
        const ramMatch = gpuInfo.match(/AdapterRAM=(\d+)/);
        return {
          model: nameMatch ? nameMatch[1].trim() : 'Unknown',
          vramGB: ramMatch ? Math.round(parseInt(ramMatch[1]) / (1024 * 1024 * 1024) * 10) / 10 : 0,
        };
      } catch {
        return { model: 'GPU (unavailable)', vramGB: 0 };
      }
    } else if (platform === 'darwin') {
      const { execSync } = require('child_process');
      try {
        const gpuInfo = execSync('system_profiler SPDisplaysDataType 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
        const modelMatch = gpuInfo.match(/Chipset Model:\s*(.+)/);
        const ramMatch = gpuInfo.match(/VRAM \(.*\):\s*(\d+)/);
        return {
          model: modelMatch ? modelMatch[1].trim() : 'Unknown',
          vramGB: ramMatch ? parseInt(ramMatch[1]) / 1024 : 0,
        };
      } catch {
        return { model: 'GPU (unavailable)', vramGB: 0 };
      }
    }
  } catch {}
  return { model: 'No GPU detected', vramGB: 0 };
}

function getHardwareContext() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const gpu = getGPUInfo();
  return {
    cpu: {
      model: cpus[0]?.model || 'unknown',
      cores: cpus.length,
      clockSpeedGHz: 0,
    },
    ram: {
      totalGB: Math.round(totalMem / (1024 * 1024 * 1024) * 10) / 10,
      availableGB: Math.round(freeMem / (1024 * 1024 * 1024) * 10) / 10,
    },
    gpu,
    os: {
      platform: os.platform(),
      distribution: os.release(),
      kernelVersion: os.version() || os.release(),
    },
  };
}

async function initBenchmarks() {
  if (!initialized) {
    executions = await loadBenchmarks();
    allTasks = await loadTasks();
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

benchmarksRouter.delete('/:id', async (req, res) => {
  await initBenchmarks();
  const deleted = executions.delete(req.params.id);
  if (deleted) {
    await saveBenchmarks(executions);
  }
  res.json({ success: deleted });
});

benchmarksRouter.put('/:id', async (req, res) => {
  await initBenchmarks();
  const execution = executions.get(req.params.id);
  if (!execution) {
    res.status(404).json({ error: 'Benchmark not found' });
    return;
  }
  if (req.body.results) {
    execution.results = req.body.results;
  }
  if (req.body.status) {
    execution.status = req.body.status;
  }
  await saveBenchmarks(executions);
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
    hardwareContext: req.body.hardwareContext || getHardwareContext(),
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
  const benchmarkId = req.params.id;

  execution.status = 'running';
  execution.startedAt = new Date().toISOString();
  await saveBenchmarks(executions);

  sseEmitter.emit(benchmarkId, {
    type: 'benchmark.started',
    benchmarkId,
    message: 'Benchmark execution started'
  });

  res.json(execution);

  setImmediate(async () => {
    try {
      console.log(`[benchmark] Starting async execution for ${benchmarkId}`);
      for (const providerId of execution.providerIds) {
        const provider = allProviders.get(providerId);
        if (!provider) continue;

        const currentExecution = executions.get(benchmarkId);
        if (!currentExecution || currentExecution.status === 'cancelled') {
          break;
        }

        sseEmitter.emit(benchmarkId, {
          type: 'provider.started',
          providerId: provider.id,
          providerName: provider.name,
          message: `Starting benchmark for ${provider.name}`
        });

        const task = allTasks.find(t => t.id === execution.taskId);
        console.log(`[benchmark] Task type: ${task?.type || 'generation'}, task: ${task?.name}`);

        try {
          const result = task?.type === 'code-quality'
            ? await runCodeQualityBenchmark(provider, task, req.body.timeoutMs, (percent) => {
                execution.progress = percent;
                sseEmitter.emit(benchmarkId, {
                  type: 'progress',
                  percent,
                  message: `${percent}% complete`
                });
              })
            : await runBenchmark(provider, req.body.prompt, req.body.timeoutMs, task);
          execution.results.push(result);

        sseEmitter.emit(benchmarkId, {
          type: 'provider.completed',
          providerId: provider.id,
          providerName: provider.name,
          result
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        sseEmitter.emit(benchmarkId, {
          type: 'provider.failed',
          providerId: provider.id,
          providerName: provider.name,
          error: errorMsg
        });

        execution.results.push({
          id: crypto.randomUUID(),
          taskId: req.body.prompt || execution.taskId,
          providerId: provider.id,
          providerName: provider.name,
          executionTimeMs: 0,
          tokensUsed: 0,
          tokensPerSecond: 0,
          qualityScore: 0,
          output: '',
          qualityMetrics: { testsPassed: 0, testsTotal: 0, lintErrors: 0, outputLength: 0 },
          status: 'failed',
          error: errorMsg,
          timestamp: new Date().toISOString()
        });
      }

      execution.progress = Math.round(
        (execution.results.length / execution.providerIds.length) * 100
      );

      sseEmitter.emit(benchmarkId, {
        type: 'progress',
        percent: execution.progress,
        message: `${execution.progress}% complete`
      });

      await saveBenchmarks(executions);
    }

    const finalExecution = executions.get(benchmarkId);
    if (finalExecution && finalExecution.status !== 'cancelled') {
      finalExecution.status = 'completed';
      finalExecution.completedAt = new Date().toISOString();

      sseEmitter.emitAndClose(benchmarkId, {
        type: 'benchmark.completed',
        benchmarkId,
        message: 'Benchmark execution completed'
      });
    }

    await saveBenchmarks(executions);
    } catch (err) {
      console.error(`[benchmark] Async execution error:`, err);
      execution.status = 'completed';
      execution.completedAt = new Date().toISOString();
      await saveBenchmarks(executions);
    }
  });
});

benchmarksRouter.post('/:id/cancel', async (req, res) => {
  await initBenchmarks();
  const execution = executions.get(req.params.id);
  if (!execution) {
    res.status(404).json({ error: 'Benchmark not found' });
    return;
  }

  const benchmarkId = req.params.id;

  cliSpawner.kill(benchmarkId);

  execution.status = 'cancelled';
  execution.completedAt = new Date().toISOString();
  await saveBenchmarks(executions);

  sseEmitter.emitAndClose(benchmarkId, {
    type: 'benchmark.cancelled',
    benchmarkId,
    message: 'Benchmark execution cancelled'
  });

  res.json(execution);
});

interface OllamaResponse { response?: string }
interface LmStudioResponse { choices?: Array<{ text?: string }>; usage?: { completion_tokens?: number } }

function calculateQualityScore(output: string, task?: BenchmarkTask): number {
  if (!output || output.length === 0) return 0;

  let score = 0.5;
  const lowerOutput = output.toLowerCase();

  if (task) {
    if (task.expectedPatterns?.length) {
      const matchedExpected = task.expectedPatterns.filter(p => lowerOutput.includes(p.toLowerCase()));
      score += (matchedExpected.length / task.expectedPatterns.length) * 0.4;
    }

    if (task.forbiddenPatterns?.length) {
      const foundForbidden = task.forbiddenPatterns.filter(p => lowerOutput.includes(p.toLowerCase()));
      if (foundForbidden.length > 0) {
        score -= (foundForbidden.length / task.forbiddenPatterns.length) * 0.5;
      }
    }
  }

  const hasTripleBackticks = output.includes('```');
  if (hasTripleBackticks) score -= 0.5;

  const outputLines = output.trim().split('\n').length;
  if (outputLines > 100) score -= 0.2;
  if (outputLines > 200) score -= 0.2;

  const repeatedPatterns = output.match(/(.+)\1{2,}/);
  if (repeatedPatterns) score -= 0.3;

  const boilerplate = ['if __name__', 'def main()', '#!/usr/bin', 'import sys', 'if __name__ == "__main__"'];
  const hasBoilerplate = boilerplate.some(b => lowerOutput.includes(b));
  if (hasBoilerplate) score -= 0.1;

  const minExpectedLines = task?.expectedPatterns?.length ? Math.max(3, task.expectedPatterns.length + 2) : 5;
  if (outputLines > minExpectedLines && outputLines <= minExpectedLines + 5) {
    score += 0.15;
  }

  const codeDensity = output.replace(/\s/g, '').length / output.length;
  if (codeDensity > 0.5) score += 0.1;

  return Math.max(0, Math.min(1, score));
}

async function runBenchmark(provider: LLMProvider, prompt: string, timeoutMs?: number, task?: BenchmarkTask): Promise<BenchmarkResult> {
  const start = Date.now();
  const id = crypto.randomUUID();

  switch (provider.type) {
    case 'llamacpp': {
      const llmProvider = provider as any;
      const llamaProvider = new LlamaCppProvider({
        name: provider.id,
        serverPath: llmProvider.binaryPath,
        modelPath: llmProvider.modelPath,
        host: llmProvider.host || '127.0.0.1',
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
        providerName: provider.name,
        executionTimeMs: elapsed,
        tokensUsed,
        tokensPerSecond,
        qualityScore: calculateQualityScore(output, task),
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
      const maxTokens = provider.settings.maxTokens && provider.settings.maxTokens >= 50 ? provider.settings.maxTokens : 400;

      const res = await fetch(`${endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: 'You are a code generator. Output ONLY python code, no explanations, no markdown, no comments. Start with "def " on the first line.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: maxTokens,
          temperature: 0.2,
        }),
      });

      const data = await res.json() as any;
      let output = data.choices?.[0]?.message?.content || '';

      const codeStart = output.indexOf('def ');
      if (codeStart >= 0) {
        output = output.substring(codeStart);
      }

      const elapsed = Date.now() - start;
      const tokensUsed = data.usage?.completion_tokens || Math.ceil(output.length / 4);
      const tokensPerSecond = tokensUsed > 0 ? (tokensUsed / elapsed) * 1000 : 0;

      return {
        id,
        taskId: prompt,
        providerId: provider.id,
        providerName: provider.name,
        executionTimeMs: elapsed,
        tokensUsed,
        tokensPerSecond,
        qualityScore: calculateQualityScore(output, task),
        output,
        qualityMetrics: { testsPassed: 0, testsTotal: 0, lintErrors: 0, outputLength: output.length },
        status: 'success',
        timestamp: new Date().toISOString(),
      };
    }

    case 'claude':
    case 'minimax': {
      const minimaxProvider = provider as any;
      const endpoint = minimaxProvider.apiEndpoint || 'https://api.minimax.io/v1';
      const modelName = minimaxProvider.modelName || 'MiniMax-M2.7';
      const apiKey = minimaxProvider.apiKey;

      const res = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: 'You are a code generator. Output ONLY python code, no explanations, no markdown, no comments. Start with "def " on the first line.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: provider.settings.maxTokens || 400,
          temperature: provider.settings.temperature || 0.2,
        }),
      });

      if (!res.ok) {
        throw new Error(`MiniMax API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json() as any;
      let output = data.choices?.[0]?.message?.content || '';

      const codeStart = output.indexOf('def ');
      if (codeStart >= 0) {
        output = output.substring(codeStart);
      }

      const elapsed = Date.now() - start;
      const tokensUsed = data.usage?.completion_tokens || Math.ceil(output.length / 4);
      const tokensPerSecond = tokensUsed > 0 ? (tokensUsed / elapsed) * 1000 : 0;

      return {
        id,
        taskId: prompt,
        providerId: provider.id,
        providerName: provider.name,
        executionTimeMs: elapsed,
        tokensUsed,
        tokensPerSecond,
        qualityScore: calculateQualityScore(output, task),
        output,
        qualityMetrics: { testsPassed: 0, testsTotal: 0, lintErrors: 0, outputLength: output.length },
        settings: {
          temperature: provider.settings.temperature,
          maxTokens: provider.settings.maxTokens,
        },
        status: 'success',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

async function runCodeQualityBenchmark(
  provider: LLMProvider,
  task: BenchmarkTask,
  timeoutMs?: number,
  onProgress?: (percent: number) => void
): Promise<BenchmarkResult> {
  const start = Date.now();
  const id = crypto.randomUUID();

  if (!task.codeQualityConfig) {
    throw new Error('Code quality task missing configuration');
  }

  const config = task.codeQualityConfig;
  const functions = extractFunctions(config.sourceCode, config.language);

  if (functions.length === 0) {
    throw new Error('No functions found in source code');
  }

  const sampleSize = config.sampleSize || Math.min(16, functions.length);
  const sampled = stratifiedSample(functions, sampleSize);

  const scoredFunctions = [];

  if (provider.type === 'llamacpp') {
    const llmProvider = provider as any;
    const llamaProvider = new LlamaCppProvider({
      name: provider.id,
      serverPath: llmProvider.binaryPath,
      modelPath: llmProvider.modelPath,
      host: llmProvider.host || '127.0.0.1',
      port: llmProvider.serverPort || 8080,
      contextSize: llmProvider.contextSize || 131072,
      gpuLayers: llmProvider.gpuLayers || 99,
    });

    try {
      console.log(`[code-quality] Processing ${sampled.length} functions with llama.cpp`);
      const serverUrl = `http://${llmProvider.host || '127.0.0.1'}:${llmProvider.serverPort || 8080}`;

      for (let i = 0; i < sampled.length; i++) {
        const func = sampled[i];
        console.log(`[code-quality] Processing function ${i + 1}/${sampled.length}: ${func.name}`);
        const prompt = buildCodeQualityPrompt(func, config.sourceCode);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs || 120000);

          const res = await fetch(`${serverUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [
                { role: 'system', content: 'You are a code assistant. Output ONLY the requested code, no explanations.' },
                { role: 'user', content: prompt }
              ],
              temperature: config.temperature ?? 0,
              max_tokens: config.maxTokens ?? 6000,
              stop: ['</s>'],
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data = await res.json() as any;
          let output = data.choices?.[0]?.message?.content || '';

          output = output.replace(/<think>[\s\S]*?<\/think>/gi, '');

          const codeBlockMatch = output.match(/```(?:python)?\n([\s\S]*?)\n```/);
          if (codeBlockMatch) {
            output = codeBlockMatch[1];
          }

          const predictedLines = processOutput(output);
          const scored = scoreFunction(func.bodyLines, predictedLines, {
            passThreshold: config.passThreshold,
            bonusCap: config.bonusCap,
            relaxIndent: config.relaxIndent,
          });
          scored.name = func.name;
          scored.latencyMs = Date.now() - start;
          scoredFunctions.push(scored);
          console.log(`[code-quality] Function ${func.name}: matched=${scored.primaryMatched}/${scored.primaryTotal}, passed=${scored.passed}`);

          onProgress?.(Math.round(((i + 1) / sampled.length) * 100));
        } catch (err) {
          console.error(`[code-quality] Error processing ${func.name}:`, err);
          scoredFunctions.push({
            name: func.name,
            passed: false,
            primaryMatched: 0,
            primaryTotal: 20,
            hallucinated: 0,
            bonusMatched: 0,
            latencyMs: 0,
          });
          onProgress?.(Math.round(((i + 1) / sampled.length) * 100));
        }
      }
    } finally {
    }
  } else {
    for (let i = 0; i < sampled.length; i++) {
      const func = sampled[i];
      const prompt = buildCodeQualityPrompt(func, config.sourceCode);

      try {
        const output = await queryProvider(provider, prompt, timeoutMs, config);
        const predictedLines = processOutput(output);
        const scored = scoreFunction(func.bodyLines, predictedLines, {
          passThreshold: config.passThreshold,
          bonusCap: config.bonusCap,
          relaxIndent: config.relaxIndent,
        });
        scored.name = func.name;
        scored.latencyMs = Date.now() - start;
        scoredFunctions.push(scored);
      } catch (err) {
        scoredFunctions.push({
          name: func.name,
          passed: false,
          primaryMatched: 0,
          primaryTotal: 20,
          hallucinated: 0,
          bonusMatched: 0,
          latencyMs: 0,
        });
      }
      onProgress?.(Math.round(((i + 1) / sampled.length) * 100));
    }
  }

  const aggregated = aggregateResults(scoredFunctions);
  const qualityScore = aggregated.score;
  const elapsed = Date.now() - start;

  console.log(`[code-quality] Completed: score=${qualityScore.toFixed(2)}, passRate=${(aggregated.passRate * 100).toFixed(0)}%, elapsed=${(elapsed / 1000).toFixed(0)}s`);

  return {
    id,
    taskId: task.id,
    providerId: provider.id,
    providerName: provider.name,
    executionTimeMs: elapsed,
    tokensUsed: 0,
    tokensPerSecond: 0,
    qualityScore,
    output: JSON.stringify({
      passRate: aggregated.passRate,
      totalMatched: aggregated.totalMatched,
      totalPrimary: aggregated.totalPrimary,
      totalHallucinated: aggregated.totalHallucinated,
      totalBonus: aggregated.totalBonus,
      functions: scoredFunctions.map(f => ({
        name: f.name,
        passed: f.passed,
        primaryMatched: f.primaryMatched,
        primaryTotal: f.primaryTotal,
        hallucinated: f.hallucinated,
        bonusMatched: f.bonusMatched,
      })),
    }),
    qualityMetrics: {
      testsPassed: scoredFunctions.filter(f => f.passed).length,
      testsTotal: scoredFunctions.length,
      lintErrors: 0,
      outputLength: 0,
      codeQuality: {
        passRate: aggregated.passRate,
        totalMatched: aggregated.totalMatched,
        totalPrimary: aggregated.totalPrimary,
        totalHallucinated: aggregated.totalHallucinated,
        totalBonus: aggregated.totalBonus,
        score: aggregated.score,
        functionsTested: scoredFunctions.length,
      },
    },
    status: 'success',
    timestamp: new Date().toISOString(),
  };
}

function buildCodeQualityPrompt(func: { name: string; bodyLines: string[] }, sourceCode: string): string {
  return `${sourceCode}

---

Task: reproduce verbatim the first 20 lines of the body of the function named
\`${func.name}\` from the source above -- i.e., the 20 lines starting immediately after
the line containing \`function ${func.name}(\` or \`def ${func.name}(\`.

Rules:
- Output ONLY those lines, one per line, in original order.
- Preserve original indentation and characters exactly.
- Do NOT output the function signature.
- Do NOT add commentary, line numbers, or markdown code fences.
- If there are blank lines in the body, include them as blank lines.
/no_think`;
}

async function queryProvider(
  provider: LLMProvider,
  prompt: string,
  timeoutMs?: number,
  config?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const timeout = timeoutMs || 120000;

  switch (provider.type) {
    case 'llamacpp': {
      const llmProvider = provider as any;
      const llamaProvider = new LlamaCppProvider({
        name: provider.id,
        serverPath: llmProvider.binaryPath,
        modelPath: llmProvider.modelPath,
        host: llmProvider.host || '127.0.0.1',
        port: llmProvider.serverPort || 8080,
        contextSize: llmProvider.contextSize || 131072,
        gpuLayers: llmProvider.gpuLayers || 99,
      });
      const result = await llamaProvider.benchmark({ task: prompt, timeoutMs: timeout });
      return result.output;
    }

    case 'ollama': {
      const ollamaProvider = provider as any;
      const endpoint = ollamaProvider.endpoint;
      const modelName = ollamaProvider.modelName || 'llama3';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt,
          stream: false,
          options: {
            temperature: config?.temperature ?? 0,
            num_predict: config?.maxTokens ?? 6000,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json() as any;
      return data.response || '';
    }

    case 'lmstudio': {
      const lmProvider = provider as any;
      const endpoint = lmProvider.endpoint;
      const modelName = lmProvider.modelName || '';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(`${endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: config?.maxTokens ?? 6000,
          temperature: config?.temperature ?? 0,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json() as any;
      return data.choices?.[0]?.message?.content || '';
    }

    case 'claude':
    case 'minimax': {
      const minimaxProvider = provider as any;
      const endpoint = minimaxProvider.apiEndpoint || 'https://api.minimax.io/v1';
      const modelName = minimaxProvider.modelName || 'MiniMax-M2.7';
      const apiKey = minimaxProvider.apiKey;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: config?.maxTokens ?? 6000,
          temperature: config?.temperature ?? 0,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json() as any;
      return data.choices?.[0]?.message?.content || '';
    }

    default:
      throw new Error(`Unsupported provider type: ${(provider as any).type}`);
  }
}
