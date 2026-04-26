import { Router } from 'express';
import type { LLMProvider, ServerStatus, AvailableModel } from '@benchmarketer/shared';
import { loadProviders, saveProviders, listLmStudioModels, listOllamaModels, listLlamaCppModels } from '../lib/persistence';
import { spawn, ChildProcess } from 'child_process';

const activeServers: Map<string, ChildProcess> = new Map();
const serverStatuses: Map<string, ServerStatus> = new Map();

export const providersRouter = Router();

let providers: Map<string, LLMProvider> = new Map();
let initialized = false;

async function initProviders() {
  if (!initialized) {
    providers = await loadProviders();
    initialized = true;
  }
}

async function checkServerHealth(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

providersRouter.get('/', async (_req, res) => {
  await initProviders();
  const providersList = Array.from(providers.values()).map(p => ({
    ...p,
    serverStatus: serverStatuses.get(p.id) || 'stopped',
  }));
  res.json(providersList);
});

providersRouter.get('/:id', async (req, res) => {
  await initProviders();
  const provider = providers.get(req.params.id);
  if (!provider) {
    res.status(404).json({ error: 'Provider not found' });
    return;
  }
  res.json({ ...provider, serverStatus: serverStatuses.get(req.params.id) || 'stopped' });
});

providersRouter.post('/', async (req, res) => {
  await initProviders();
  const base = {
    id: crypto.randomUUID(),
    name: req.body.name,
    type: req.body.type,
    status: 'configured' as const,
    settings: req.body.settings || {
      timeoutMs: 300000,
      maxTokens: 100,
      temperature: 0.1,
    },
  };

  let provider: LLMProvider;

  switch (req.body.type) {
    case 'llamacpp':
      provider = {
        ...base,
        type: 'llamacpp',
        binaryPath: req.body.binaryPath || '/home/frit/llama/llama-b8882-rocm72/llama-b8882/llama-server',
        modelsDir: req.body.modelsDir || '/home/frit/models',
        modelPath: req.body.modelPath || '',
        serverPort: req.body.serverPort || 8080,
        contextSize: req.body.contextSize || 512,
        gpuLayers: req.body.gpuLayers || 99,
      };
      break;
    case 'ollama':
      provider = {
        ...base,
        type: 'ollama',
        endpoint: req.body.endpoint || 'http://localhost:11434',
        modelName: req.body.modelName || '',
      };
      break;
    case 'lmstudio':
      provider = {
        ...base,
        type: 'lmstudio',
        endpoint: req.body.endpoint || 'http://localhost:1234',
        modelName: req.body.modelName || '',
      };
      break;
    case 'claude':
      provider = {
        ...base,
        type: 'claude',
        apiKey: req.body.apiKey || '',
        modelName: req.body.modelName || 'claude-sonnet-4-20250514',
      };
      break;
    case 'minimax':
      provider = {
        ...base,
        type: 'minimax',
        apiKey: req.body.apiKey || '',
        modelName: req.body.modelName || 'minimax-01',
      };
      break;
    default:
      res.status(400).json({ error: 'Unknown provider type' });
      return;
  }

  providers.set(provider.id, provider);
  serverStatuses.set(provider.id, 'stopped');
  await saveProviders(providers);
  res.status(201).json({ ...provider, serverStatus: 'stopped' });
});

providersRouter.put('/:id', async (req, res) => {
  await initProviders();
  const existing = providers.get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Provider not found' });
    return;
  }
  const updated = { ...existing, ...req.body, id: req.params.id };
  providers.set(req.params.id, updated);
  await saveProviders(providers);
  res.json(updated);
});

providersRouter.delete('/:id', async (req, res) => {
  await initProviders();
  if (!providers.has(req.params.id)) {
    res.status(404).json({ error: 'Provider not found' });
    return;
  }

  const server = activeServers.get(req.params.id);
  if (server) {
    server.kill();
    activeServers.delete(req.params.id);
  }
  serverStatuses.delete(req.params.id);
  providers.delete(req.params.id);
  await saveProviders(providers);
  res.status(204).send();
});

