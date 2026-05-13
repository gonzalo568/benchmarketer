import type { IProvider, CompletionOptions } from './provider-interface';

export interface ClaudeProviderConfig {
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

export class ClaudeProvider implements IProvider {
  readonly type = 'claude' as const;
  readonly id: string;
  readonly name: string;
  private readonly apiKey: string;
  readonly modelName: string;
  private readonly apiEndpoint: string;
  private readonly settings: ClaudeProviderConfig['settings'];

  constructor(config: ClaudeProviderConfig) {
    this.id = config.id;
    this.name = config.name;
    this.apiKey = config.apiKey;
    this.modelName = config.modelName;
    this.apiEndpoint = config.apiEndpoint || 'https://api.anthropic.com/v1';
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
      const res = await fetch(`${this.apiEndpoint}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
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
        throw new Error(`Claude API error: ${res.status} ${res.statusText} - ${errorBody}`);
      }

      const data = await res.json() as {
        content?: Array<{ text?: string }>;
        usage?: { output_tokens?: number };
      };

      const output = data.content?.[0]?.text || '';
      const tokensUsed = data.usage?.output_tokens || Math.ceil(output.length / 4);
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
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
      });
      if (res.ok) {
        return { verified: true, message: `Connected to Claude (${this.modelName})` };
      }
      return { verified: false, message: `Claude API returned ${res.status}` };
    } catch (err) {
      return { verified: false, message: `Cannot reach Claude API: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  async listModels(): Promise<Array<{ name: string; id: string }>> {
    return [
      { name: 'Claude Opus 4', id: 'claude-opus-4-20250514' },
      { name: 'Claude Sonnet 4', id: 'claude-sonnet-4-20250514' },
      { name: 'Claude Haiku 4', id: 'claude-haiku-4-20250515' },
    ];
  }
}
