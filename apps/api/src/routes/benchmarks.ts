import { Router } from 'express';
import os from 'os';
import type { BenchmarkExecution, LLMProvider, BenchmarkResult, BenchmarkTask } from '@benchmarketer/shared';
import { LlamaCppProvider } from '@benchmarketer/providers';
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

    try {
      const result = await runBenchmark(provider, req.body.prompt, req.body.timeoutMs, task);
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
  res.json(executions.get(benchmarkId));
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
};
