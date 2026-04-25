import { test, expect, describe } from 'vitest';
import http from 'http';

function apiRequest(path: string, method = 'GET', body?: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('Benchmark Execution', () => {
  test('full benchmark flow: create -> start -> complete', async () => {
    const createRes = await apiRequest('/api/benchmarks', 'POST', {
      taskId: 'hello-world',
      providerIds: ['llama-cpp-local'],
    });
    expect(createRes.status).toBe(201);
    const id = createRes.data.id;

    const startRes = await apiRequest(`/api/benchmarks/${id}/start`, 'POST', {
      prompt: 'Write hello world in python',
      timeoutMs: 60000,
    });

    expect(startRes.status).toBe(200);
    expect(startRes.data.status).toBe('completed');
    expect(startRes.data.results).toBeDefined();
    expect(startRes.data.results.length).toBeGreaterThan(0);

    const result = startRes.data.results[0];
    expect(result.executionTimeMs).toBeGreaterThan(0);
    expect(result.tokensUsed).toBeGreaterThan(0);
    expect(result.tokensPerSecond).toBeGreaterThan(0);
  }, 90000);
});
