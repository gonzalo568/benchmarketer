---
title: 'Epic 5 - API Server: SSE Streaming & CLI Process Management'
type: 'feature'
created: '2026-04-25'
status: 'done'
baseline_commit: '2ee637e7abc9fdebac42e854d60c526a8ddb66a5'
context:
  - 'apps/api/src/index.ts'
  - 'apps/api/src/routes/benchmarks.ts'
  - 'apps/api/src/routes/providers.ts'
---

## Intent

**Problem:** The API server's SSE streaming endpoint is a stub that only sends a hardcoded message, and benchmark execution happens inline rather than spawning CLI processes as specified in the architecture.

**Approach:** Implement proper SSE streaming that pushes real-time progress events, and refactor benchmark execution to spawn CLI child processes with stdout/stderr capture and process lifecycle management.

## Boundaries & Constraints

**Always:**
- SSE endpoint must send events with `data:` prefix and double-newline suffix
- CLI process spawning uses Node.js `child_process.spawn` with stdio: 'pipe'
- All existing REST endpoints must remain functional
- SSE connections must be properly cleaned up on benchmark completion/cancellation

**Ask First:**
- If we need to change the CLI command structure or add new CLI flags
- If we need to modify the SSE event schema format

**Never:**
- Do not hardcode credentials or API keys
- Do not block the event loop with synchronous operations
- Do not leave zombie CLI processes running

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| SSE_CONNECT | GET /api/benchmarks/:id/stream | Streams SSE events with Content-Type: text/event-stream | 404 if benchmark not found |
| PROGRESS_UPDATE | Benchmark running | SSE event: `data: {"type":"progress","provider":"ollama","task":"L1","percent":25}\n\n` | Continue if one provider fails |
| PROVIDER_STARTED | New provider begins | SSE event: `data: {"type":"provider.started","providerId":"...","providerName":"Ollama"}\n\n` | N/A |
| PROVIDER_COMPLETED | Provider finishes | SSE event: `data: {"type":"provider.completed","providerId":"...","result":{...}}\n\n` | Mark failed providers |
| PROVIDER_FAILED | Provider errors | SSE event: `data: {"type":"provider.failed","providerId":"...","error":"..."}\n\n` | Continue benchmark |
| BENCHMARK_COMPLETE | All providers done | SSE event: `data: {"type":"benchmark.completed","executionId":"..."}\n\n` + connection close | N/A |
| BENCHMARK_CANCEL | POST /api/benchmarks/:id/cancel | Kill CLI process, SSE event: `data: {"type":"benchmark.cancelled"}\n\n` | Partial results saved |

## Code Map

- `apps/api/src/index.ts` -- SSE endpoint registration and streaming implementation
- `apps/api/src/routes/benchmarks.ts` -- Benchmark CRUD + refactor to CLI spawning
- `apps/api/src/lib/cli-spawner.ts` -- New: CLI process spawning utility
- `apps/api/src/lib/sse-emitter.ts` -- New: SSE event emitter for progress streaming

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/lib/cli-spawner.ts` -- CREATE -- Utility module for spawning CLI benchmarks with stdout/stderr capture and process lifecycle (start, kill, onExit)
- [x] `apps/api/src/lib/sse-emitter.ts` -- CREATE -- SSE event emitter class that manages connected clients and broadcasts progress events
- [x] `apps/api/src/index.ts` -- MODIFY -- Refactor SSE endpoint to use SSE-emitter, accept benchmarkId, and stream real events
- [x] `apps/api/src/routes/benchmarks.ts` -- MODIFY -- Refactor `/benchmarks/:id/start` to spawn CLI process using cli-spawner and emit SSE events

**Acceptance Criteria:**
- Given a benchmark is running, when dashboard connects to `/api/benchmarks/:id/stream`, then SSE events are sent with progress updates including provider started, provider completed, provider failed, and percentage
- Given a benchmark is running, when `POST /api/benchmarks/:id/start` is called, then a CLI process is spawned and managed with proper cleanup on cancel/complete
- Given a benchmark is running, when Ctrl+C or cancel is triggered, then all running CLI processes are killed and partial results are saved

## Spec Change Log

<!-- Empty until first review loop -->

## Design Notes

**SSE Event Schema:**
```json
{ "type": "progress"|"provider.started"|"provider.completed"|"provider.failed"|"benchmark.completed"|"benchmark.cancelled", "providerId"?: string, "providerName"?: string, "percent"?: number, "result"?: BenchmarkResult, "error"?: string }
```

**CLI Spawner Interface:**
```typescript
interface CliSpawner {
  spawn(benchmarkId: string, providers: string[], task: string): ChildProcess;
  kill(benchmarkId: string): void;
  onStdout(benchmarkId: string, callback: (data: string) => void): void;
  onStderr(benchmarkId: string, callback: (data: string) => void): void;
}
```

## Verification

**Commands:**
- `npm run build --prefix apps/api` -- expected: compiles without errors
- `curl -N http://localhost:3001/api/benchmarks` -- expected: returns benchmark list
- Manual: Start benchmark via API, connect SSE client, observe real-time events

**Manual checks (if no CLI):**
- Start a benchmark and verify SSE endpoint receives progress events
- Cancel a benchmark and verify CLI process is killed

## Suggested Review Order

**SSE Infrastructure**

- New module for managing SSE client connections and broadcasting events
  [`sse-emitter.ts:1`](../../apps/api/src/lib/sse-emitter.ts#L1)

- SSE endpoint that registers clients and handles cleanup on disconnect
  [`index.ts:29`](../../apps/api/src/index.ts#L29)

**SSE Event Emission in Benchmark Routes**

- SSE events wired into benchmark lifecycle: start, provider transitions, progress, complete/cancel
  [`benchmarks.ts:63`](../../apps/api/src/routes/benchmarks.ts#L63)

- Cancel handler kills CLI process and emits cancellation event
  [`benchmarks.ts:161`](../../apps/api/src/routes/benchmarks.ts#L161)

**CLI Process Management Utility**

- New module for spawning child processes with stdout/stderr capture
  [`cli-spawner.ts:1`](../../apps/api/src/lib/cli-spawner.ts#L1)
