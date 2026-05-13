export type { IProvider, CompletionOptions } from './provider-interface';
export { LlamaCppProvider } from './llamacpp';
export type { LlamaCppConfig } from './llamacpp';
export { OllamaProvider } from './ollama';
export type { OllamaProviderConfig } from './ollama';
export { LMStudioProvider } from './lmstudio';
export type { LMStudioProviderConfig } from './lmstudio';
export { ClaudeProvider } from './claude';
export type { ClaudeProviderConfig } from './claude';
export { MinimaxProvider } from './minimax';
export type { MinimaxProviderConfig } from './minimax';
export { OpenAIProvider } from './openai';
export type { OpenAIProviderConfig } from './openai';

import type { LLMProvider } from '@benchmarketer/shared';
import { LlamaCppProvider } from './llamacpp';
import { OllamaProvider } from './ollama';
import { LMStudioProvider } from './lmstudio';
import { ClaudeProvider } from './claude';
import { MinimaxProvider } from './minimax';
import { OpenAIProvider } from './openai';
import type { IProvider } from './provider-interface';

export function createProvider(config: LLMProvider): IProvider {
  const baseSettings = config.settings || { temperature: 0.1, maxTokens: 400, timeoutMs: 120000 };

  switch (config.type) {
    case 'llamacpp':
      return new LlamaCppProvider({
        id: config.id,
        name: config.name,
        serverPath: config.binaryPath,
        modelPath: config.modelPath,
        host: config.host,
        port: config.serverPort,
        contextSize: config.contextSize,
        gpuLayers: config.gpuLayers,
        settings: baseSettings,
      });

    case 'ollama':
      return new OllamaProvider({
        id: config.id,
        name: config.name,
        endpoint: config.endpoint,
        modelName: config.modelName || 'llama3',
        settings: baseSettings,
      });

    case 'lmstudio':
      return new LMStudioProvider({
        id: config.id,
        name: config.name,
        endpoint: config.endpoint,
        modelName: config.modelName || '',
        settings: baseSettings,
      });

    case 'claude':
      return new ClaudeProvider({
        id: config.id,
        name: config.name,
        apiKey: config.apiKey,
        modelName: config.modelName,
        settings: baseSettings,
      });

    case 'minimax':
      return new MinimaxProvider({
        id: config.id,
        name: config.name,
        apiKey: config.apiKey,
        modelName: config.modelName,
        settings: baseSettings,
      });

    case 'openai':
      return new OpenAIProvider({
        id: config.id,
        name: config.name,
        apiKey: config.apiKey,
        modelName: config.modelName,
        apiEndpoint: config.apiEndpoint,
        settings: baseSettings,
      });

    default:
      throw new Error(`Unknown provider type: ${(config as any).type}`);
  }
}
