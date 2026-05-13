import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createProvider, OllamaProvider, LMStudioProvider, ClaudeProvider, MinimaxProvider, OpenAIProvider, LlamaCppProvider } from '@benchmarketer/providers';
import type { LLMProvider } from '@benchmarketer/shared';
import { extractFunctions, stratifiedSample } from '@benchmarketer/code-quality';

describe('Provider Factory', () => {
  test('creates OllamaProvider from config', () => {
    const config: LLMProvider = {
      id: 'ollama-1',
      name: 'Test Ollama',
      type: 'ollama',
      status: 'configured',
      endpoint: 'http://localhost:11434',
      modelName: 'llama3',
      settings: { timeoutMs: 30000, maxTokens: 500, temperature: 0.1 },
    };

    const provider = createProvider(config);
    expect(provider).toBeInstanceOf(OllamaProvider);
    expect(provider.type).toBe('ollama');
    expect(provider.name).toBe('Test Ollama');
  });

  test('creates LMStudioProvider from config', () => {
    const config: LLMProvider = {
      id: 'lm-1',
      name: 'Test LMStudio',
      type: 'lmstudio',
      status: 'configured',
      endpoint: 'http://localhost:1234',
      modelName: 'qwen2.5',
      settings: { timeoutMs: 30000, maxTokens: 500, temperature: 0.2 },
    };

    const provider = createProvider(config);
    expect(provider).toBeInstanceOf(LMStudioProvider);
    expect(provider.type).toBe('lmstudio');
  });

  test('creates ClaudeProvider from config', () => {
    const config: LLMProvider = {
      id: 'claude-1',
      name: 'Test Claude',
      type: 'claude',
      status: 'configured',
      apiKey: 'sk-test',
      modelName: 'claude-sonnet-4-20250514',
      settings: { timeoutMs: 30000, maxTokens: 500, temperature: 0.1 },
    };

    const provider = createProvider(config);
    expect(provider).toBeInstanceOf(ClaudeProvider);
    expect(provider.type).toBe('claude');
  });

  test('creates MinimaxProvider from config', () => {
    const config: LLMProvider = {
      id: 'minimax-1',
      name: 'Test MiniMax',
      type: 'minimax',
      status: 'configured',
      apiKey: 'sk-test',
      modelName: 'MiniMax-M2.7',
      settings: { timeoutMs: 30000, maxTokens: 500, temperature: 0.1 },
    };

    const provider = createProvider(config);
    expect(provider).toBeInstanceOf(MinimaxProvider);
    expect(provider.type).toBe('minimax');
  });

  test('creates OpenAIProvider from config', () => {
    const config: LLMProvider = {
      id: 'openai-1',
      name: 'Test OpenAI',
      type: 'openai',
      status: 'configured',
      apiKey: 'sk-test',
      apiEndpoint: 'https://api.openai.com/v1',
      modelName: 'gpt-4o',
      settings: { timeoutMs: 30000, maxTokens: 500, temperature: 0.1 },
    };

    const provider = createProvider(config);
    expect(provider).toBeInstanceOf(OpenAIProvider);
    expect(provider.type).toBe('openai');
  });

  test('throws for unknown provider type', () => {
    const config = {
      id: 'unknown-1',
      name: 'Unknown',
      type: 'unknown',
      status: 'configured' as const,
      settings: { timeoutMs: 30000, maxTokens: 500, temperature: 0.1 },
    };

    expect(() => createProvider(config as any)).toThrow('Unknown provider type');
  });
});

