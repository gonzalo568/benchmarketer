import { promises as fs } from 'fs';
import path from 'path';
import type { BenchmarkExecution } from '@benchmarketer/shared';

const DATA_DIR = process.env.DATA_DIR || './data';
const BENCHMARKS_FILE = path.join(DATA_DIR, 'benchmarks.json');

export async function loadBenchmarks(): Promise<Map<string, BenchmarkExecution>> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = await fs.readFile(BENCHMARKS_FILE, 'utf-8');
    const arr = JSON.parse(data) as BenchmarkExecution[];
    return new Map(arr.map(b => [b.id, b]));
  } catch {
    return new Map();
  }
}

export async function saveBenchmarks(benchmarks: Map<string, BenchmarkExecution>): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = JSON.stringify(Array.from(benchmarks.values()), null, 2);
    await fs.writeFile(BENCHMARKS_FILE, data, 'utf-8');
  } catch (err) {
    console.error('Failed to save benchmarks:', err);
  }
}
