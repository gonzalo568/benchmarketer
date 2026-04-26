import { promises as fs } from 'fs';
import path from 'path';
import type { LLMProvider, AvailableModel, BenchmarkTask } from '@benchmarketer/shared';

const DATA_DIR = process.env.DATA_DIR || './data';
const PROVIDERS_FILE = path.join(DATA_DIR, 'providers.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

const DEFAULT_TASKS: BenchmarkTask[] = [
  {
    id: 'hello-world',
    name: 'Hello World',
    level: 'L1',
    description: 'Write a hello world function',
    prompt: 'Write hello world in python - only output the code, no markdown',
  },
  {
    id: 'fizzbuzz',
    name: 'FizzBuzz',
    level: 'L2',
    description: 'Implement FizzBuzz',
    prompt: 'Write a FizzBuzz function in python - only output the code, no markdown',
  },
  {
    id: 'l1-micro',
    name: 'Micro Task',
    level: 'L1',
    description: 'Simple function or script generation',
    prompt: 'Write a function that validates an email address',
  },
  {
    id: 'l2-feature',
    name: 'Feature Task',
    level: 'L2',
    description: 'Single file or module with multiple functions',
    prompt: 'Create a REST API endpoint for user authentication with JWT tokens',
  },
  {
    id: 'l3-system',
    name: 'System Task',
    level: 'L3',
    description: 'Multi-file project with business logic',
    prompt: 'Build a user authentication system with login, registration, and password reset',
  },
  {
    id: 'l4-fullstack',
    name: 'Full-Stack Task',
    level: 'L4',
    description: 'Complete application with frontend and backend',
    prompt: 'Create a task management application with real-time updates',
  },
];

export async function loadTasks(): Promise<BenchmarkTask[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = await fs.readFile(TASKS_FILE, 'utf-8');
    return JSON.parse(data) as BenchmarkTask[];
  } catch {
    await saveTasks(DEFAULT_TASKS);
    return DEFAULT_TASKS;
  }
}

export async function saveTasks(tasks: BenchmarkTask[]): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save tasks:', err);
  }
}

export async function loadProviders(): Promise<Map<string, LLMProvider>> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = await fs.readFile(PROVIDERS_FILE, 'utf-8');
    const arr = JSON.parse(data) as LLMProvider[];
    return new Map(arr.map(p => [p.id, p]));
  } catch {
    return new Map();
  }
}

export async function saveProviders(providers: Map<string, LLMProvider>): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = JSON.stringify(Array.from(providers.values()), null, 2);
    await fs.writeFile(PROVIDERS_FILE, data, 'utf-8');
  } catch (err) {
    console.error('Failed to save providers:', err);
  }
}

interface LmStudioListResponse { models?: Array<{ name?: string; id?: string; size?: number }> }
interface OllamaListResponse { models?: Array<{ name: string; size?: number }> }

export async function listLmStudioModels(endpoint: string): Promise<AvailableModel[]> {
  try {
    const res = await fetch(`${endpoint}/api/models`);
    if (!res.ok) return [];
    const data = await res.json() as LmStudioListResponse;
    return (data.models || []).map(m => ({
      name: m.name || m.id || 'unknown',
      id: m.id || m.name || 'unknown',
      size: m.size,
    }));
  } catch {
    return [];
  }
}

export async function listOllamaModels(endpoint: string): Promise<AvailableModel[]> {
  try {
    const res = await fetch(`${endpoint}/api/tags`);
    if (!res.ok) return [];
    const data = await res.json() as OllamaListResponse;
    return (data.models || []).map(m => ({
      name: m.name,
      id: m.name,
      size: m.size,
    }));
  } catch {
    return [];
  }
}

export async function listLlamaCppModels(modelsDir: string): Promise<AvailableModel[]> {
  try {
    const files = await fs.readdir(modelsDir);
    return files
      .filter(f => f.endsWith('.gguf'))
      .map(f => ({
        name: f,
        id: path.join(modelsDir, f),
        size: 0,
      }));
  } catch {
    return [];
  }
}
