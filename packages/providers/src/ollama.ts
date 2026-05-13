import type { IProvider, CompletionOptions } from './provider-interface';

export interface OllamaProviderConfig {
  id: string;
  name: string;
  endpoint: string;
  modelName: string;
  settings: {
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
  };
}

export class OllamaProvider implements IProvider {
  readonly type = 'ollama' as const;
  readonly id: string;
  readonly name: string;
  readonly endpoint: string;
  readonly modelName: string;
  private readonly settings: OllamaProviderConfig['settings'];

  constructor(config: OllamaProviderConfig) {
    this.id = config.id;
    this.name = config.name;
    this.endpoint = config.endpoint;
    this.modelName = config.modelName;
    this.settings = config.settings;
  }

  async complete(options: CompletionOptions): Promise<{ output: string; tokensUsed: number; elapsedMs: number }> {
    const start = Date.now();
    const timeout = options.timeoutMs || this.settings.timeoutMs || 120000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelName,
          prompt: options.prompt,
          stream: false,
          options: {
            temperature: options.temperature ?? this.settings.temperature,
            num_predict: options.maxTokens ?? this.settings.maxTokens,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Ollama API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json() as { response?: string; prompt_eval_count?: number; eval_count?: number };
      const output = data.response || '';
      const tokensUsed = data.eval_count || Math.ceil(output.length / 4);
      const elapsed = Date.now() - start;

      return { output, tokensUsed, elapsedMs: elapsed };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  async verifyConnection(): Promise<{ verified: boolean; message: string }> {
    try {
      const res = await fetch(`${this.endpoint}/api/version`);
      if (res.ok) {
        const data = await res.json() as { version?: string };
        return { verified: true, message: `Connected to Ollama ${data.version || 'unknown'}` };
      }
      return { verified: false, message: `Ollama returned ${res.status}` };
    } catch (err) {
      return { verified: false, message: `Cannot reach Ollama at ${this.endpoint}: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  async listModels(): Promise<Array<{ name: string; id: string }>> {
    try {
      const res = await fetch(`${this.endpoint}/api/tags`);
      if (!res.ok) return [];
      const data = await res.json() as { models?: Array<{ name: string; size?: number }> };
      return (data.models || []).map(m => ({
        name: m.name,
        id: m.name,
        size: m.size,
      }));
    } catch {
      return [];
    }
  }
}
