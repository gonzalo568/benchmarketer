// LLM Provider Types
export type ProviderType = 'llamacpp' | 'ollama' | 'lmstudio' | 'claude' | 'minimax' | 'openai';
export type ServerStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface LLMProviderBase {
  id: string;
  name: string;
  type: ProviderType;
  status: 'configured' | 'verified' | 'error';
  settings: ProviderSettings;
}

export interface LlamaCppProvider extends LLMProviderBase {
  type: 'llamacpp';
  binaryPath: string;
  modelsDir?: string;
  modelPath: string;
  host?: string;
  serverPort: number;
  contextSize?: number;
  gpuLayers?: number;
}

export interface OllamaProvider extends LLMProviderBase {
  type: 'ollama';
  endpoint: string;
  modelName?: string;
}

export interface LMStudioProvider extends LLMProviderBase {
  type: 'lmstudio';
  endpoint: string;
  modelName?: string;
}

export interface ClaudeProvider extends LLMProviderBase {
  type: 'claude';
  apiKey: string;
  modelName: string;
}

export interface MinimaxProvider extends LLMProviderBase {
  type: 'minimax';
  apiKey: string;
  modelName: string;
}

export interface OpenAIProvider extends LLMProviderBase {
  type: 'openai';
  apiKey: string;
  apiEndpoint?: string;
  modelName: string;
}

export type LLMProvider = LlamaCppProvider | OllamaProvider | LMStudioProvider | ClaudeProvider | MinimaxProvider | OpenAIProvider;

export interface ProviderSettings {
  timeoutMs: number;
  maxTokens: number;
  temperature: number;
}

export interface AvailableModel {
  name: string;
  id: string;
  size?: number;
}

// Benchmark Types
export type TaskLevel = 'L1' | 'L2' | 'L3' | 'L4';
export type TaskType = 'generation' | 'code-quality';

export interface BenchmarkTask {
  id: string;
  name: string;
  level: TaskLevel;
  type?: TaskType;
  description: string;
  prompt: string;
  expectedPatterns?: string[];
  forbiddenPatterns?: string[];
  validation?: TaskValidation;
  codeQualityConfig?: CodeQualityConfig;
}

export interface CodeQualityConfig {
  sourceCode: string;
  language: 'python' | 'javascript';
  minBodyLines?: number;
  bonusCap?: number;
  passThreshold?: number;
  relaxIndent?: boolean;
  sampleSize?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface TaskValidation {
  type: 'tests' | 'lint' | 'manual';
  config: Record<string, unknown>;
}

export interface BenchmarkOptions {
  task: string;
  timeoutMs?: number;
  temperature?: number;
}

export interface BenchmarkResult {
  id: string;
  taskId: string;
  providerId: string;
  providerName: string;
  executionTimeMs: number;
  tokensUsed: number;
  tokensPerSecond: number;
  qualityScore: number;
  qualityScoreUser?: number;
  output: string;
  qualityMetrics: QualityMetrics;
  settings?: {
    temperature?: number;
    maxTokens?: number;
  };
  status: 'success' | 'partial' | 'failed';
  error?: string;
  timestamp: string;
}

export interface QualityMetrics {
  testsPassed: number;
  testsTotal: number;
  lintErrors: number;
  outputLength: number;
  ppTokensPerSec?: number;
  tgTokensPerSec?: number;
  codeQuality?: CodeQualityMetrics;
}

export interface CodeQualityMetrics {
  passRate: number;
  totalMatched: number;
  totalPrimary: number;
  totalHallucinated: number;
  totalBonus: number;
  score: number;
  functionsTested: number;
}

// Hardware Context
export interface HardwareContext {
  cpu: CPUInfo;
  ram: RAMInfo;
  gpu?: GPUInfo;
  os: OSInfo;
}

export interface CPUInfo {
  model: string;
  cores: number;
  clockSpeedGHz: number;
}

export interface RAMInfo {
  totalGB: number;
  availableGB: number;
}

export interface GPUInfo {
  model: string;
  vramGB: number;
}

export interface OSInfo {
  platform: string;
  distribution: string;
  kernelVersion: string;
}

// Benchmark Execution
export interface BenchmarkExecution {
  id: string;
  taskId: string;
  providerIds: string[];
  status: 'pending' | 'running' | 'completed' | 'cancelled';
  progress: number;
  results: BenchmarkResult[];
  hardwareContext: HardwareContext;
  startedAt: string;
  completedAt?: string;
}

// Export Format
export interface BenchmarkExport {
  version: string;
  frameworkVersion: string;
  timestamp: string;
  execution: BenchmarkExecution;
  task: BenchmarkTask;
  hardwareContext: HardwareContext;
  providers: LLMProvider[];
}
