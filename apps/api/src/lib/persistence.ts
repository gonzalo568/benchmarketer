import { promises as fs } from 'fs';
import path from 'path';
import type { LLMProvider, AvailableModel } from '@benchmarketer/shared';

const DATA_DIR = process.env.DATA_DIR || './data';
const PROVIDERS_FILE = path.join(DATA_DIR, 'providers.json');

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
