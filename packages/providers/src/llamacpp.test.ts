import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { LlamaCppProvider } from './llamacpp';
import type { LlamaCppConfig } from './llamacpp';

const config: LlamaCppConfig = {
  name: 'llama-cpp-local',
  serverPath: '/home/frit/llama/llama-b8882-rocm72/llama-b8882/llama-server',
  modelPath: '/home/frit/models/Qwen3-4B-Q4_K_M.gguf',
  port: 8080,
  contextSize: 512,
  gpuLayers: 99,
};

describe('LlamaCppProvider', () => {
  let provider: LlamaCppProvider;

  beforeAll(() => {
    provider = new LlamaCppProvider(config);
  });

  afterAll(async () => {
    await provider.cleanup();
  });

  test.skip('verifyConnection returns true when llama-server is available', async () => {
    const result = await provider.verifyConnection();
    expect(result).toBe(true);
  }, 10000);

  test('benchmark completes task and returns result', async () => {
    const result = await provider.benchmark({ task: 'Write hello world in python' });
    expect(result.id).toBeDefined();
    expect(result.taskId).toBe('Write hello world in python');
    expect(result.providerId).toBe('llama-cpp-local');
    expect(result.executionTimeMs).toBeGreaterThan(0);
    expect(result.tokensUsed).toBeGreaterThan(0);
    expect(result.status).toBe('success');
  }, 60000);

  test('benchmark handles failure gracefully', async () => {
    const badProvider = new LlamaCppProvider({
      ...config,
      port: 9999,
      serverPath: '/nonexistent',
    });
    const result = await badProvider.benchmark({ task: 'test' });
    expect(result.status).toBe('failed');
    expect(result.error).toBeDefined();
  }, 10000);
});
