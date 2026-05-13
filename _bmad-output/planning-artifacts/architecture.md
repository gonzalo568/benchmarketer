---
stepsCompleted: ["step-01-init", "step-02-context"]
inputDocuments: ["/home/frit/Dev2/benchmarketer/_bmad-output/planning-artifacts/prd.md"]
workflowType: 'architecture'
project_name: 'benchmarketer'
user_name: 'Gonzalo'
date: '2026-04-25'
updated: '2026-05-13'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:** 46 total (Hybrid Architecture)

| Category | Count | FRs |
|----------|-------|------|
| Dashboard Interface | 8 | FR1-FR8 |
| API Server | 6 | FR9-FR14 |
| CLI Engine | 8 | FR15-FR22 |
| LLM Provider Management | 5 | FR23-FR27 |
| Benchmark Execution | 5 | FR28-FR32 |
| Metrics Collection | 5 | FR33-FR37 |
| Results & Reporting | 6 | FR38-FR43 |
| Configuration | 3 | FR44-FR46 |

**Non-Functional Requirements:** 9 total

| Category | Count |
|---------|-------|
| Performance | 4 |
| Security | 4 |
| Integration | 3 |
| Technical | 2 |

### Hybrid Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    DASHBOARD (React)                   │
│              localhost:3000 (or Docker)                 │
│  - Configuration UI for LLM providers                  │
│  - Results visualization (charts, rankings)            │
│  - Benchmark execution control                          │
│  - Real-time progress via SSE                          │
│  - Task management (edit/delete)                       │
│  - Quality rating (1-5 stars)                          │
└──────────────────────────────┬────────────────────────┘
                               │ HTTP REST + SSE
                               ▼
┌─────────────────────────────────────────────────────────┐
│                      API SERVER (Express)               │
│                       localhost:3001                   │
│  - REST API endpoints                                 │
│  - CLI process management (spawn/kill)                 │
│  - JSON file persistence (providers, benchmarks, tasks) │
│  - SSE streaming                                     │
│  - Hardware context detection (GPU/CPU/RAM/OS)        │
│  - Code quality benchmark execution                   │
│  - Quality scoring algorithm                          │
└──────────────────────────────┬────────────────────────┘
                               │ child_process / HTTP
                               ▼
┌─────────────────────────────────────────────────────────┐
│                        CLI ENGINE                      │
│  - LLM Provider abstraction layer                     │
│  - Benchmark execution (llama.cpp, Ollama, LMStudio)    │
│  - Metrics collection (time, tokens, quality)           │
│  - JSON output                                       │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Choice | Status |
|-----------|--------|--------|
| Frontend | React 18 + Vite + TypeScript | ✅ Implemented |
| Backend | Express.js + TypeScript | ✅ Implemented |
| Database | JSON file persistence | ✅ Implemented (Drizzle ORM was planned but not used) |
| CLI | Commander.js + TypeScript | ⚠️ Stub only |
| Real-time | Server-Sent Events (SSE) | ✅ Implemented |
| Container | Docker + docker-compose | ✅ Implemented |
| Language | TypeScript (full-stack) | ✅ Implemented |
| State (Client) | React Query + Zustand | ✅ Implemented (React Query only) |
| Styling | Tailwind CSS | ✅ Implemented |
| Charts | Recharts | ✅ Implemented |
| Icons | Lucide React | ✅ Implemented |

### LLM Provider Integration Points

| Provider | Method | Status |
|----------|--------|--------|
| llama.cpp | Child process spawning + server management | ✅ Full provider class |
| Ollama | REST API (localhost:11434) | ⚠️ Handled in API routes |
| LMStudio | REST API (localhost:1234) | ⚠️ Handled in API routes |
| Claude | Anthropic API | ⚠️ Types defined, handled in API routes |
| Minimax | REST API | ⚠️ Handled in API routes |
| OpenAI | OpenAI-compatible API | ⚠️ UI support, not fully implemented |

### Scale & Complexity Assessment

| Indicator | Assessment |
|----------|-----------|
| Project complexity | Medium |
| Primary domain | Full-stack: React + Express + CLI |
| Real-time features | Yes (SSE for progress streaming) |
| Integration complexity | High (5 different LLM providers) |
| Data complexity | Medium (JSON file persistence + exports) |

### Cross-Cutting Concerns

1. **Provider abstraction layer** — all LLMs called uniformly
2. **JSON schema versioning** — forward compatibility for exports
3. **Environment variable security** — API keys never stored
4. **Hardware context capture** — cross-platform system info
5. **Error handling** — graceful degradation, continue if one fails
6. **Real-time streaming** — SSE for CLI output to dashboard
7. **Code quality benchmark** — AST extraction, F1 scoring, progress tracking

### Technical Constraints

- **No cloud sync** — all data local
- **Docker multi-platform** — Linux, Windows, Mac
- **Configurable timeouts** — per provider
- **Reproducibility** — full hardware context on every benchmark
- **CLI + Dashboard** — both interfaces for flexibility

