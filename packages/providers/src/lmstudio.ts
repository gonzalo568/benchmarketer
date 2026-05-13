import type { IProvider, CompletionOptions } from './provider-interface';

export interface LMStudioProviderConfig {
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

export class LMStudioProvider implements IProvider {
  readonly type = 'lmstudio' as const;
  readonly id: string;
  readonly name: string;
  readonly endpoint: string;
  readonly modelName: string;
  private readonly settings: LMStudioProviderConfig['settings'];

  constructor(config: LMStudioProviderConfig) {
    this.id = config.id;
    this.name = config.name;
    this.endpoint = config.endpoint;
    this.modelName = config.modelName;
    this.settings = config.settings;
  }

  async complete(options: CompletionOptions): Promise<{ output: string; tokensUsed: number; elapsedMs: number }> {
    const start = Date.now();
    const timeout = options.timeoutMs || this.settings.timeoutMs || 120000;

    const messages: Array<{ role: string; content: string }> = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: options.prompt });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(`${this.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelName,
          messages,
          max_tokens: options.maxTokens ?? this.settings.maxTokens,
          temperature: options.temperature ?? this.settings.temperature,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`LMStudio API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json() as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { completion_tokens?: number };
      };

      const output = data.choices?.[0]?.message?.content || '';
      const tokensUsed = data.usage?.completion_tokens || Math.ceil(output.length / 4);
      const elapsed = Date.now() - start;

      return { output, tokensUsed, elapsedMs: elapsed };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  async verifyConnection(): Promise<{ verified: boolean; message: string }> {
    try {
      const res = await fetch(`${this.endpoint}/v1/models`);
      if (res.ok) {
        return { verified: true, message: 'Connected to LMStudio' };
      }
      return { verified: false, message: `LMStudio returned ${res.status}` };
    } catch (err) {
      return { verified: false, message: `Cannot reach LMStudio at ${this.endpoint}: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  async listModels(): Promise<Array<{ name: string; id: string }>> {
    try {
      const res = await fetch(`${this.endpoint}/v1/models`);
      if (!res.ok) return [];
      const data = await res.json() as { data?: Array<{ id: string }> };
      return (data.data || []).map(m => ({
        name: m.id,
        id: m.id,
      }));
    } catch {
      return [];
    }
  }
}
