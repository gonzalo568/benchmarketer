import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { listLlamaCppModels } from '../lib/persistence';

export const configRouter = Router();

configRouter.get('/', async (_req, res) => {
  const modelsDir = process.env.MODELS_DIR || '/home/frit/models';
  const models = await listLlamaCppModels(modelsDir);

  res.json({
    defaultTimeout: 300000,
    defaultTemperature: 0.7,
    dataDir: process.env.DATA_DIR || './data',
    serverBinary: '/home/frit/llama/llama-b8882-rocm72/llama-b8882/llama-server',
    modelsDir,
    availableModels: models,
    defaultPort: 8080,
    defaultContextSize: 512,
    defaultGpuLayers: 99,
    providerDefaults: {
      llamacpp: {
        binaryPath: '/home/frit/llama/llama-b8882-rocm72/llama-b8882/llama-server',
        modelsDir: '/home/frit/models',
        serverPort: 8080,
        contextSize: 512,
        gpuLayers: 99,
      },
      ollama: {
        endpoint: 'http://localhost:11434',
      },
      lmstudio: {
        endpoint: 'http://localhost:1234',
      },
      claude: {
        apiKey: '',
      },
      minimax: {
        apiKey: '',
      },
    },
  });
});

configRouter.get('/models', async (req, res) => {
  const modelsDir = req.query.dir as string || process.env.MODELS_DIR || '/home/frit/models';
  const models = await listLlamaCppModels(modelsDir);
  res.json(models);
});

configRouter.get('/filesystem/dirlist', async (req, res) => {
  const dir = req.query.path as string || process.env.MODELS_DIR || '/home/frit/models';
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const result = entries
      .filter(e => e.isDirectory() || (e.isFile() && e.name.endsWith('.gguf')))
      .map(e => ({
        name: e.name,
        path: path.join(dir, e.name),
        isDirectory: e.isDirectory(),
      }))
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    res.json({ currentPath: dir, entries: result });
  } catch (err) {
    res.status(400).json({ error: 'Cannot read directory' });
  }
});

configRouter.put('/', (req, res) => {
  res.json({ success: true });
});