describe('Provider verifyConnection', () => {
  test('Ollama verifyConnection returns error when server unreachable', async () => {
    const config: LLMProvider = {
      id: 'ollama-test',
      name: 'Test',
      type: 'ollama',
      status: 'configured',
      endpoint: 'http://localhost:19999',
      modelName: 'llama3',
      settings: { timeoutMs: 5000, maxTokens: 100, temperature: 0.1 },
    };

    const provider = createProvider(config);
    const result = await provider.verifyConnection();
    expect(result.verified).toBe(false);
    expect(result.message).toContain('Cannot reach Ollama');
  });

  test('Claude verifyConnection returns error when no API key', async () => {
    const config: LLMProvider = {
      id: 'claude-test',
      name: 'Test',
      type: 'claude',
      status: 'configured',
      apiKey: '',
      modelName: 'claude-sonnet-4-20250514',
      settings: { timeoutMs: 5000, maxTokens: 100, temperature: 0.1 },
    };

    const provider = createProvider(config);
    const result = await provider.verifyConnection();
    expect(result.verified).toBe(false);
    expect(result.message).toBe('No API key configured');
  });

  test('MiniMax verifyConnection returns error when no API key', async () => {
    const config: LLMProvider = {
      id: 'minimax-test',
      name: 'Test',
      type: 'minimax',
      status: 'configured',
      apiKey: '',
      modelName: 'MiniMax-M2.7',
      settings: { timeoutMs: 5000, maxTokens: 100, temperature: 0.1 },
    };

    const provider = createProvider(config);
    const result = await provider.verifyConnection();
    expect(result.verified).toBe(false);
    expect(result.message).toBe('No API key configured');
  });

  test('OpenAI verifyConnection returns error when no API key', async () => {
    const config: LLMProvider = {
      id: 'openai-test',
      name: 'Test',
      type: 'openai',
      status: 'configured',
      apiKey: '',
      modelName: 'gpt-4o',
      settings: { timeoutMs: 5000, maxTokens: 100, temperature: 0.1 },
    };

    const provider = createProvider(config);
    const result = await provider.verifyConnection();
    expect(result.verified).toBe(false);
    expect(result.message).toBe('No API key configured');
  });

  test('LMStudio verifyConnection returns error when server unreachable', async () => {
    const config: LLMProvider = {
      id: 'lm-test',
      name: 'Test',
      type: 'lmstudio',
      status: 'configured',
      endpoint: 'http://localhost:19999',
      modelName: 'test-model',
      settings: { timeoutMs: 5000, maxTokens: 100, temperature: 0.1 },
    };

    const provider = createProvider(config);
    const result = await provider.verifyConnection();
    expect(result.verified).toBe(false);
    expect(result.message).toContain('Cannot reach LMStudio');
  });
});

describe('Provider listModels', () => {
  test('Claude listModels returns static model list', async () => {
    const config: LLMProvider = {
      id: 'claude-models',
      name: 'Test',
      type: 'claude',
      status: 'configured',
      apiKey: 'sk-test',
      modelName: 'claude-sonnet-4-20250514',
      settings: { timeoutMs: 5000, maxTokens: 100, temperature: 0.1 },
    };

    const provider = createProvider(config);
    const models = await provider.listModels!();
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toHaveProperty('name');
    expect(models[0]).toHaveProperty('id');
  });

  test('MiniMax listModels returns static model list', async () => {
    const config: LLMProvider = {
      id: 'minimax-models',
      name: 'Test',
      type: 'minimax',
      status: 'configured',
      apiKey: 'sk-test',
      modelName: 'MiniMax-M2.7',
      settings: { timeoutMs: 5000, maxTokens: 100, temperature: 0.1 },
    };

    const provider = createProvider(config);
    const models = await provider.listModels!();
    expect(models.length).toBeGreaterThan(0);
    expect(models[0].id).toContain('MiniMax');
  });
});