providersRouter.get('/:id/models', async (req, res) => {
  await initProviders();
  const provider = providers.get(req.params.id);
  if (!provider) {
    res.status(404).json({ error: 'Provider not found' });
    return;
  }

  let models: AvailableModel[] = [];

  switch (provider.type) {
    case 'llamacpp':
      models = await listLlamaCppModels((provider as any).modelsDir || '/home/frit/models');
      break;
    case 'ollama':
      models = await listOllamaModels((provider as any).endpoint);
      break;
    case 'lmstudio':
      models = await listLmStudioModels((provider as any).endpoint);
      break;
    case 'claude':
      models = [
        { name: 'Claude Opus 4', id: 'claude-opus-4-20250514' },
        { name: 'Claude Sonnet 4', id: 'claude-sonnet-4-20250514' },
        { name: 'Claude Haiku 4', id: 'claude-haiku-4-20250515' },
      ];
      break;
    case 'minimax':
      models = [
        { name: 'Minimax 01', id: 'minimax-01' },
        { name: 'Minimax 01 Mini', id: 'minimax-01-mini' },
      ];
      break;
  }

  res.json(models);
});

providersRouter.post('/:id/start', async (req, res) => {
  await initProviders();
  const provider = providers.get(req.params.id);
  if (!provider) {
    res.status(404).json({ error: 'Provider not found' });
    return;
  }

  if (provider.type !== 'llamacpp') {
    if (provider.type === 'ollama') {
      const endpoint = (provider as any).endpoint;
      try {
        const health = await fetch(`${endpoint}/api/version`);
        if (health.ok) {
          serverStatuses.set(provider.id, 'running');
          res.json({ ...provider, serverStatus: 'running' });
          return;
        }
      } catch {
        res.status(503).json({ ...provider, serverStatus: 'error', error: 'Ollama not running' });
        return;
      }
    }
    res.status(400).json({ error: `${provider.type} providers don't need server management` });
    return;
  }

  const llamaProvider = provider as any;
  serverStatuses.set(provider.id, 'starting');
  const port = llamaProvider.serverPort || 8080;

  const existing = activeServers.get(provider.id);
  if (existing) {
    existing.kill();
    activeServers.delete(provider.id);
  }

  if (!llamaProvider.modelPath) {
    res.status(400).json({ error: 'No model selected' });
    return;
  }

  const server = spawn(llamaProvider.binaryPath, [
    '-m', llamaProvider.modelPath,
    '-c', String(llamaProvider.contextSize || 512),
    '-ngl', String(llamaProvider.gpuLayers || 99),
    '--port', String(port),
    '--host', '127.0.0.1',
  ], { stdio: 'pipe', detached: true });

  server.unref();

  activeServers.set(provider.id, server);

  let errorMsg = '';
  server.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString();
    errorMsg += msg;
    if (msg.includes('server is listening')) {
      serverStatuses.set(provider.id, 'running');
    }
  });

  server.on('error', (err) => {
    errorMsg = err.message;
    serverStatuses.set(provider.id, 'error');
  });

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    if (await checkServerHealth(port)) {
      serverStatuses.set(provider.id, 'running');
      res.json({ ...provider, serverStatus: 'running' });
      return;
    }
  }

  serverStatuses.set(provider.id, 'error');
  res.status(500).json({ ...provider, serverStatus: 'error', error: errorMsg || 'Server failed to start' });
});

providersRouter.post('/:id/stop', async (req, res) => {
  await initProviders();
  const provider = providers.get(req.params.id);
  if (!provider) {
    res.status(404).json({ error: 'Provider not found' });
    return;
  }

  const server = activeServers.get(req.params.id);
  if (server) {
    server.kill();
    activeServers.delete(req.params.id);
  }
  serverStatuses.set(req.params.id, 'stopped');
  res.json({ ...provider, serverStatus: 'stopped' });
});

providersRouter.post('/:id/verify', async (req, res) => {
  await initProviders();
  const provider = providers.get(req.params.id);
  if (!provider) {
    res.status(404).json({ error: 'Provider not found' });
    return;
  }

  let verified = false;
  switch (provider.type) {
    case 'ollama':
      try {
        const res = await fetch(`${(provider as any).endpoint}/api/version`);
        verified = res.ok;
      } catch {}
      break;
    case 'lmstudio':
      try {
        const res = await fetch(`${(provider as any).endpoint}/api/models`);
        verified = res.ok;
      } catch {}
      break;
    case 'llamacpp':
      verified = serverStatuses.get(provider.id) === 'running';
      break;
    case 'claude':
    case 'minimax':
      verified = !!(provider as any).apiKey;
      break;
  }

  provider.status = verified ? 'verified' : 'error';
  providers.set(provider.id, provider);
  await saveProviders(providers);
  res.json(provider);
});
