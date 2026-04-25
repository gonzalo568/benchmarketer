import { spawn, ChildProcess, StdioOptions } from 'child_process';

interface ProcessCallbacks {
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
  onExit?: (code: number | null, signal: string | null) => void;
}

export class CliSpawner {
  private processes: Map<string, ChildProcess> = new Map();
  private callbacks: Map<string, ProcessCallbacks> = new Map();

  spawn(benchmarkId: string, command: string, args: string[]): ChildProcess {
    if (this.processes.has(benchmarkId)) {
      this.kill(benchmarkId);
    }

    const stdio: StdioOptions = ['ignore', 'pipe', 'pipe'];
    const child = spawn(command, args, { stdio });

    this.processes.set(benchmarkId, child);

    child.stdout?.on('data', (data: Buffer) => {
      const str = data.toString();
      const callbacks = this.callbacks.get(benchmarkId);
      callbacks?.onStdout?.(str);
    });

    child.stderr?.on('data', (data: Buffer) => {
      const str = data.toString();
      const callbacks = this.callbacks.get(benchmarkId);
      callbacks?.onStderr?.(str);
    });

    child.on('exit', (code, signal) => {
      const callbacks = this.callbacks.get(benchmarkId);
      callbacks?.onExit?.(code, signal);
      this.processes.delete(benchmarkId);
    });

    child.on('error', (err) => {
      console.error(`[CliSpawner] Process ${benchmarkId} error:`, err);
      this.processes.delete(benchmarkId);
    });

    return child;
  }

  kill(benchmarkId: string): void {
    const child = this.processes.get(benchmarkId);
    if (child) {
      child.kill('SIGTERM');
      this.processes.delete(benchmarkId);
    }
  }

  killAll(): void {
    for (const [benchmarkId] of this.processes) {
      this.kill(benchmarkId);
    }
  }

  isRunning(benchmarkId: string): boolean {
    const child = this.processes.get(benchmarkId);
    return child !== undefined && !child.killed;
  }

  onStdout(benchmarkId: string, callback: (data: string) => void): void {
    const existing = this.callbacks.get(benchmarkId) || {};
    this.callbacks.set(benchmarkId, { ...existing, onStdout: callback });
  }

  onStderr(benchmarkId: string, callback: (data: string) => void): void {
    const existing = this.callbacks.get(benchmarkId) || {};
    this.callbacks.set(benchmarkId, { ...existing, onStderr: callback });
  }

  onExit(benchmarkId: string, callback: (code: number | null, signal: string | null) => void): void {
    const existing = this.callbacks.get(benchmarkId) || {};
    this.callbacks.set(benchmarkId, { ...existing, onExit: callback });
  }

  getProcess(benchmarkId: string): ChildProcess | undefined {
    return this.processes.get(benchmarkId);
  }
}

export const cliSpawner = new CliSpawner();
