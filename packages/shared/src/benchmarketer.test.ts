import { test, expect, describe } from 'vitest';
import type { BenchmarkExecution } from './index';

describe('BenchmarkResult', () => {
  test('creates valid result', () => {
    const result: BenchmarkExecution = {
      id: crypto.randomUUID(),
      taskId: 'l2-feature',
      providerIds: ['provider-1'],
      status: 'completed',
      progress: 100,
      results: [],
      hardwareContext: {
        cpu: { model: 'AMD Ryzen 9 7900X', cores: 12, clockSpeedGHz: 4.2 },
        ram: { totalGB: 64, availableGB: 32 },
        os: { platform: 'linux', distribution: 'Ubuntu', kernelVersion: '6.8.0' }
      },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };

    expect(result.id).toBeDefined();
    expect(result.status).toBe('completed');
  });
});