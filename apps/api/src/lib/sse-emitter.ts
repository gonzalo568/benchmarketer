import type { Response } from 'express';

export interface SseEvent {
  type: 'progress' | 'provider.started' | 'provider.completed' | 'provider.failed' | 'benchmark.completed' | 'benchmark.cancelled' | 'benchmark.started';
  benchmarkId?: string;
  providerId?: string;
  providerName?: string;
  percent?: number;
  result?: unknown;
  error?: string;
  message?: string;
}

export class SseEmitter {
  private clients: Map<string, Response[]> = new Map();

  addClient(benchmarkId: string, res: Response): void {
    const existing = this.clients.get(benchmarkId) || [];
    existing.push(res);
    this.clients.set(benchmarkId, existing);
  }

  removeClient(benchmarkId: string, res: Response): void {
    const existing = this.clients.get(benchmarkId) || [];
    const updated = existing.filter(client => client !== res);
    if (updated.length === 0) {
      this.clients.delete(benchmarkId);
    } else {
      this.clients.set(benchmarkId, updated);
    }
  }

  removeAllClients(benchmarkId: string): void {
    this.clients.delete(benchmarkId);
  }

  emit(benchmarkId: string, event: SseEvent): void {
    const clients = this.clients.get(benchmarkId) || [];
    const data = `data: ${JSON.stringify(event)}\n\n`;

    for (const client of clients) {
      if (!client.writableEnded) {
        client.write(data);
      }
    }
  }

  emitAndClose(benchmarkId: string, event: SseEvent): void {
    this.emit(benchmarkId, event);
    setTimeout(() => {
      const clients = this.clients.get(benchmarkId) || [];
      for (const client of clients) {
        if (!client.writableEnded) {
          client.end();
        }
      }
      this.clients.delete(benchmarkId);
    }, 100);
  }

  getClientCount(benchmarkId: string): number {
    return (this.clients.get(benchmarkId) || []).length;
  }

  hasClients(benchmarkId: string): boolean {
    return this.getClientCount(benchmarkId) > 0;
  }
}

export const sseEmitter = new SseEmitter();
