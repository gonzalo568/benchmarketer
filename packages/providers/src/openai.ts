import type { IProvider, CompletionOptions } from './provider-interface';

export interface OpenAIProviderConfig {
  id: string;
  name: string;
  apiKey: string;
  modelName: string;
  apiEndpoint?: string;
  settings: {
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
  };
}

export class OpenAIProvider implements IProvider {
  readonly type = 'openai' as const;
  readonly id: string;
  readonly name: string;
  private readonly apiKey: string;
  readonly modelName: string;
  private readonly apiEndpoint: string;
  private readonly settings: OpenAIProviderConfig['settings'];

  constructor(config: OpenAIProviderConfig) {
    this.id = config.id;
    this.name = config.name;
    this.apiKey = config.apiKey;
    this.modelName = config.modelName;
    this.apiEndpoint = config.apiEndpoint || 'https://api.openai.com/v1';
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
      const res = await fetch(`${this.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
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
        const errorBody = await res.text().catch(() => '');
        throw new Error(`OpenAI API error: ${res.status} ${res.statusText} - ${errorBody}`);
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
    if (!this.apiKey) {
      return { verified: false, message: 'No API key configured' };
    }
    try {
      const res = await fetch(`${this.apiEndpoint}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      if (res.ok) {
        return { verified: true, message: `Connected to OpenAI (${this.modelName})` };
      }
      return { verified: false, message: `OpenAI API returned ${res.status}` };
    } catch (err) {
      return { verified: false, message: `Cannot reach OpenAI API: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  async listModels(): Promise<Array<{ name: string; id: string }>> {
    try {
      const res = await fetch(`${this.apiEndpoint}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      if (!res.ok) return [];
      const data = await res.json() as { data?: Array<{ id: string }> };
      return (data.data || [])
        .filter(m => m.id.startsWith('gpt-'))
        .map(m => ({ name: m.id, id: m.id }));
    } catch {
      return [
        { name: 'GPT-4o', id: 'gpt-4o' },
        { name: 'GPT-4o Mini', id: 'gpt-4o-mini' },
        { name: 'GPT-4 Turbo', id: 'gpt-4-turbo' },
      ];
    }
  }
}
