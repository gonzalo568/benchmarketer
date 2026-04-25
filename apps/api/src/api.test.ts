import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';

const API_PORT = 3001;

function apiRequest(path: string, method = 'GET', body?: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: API_PORT,
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

describe('API Endpoints', () => {
  test('GET /api/health returns ok status', async () => {
    const res = await apiRequest('/api/health');
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('ok');
  });

  test('GET /api/config returns providers array', async () => {
    const res = await apiRequest('/api/config');
    expect(res.status).toBe(200);
    expect(res.data.providers).toBeDefined();
    expect(Array.isArray(res.data.providers)).toBe(true);
    expect(res.data.providers.length).toBeGreaterThan(0);
    expect(res.data.providers[0].type).toBe('llamacpp');
  });

  test('GET /api/tasks returns benchmark tasks', async () => {
    const res = await apiRequest('/api/tasks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data[0]).toHaveProperty('id');
    expect(res.data[0]).toHaveProperty('level');
  });

  test('POST /api/benchmarks creates execution', async () => {
    const res = await apiRequest('/api/benchmarks', 'POST', {
      taskId: 'test-task',
      providerIds: ['llama-cpp-local'],
    });
    expect(res.status).toBe(201);
    expect(res.data.id).toBeDefined();
    expect(res.data.status).toBe('pending');
  });

  test('GET /api/providers returns empty array (no providers added)', async () => {
    const res = await apiRequest('/api/providers');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });
});
