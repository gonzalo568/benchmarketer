import { Command } from 'commander';
import chalk from 'chalk';
import type { LLMProvider } from '@benchmarketer/shared';

const providers = new Map<string, LLMProvider>();

export const listProvidersCommand = new Command('list')
  .description('List configured providers')
  .action(() => {
    if (providers.size === 0) {
      console.log('No providers configured');
      return;
    }
    console.log('\nProviders:');
    Array.from(providers.values()).forEach(p => {
      console.log(`  ${p.name} (${p.type}) - ${p.status}`);
    });
  });

export const addProviderCommand = new Command('add')
  .description('Add a new provider')
  .requiredOption('-n, --name <name>', 'Provider name')
  .requiredOption('-t, --type <type>', 'Provider type')
  .option('-e, --endpoint <url>', 'API endpoint')
  .option('-p, --path <path>', 'Binary path')
  .action((opts) => {
    const provider = {
      id: crypto.randomUUID(),
      name: opts.name,
      type: opts.type,
      endpoint: opts.endpoint,
      binaryPath: opts.path,
      status: 'configured' as const,
      settings: { timeoutMs: 120000, maxTokens: 4096, temperature: 0.7, modelName: 'default' },
    };
    providers.set(provider.id, provider);
    console.log(chalk.green(`Provider "${opts.name}" added`));
  });

export const verifyCommand = new Command('verify')
  .description('Verify provider connection')
  .argument('<provider-id>')
  .action((id) => {
    console.log(`Verifying ${id}...`);
  });