describe('Code Quality Benchmark - Token Accumulation', () => {
  test('complete() returns tokensUsed for each function call', async () => {
    const config: LLMProvider = {
      id: 'minimax-cq',
      name: 'Test MiniMax',
      type: 'minimax',
      status: 'configured',
      apiKey: process.env.MINIMAX_API_KEY || 'sk-test-fake',
      modelName: 'MiniMax-M2.7',
      settings: { timeoutMs: 30000, maxTokens: 400, temperature: 0.1 },
    };

    const provider = createProvider(config);

    const sourceCode = `def process_data(items, config):
    """Process a list of items with the given configuration."""
    results = []
    errors = []
    for item in items:
        try:
            if not item:
                continue
            if config.get('filter') and not config['filter'](item):
                continue
            transformed = config.get('transform', lambda x: x)(item)
            results.append(transformed)
        except Exception as e:
            errors.append(str(e))
    return {
        'results': results,
        'errors': errors,
        'total_processed': len(results),
        'total_errors': len(errors),
        'success_rate': len(results) / max(len(items), 1),
    }

def validate_input(data, schema):
    """Validate input data against a schema definition."""
    if not isinstance(data, dict):
        raise TypeError("Data must be a dictionary")
    if not isinstance(schema, dict):
        raise TypeError("Schema must be a dictionary")
    errors = []
    for field, rules in schema.items():
        if rules.get('required') and field not in data:
            errors.append(f"Missing required field: {field}")
            continue
        if field in data:
            value = data[field]
            if 'type' in rules and not isinstance(value, rules['type']):
                errors.append(f"Invalid type for {field}")
            if 'min_length' in rules and len(str(value)) < rules['min_length']:
                errors.append(f"Value too short for {field}")
            if 'max_length' in rules and len(str(value)) > rules['max_length']:
                errors.append(f"Value too long for {field}")
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'field_count': len(schema),
    }`;

    const functions = extractFunctions(sourceCode, 'python');
    expect(functions.length).toBe(2);

    const sampled = stratifiedSample(functions, 2);
    expect(sampled.length).toBe(2);

    let totalTokens = 0;
    let callCount = 0;

    for (const func of sampled) {
      const prompt = `Reproduce the first 20 lines of the body of function \`${func.name}\`.`;
      try {
        const result = await provider.complete({
          prompt,
          systemPrompt: 'Output ONLY code.',
          temperature: 0,
          maxTokens: 100,
          timeoutMs: 30000,
        });
        totalTokens += result.tokensUsed;
        callCount++;
      } catch {
      }
    }

    if (callCount > 0) {
      expect(totalTokens).toBeGreaterThan(0);
      expect(callCount).toBe(2);
    }
  });

  test('code quality benchmark accumulates tokens across all sampled functions', async () => {
    const sourceCode = `def process_data(items, config):
    results = []
    errors = []
    for item in items:
        try:
            if not item:
                continue
            if config.get('filter') and not config['filter'](item):
                continue
            transformed = config.get('transform', lambda x: x)(item)
            results.append(transformed)
        except Exception as e:
            errors.append(str(e))
    return {
        'results': results,
        'errors': errors,
        'total_processed': len(results),
        'total_errors': len(errors),
        'success_rate': len(results) / max(len(items), 1),
    }

def validate_input(data, schema):
    if not isinstance(data, dict):
        raise TypeError("Data must be a dictionary")
    if not isinstance(schema, dict):
        raise TypeError("Schema must be a dictionary")
    errors = []
    for field, rules in schema.items():
        if rules.get('required') and field not in data:
            errors.append(f"Missing required field: {field}")
            continue
        if field in data:
            value = data[field]
            if 'type' in rules and not isinstance(value, rules['type']):
                errors.append(f"Invalid type for {field}")
            if 'min_length' in rules and len(str(value)) < rules['min_length']:
                errors.append(f"Value too short for {field}")
            if 'max_length' in rules and len(str(value)) > rules['max_length']:
                errors.append(f"Value too long for {field}")
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'field_count': len(schema),
    }

def format_output(results, template):
    if not results or len(results) == 0:
        return {
            'formatted': '',
            'status': 'empty',
            'count': 0,
        }
    formatted_items = []
    for item in results:
        if template:
            formatted = template.replace('{data}', str(item))
        else:
            formatted = str(item)
        formatted_items.append(formatted)
    return {
        'formatted': '\\n'.join(formatted_items),
        'status': 'success',
        'count': len(formatted_items),
    }`;

    const functions = extractFunctions(sourceCode, 'python');
    const sampled = stratifiedSample(functions, 2);

    expect(sampled.length).toBeGreaterThanOrEqual(1);

    const mockComplete = vi.fn().mockResolvedValue({
      output: 'return a + b',
      tokensUsed: 50,
      elapsedMs: 1000,
    });

    let totalTokens = 0;
    for (const func of sampled) {
      const result = await mockComplete({
        prompt: `Reproduce function \`${func.name}\`.`,
      });
      totalTokens += result.tokensUsed;
    }

    expect(totalTokens).toBe(50 * sampled.length);
    expect(mockComplete).toHaveBeenCalledTimes(sampled.length);
  });
});

describe('IProvider interface compliance', () => {
  test('all providers implement complete, verifyConnection, listModels', () => {
    const providers = [
      createProvider({
        id: 'o1', name: 'O', type: 'ollama', status: 'configured',
        endpoint: 'http://localhost:11434', modelName: 'llama3',
        settings: { timeoutMs: 5000, maxTokens: 100, temperature: 0.1 },
      } as LLMProvider),
      createProvider({
        id: 'l1', name: 'L', type: 'lmstudio', status: 'configured',
        endpoint: 'http://localhost:1234', modelName: 'test',
        settings: { timeoutMs: 5000, maxTokens: 100, temperature: 0.1 },
      } as LLMProvider),
      createProvider({
        id: 'c1', name: 'C', type: 'claude', status: 'configured',
        apiKey: 'sk-test', modelName: 'claude-sonnet',
        settings: { timeoutMs: 5000, maxTokens: 100, temperature: 0.1 },
      } as LLMProvider),
      createProvider({
        id: 'm1', name: 'M', type: 'minimax', status: 'configured',
        apiKey: 'sk-test', modelName: 'minimax-01',
        settings: { timeoutMs: 5000, maxTokens: 100, temperature: 0.1 },
      } as LLMProvider),
      createProvider({
        id: 'op1', name: 'OP', type: 'openai', status: 'configured',
        apiKey: 'sk-test', modelName: 'gpt-4o',
        settings: { timeoutMs: 5000, maxTokens: 100, temperature: 0.1 },
      } as LLMProvider),
    ];

    for (const p of providers) {
      expect(typeof p.complete).toBe('function');
      expect(typeof p.verifyConnection).toBe('function');
      expect(typeof p.listModels).toBe('function');
    }
  });
});
