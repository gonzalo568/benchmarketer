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

configRouter.put('/', (req, res) => {
  res.json({ success: true });
});
