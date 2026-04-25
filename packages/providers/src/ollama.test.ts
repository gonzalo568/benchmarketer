import { test, expect, describe } from 'vitest';

const OLLAMA_HOST = 'http://localhost:11434';

async function ollamaPing(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/version`);
    return res.ok;
  } catch {
    return false;
  }
}

describe('Ollama Provider', () => {
  test('pings Ollama server', async () => {
    const result = await ollamaPing();
    expect(result).toBeTruthy();
  });
});