### Key Architectural Challenges

1. **Unified provider interface** — abstract different LLM APIs into common interface
2. **Process management** — spawn/kill CLI processes from API
3. **Streaming** — SSE for real-time progress to dashboard
4. **Metrics collection** — time, tokens, quality uniformly across providers
5. **Export/import schema** — versioned, self-contained JSON format
6. **Code quality benchmark** — AST extraction, F1 scoring, positional recall

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Database ORM → **Changed to JSON file persistence** (Drizzle ORM was planned but not implemented)
- API pattern → **REST resources** ✅
- State management approach → **React Query** ✅

**Important Decisions (Shape Architecture):**
- SSE implementation → **Custom SSE emitter** ✅
- Frontend component architecture → **React + Tailwind + Recharts** ✅

**Deferred Decisions (Post-MVP):**
- Authentication (if needed for multi-user)
- Cloud backup
- CLI full implementation
- Import results functionality
- Light mode toggle
- Metrics customization
- Result filtering

### Data Architecture

| Decision | Choice | Rationale | Status |
|---------|--------|-----------|--------|
| Persistence | **JSON files** | Simple, no external dependencies, easy to backup | ✅ Implemented |
| Database | SQLite (planned) | Local, portable, no external dependencies | ❌ Not implemented |
| Migrations | Drizzle Kit (planned) | Built-in migration tooling | ❌ Not implemented |

### API & Communication

| Decision | Choice | Rationale | Status |
|---------|--------|-----------|--------|
| Pattern | **REST resources** | /providers, /benchmarks, /tasks — intuitive, industry standard | ✅ Implemented |
| Documentation | OpenAPI/Swagger | Standard, auto-generated | ❌ Not implemented |
| Error Format | RFC 7807 Problem Details | Structured errors | ❌ Not implemented |
| SSE Endpoint | /api/benchmarks/:id/stream | Real-time progress | ✅ Implemented |

### Frontend Architecture

| Decision | Choice | Rationale | Status |
|---------|--------|-----------|--------|
| State (Server) | **React Query** | Caching, mutations, loading states | ✅ Implemented |
| State (Client) | **Zustand** | Simple, lightweight UI state | ⚠️ Not explicitly used |
| Routing | **React Router v6** | Standard, well-documented | ✅ Implemented |
| Charts | **Recharts** | React-native, composable | ✅ Implemented |
| Forms | **React Hook Form + Zod** | Type-safe validation | ❌ Not implemented (manual forms) |
| Icons | **Lucide React** | Consistent icon set | ✅ Implemented |

### CLI Architecture

| Decision | Choice | Rationale | Status |
|---------|--------|-----------|--------|
| Framework | **Commander.js** | Most popular Node CLI framework | ⚠️ Stub only |
| Output | JSON + human-readable | Machine parseable + human friendly | ❌ Not implemented |
| Config | YAML | Easy to read and edit | ❌ Not implemented |

## Implementation Sequence

### Phase 1: Foundation ✅
1. Project scaffolding (React + Express + Docker) ✅
2. JSON file persistence ✅
3. Basic API endpoints ✅
4. Provider abstraction interface ✅

### Phase 2: Core Features ✅
5. LLM provider integrations (llama.cpp full, others in API routes) ✅
6. Benchmark execution engine ✅
7. Metrics collection ✅
8. CLI tool ⚠️ (stub only)

### Phase 3: Dashboard ✅
9. React frontend setup ✅
10. Dashboard UI components ✅
11. Real-time SSE integration ✅
12. Results visualization ✅

### Phase 4: Polish ⚠️
13. Export/Import functionality ⚠️ (export only)
14. Documentation ⚠️ (README only)
15. Docker optimization ✅

### Phase 5: Code Quality Benchmark ✅
16. AST extraction (Python ast, JavaScript acorn) ✅
17. Stratified sampling ✅
18. F1-score evaluation ✅
19. Progress tracking via SSE ✅

## Current State Summary

**What's Working:**
- Full dashboard with provider management, benchmark execution, and results visualization
- API server with REST endpoints, SSE streaming, and JSON persistence
- llama.cpp provider with server management and auto-restart
- Ollama, LMStudio, Claude, Minimax integration via API routes
- Hardware context detection (GPU via rocm-smi/wmic/system_profiler)
- Code quality benchmark with F1 scoring and progress tracking
- Quality scoring algorithm with boilerplate/concise/density bonuses
- Quality rating (1-5 stars) per result
- Task management (edit/delete)
- Export results as JSON

**What's Not Implemented:**
- CLI tool (stub only)
- Import results functionality
- Light mode toggle
- Result filtering
- Metrics customization
- SQLite/Drizzle ORM (using JSON files instead)
- OpenAPI/Swagger documentation
- React Hook Form + Zod validation
- Zustand for client state
