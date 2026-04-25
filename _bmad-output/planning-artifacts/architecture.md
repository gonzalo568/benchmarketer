---
stepsCompleted: ["step-01-init", "step-02-context"]
inputDocuments: ["/home/frit/Dev2/benchmarketer/_bmad-output/planning-artifacts/prd.md"]
workflowType: 'architecture'
project_name: 'benchmarketer'
user_name: 'Gonzalo'
date: '2026-04-25'
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
└──────────────────────────────┬────────────────────────┘
                               │ HTTP REST + SSE
                               ▼
┌─────────────────────────────────────────────────────────┐
│                      API SERVER (Express)               │
│                       localhost:3001                   │
│  - REST API endpoints                                 │
│  - CLI process management (spawn/kill)                 │
│  - SQLite database (Drizzle ORM)                       │
│  - SSE streaming                                     │
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

| Component | Choice |
|-----------|--------|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Express.js + TypeScript |
| Database | SQLite + Drizzle ORM |
| CLI | Commander.js + TypeScript |
| Real-time | Server-Sent Events (SSE) |
| Container | Docker + docker-compose |
| Language | TypeScript (full-stack) |
| State (Client) | React Query + Zustand |
| Styling | Tailwind CSS |

### LLM Provider Integration Points

| Provider | Method |
|----------|--------|
| llama.cpp | Child process spawning |
| Ollama | REST API (localhost:11434) |
| LMStudio | REST API (localhost:1234) |
| Claude | Anthropic API |
| Minimax | REST API |

### Scale & Complexity Assessment

| Indicator | Assessment |
|----------|-----------|
| Project complexity | Medium |
| Primary domain | Full-stack: React + Express + CLI |
| Real-time features | Yes (SSE for progress streaming) |
| Integration complexity | High (5 different LLM providers) |
| Data complexity | Medium (SQLite + JSON exports) |

### Cross-Cutting Concerns

1. **Provider abstraction layer** — all LLMs called uniformly
2. **JSON schema versioning** — forward compatibility for exports
3. **Environment variable security** — API keys never stored
4. **Hardware context capture** — cross-platform system info
5. **Error handling** — graceful degradation, continue if one fails
6. **Real-time streaming** — SSE for CLI output to dashboard

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

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Database ORM
- API pattern
- State management approach

**Important Decisions (Shape Architecture):**
- SSE implementation
- Frontend component architecture

**Deferred Decisions (Post-MVP):**
- Authentication (if needed for multi-user)
- Cloud backup

### Data Architecture

| Decision | Choice | Rationale |
|---------|--------|-----------|
| ORM | **Drizzle** | Lightweight, SQL-like, fast, TypeScript-native |
| Database | SQLite | Local, portable, no external dependencies |
| Migrations | Drizzle Kit | Built-in migration tooling |

### API & Communication

| Decision | Choice | Rationale |
|---------|--------|-----------|
| Pattern | **REST resources** | /providers, /benchmarks, /tasks — intuitive, industry standard |
| Documentation | OpenAPI/Swagger | Standard, auto-generated |
| Error Format | RFC 7807 Problem Details | Structured errors |
| SSE Endpoint | /api/benchmarks/:id/stream | Real-time progress |

### Frontend Architecture

| Decision | Choice | Rationale |
|---------|--------|-----------|
| State (Server) | **React Query** | Caching, mutations, loading states |
| State (Client) | **Zustand** | Simple, lightweight UI state |
| Routing | **React Router v6** | Standard, well-documented |
| Charts | **Recharts** | React-native, composable |
| Forms | **React Hook Form + Zod** | Type-safe validation |

### CLI Architecture

| Decision | Choice | Rationale |
|---------|--------|-----------|
| Framework | **Commander.js** | Most popular Node CLI framework |
| Output | JSON + human-readable | Machine parseable + human friendly |
| Config | YAML | Easy to read and edit |

## Implementation Sequence

### Phase 1: Foundation
1. Project scaffolding (React + Express + Docker)
2. Database schema with Drizzle
3. Basic API endpoints
4. Provider abstraction interface

### Phase 2: Core Features
5. LLM provider integrations (one by one)
6. Benchmark execution engine
7. Metrics collection
8. CLI tool

### Phase 3: Dashboard
9. React frontend setup
10. Dashboard UI components
11. Real-time SSE integration
12. Results visualization

### Phase 4: Polish
13. Export/Import functionality
14. Documentation
15. Docker optimization