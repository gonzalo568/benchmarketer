---
stepsCompleted: ["step-01-init", "step-02-discovery", "step-02b-vision", "step-02c-executive-summary", "step-03-success", "step-04-journeys", "step-05-domain", "step-06-innovation", "step-07-project-type", "step-08-scoping", "step-09-functional", "step-10-nonfunctional", "step-11-polish"]
inputDocuments: ["/home/frit/Dev2/benchmarketer/_bmad-output/brainstorming/brainstorming-session-2026-04-25-165740.md"]
workflowType: 'prd'
classification:
  projectType: developer_tool
  domain: scientific
  complexity: medium
  projectContext: greenfield
releaseMode: single-release
architecture: hybrid
vision:
  coreInsight: "Empowering individual developers to make informed decisions about which LLM is best for their specific hardware and tasks"
  differentiator: "Not generic LLM comparison - specifically about self-service for developers on their own machines"
  successMoment: "Users open benchmarketer when a new local LLM drops to compare it against commercial options and decide: switch or stay?"
  whyNow:
    - "Commercial LLMs: increasingly expensive and less reliable"
    - "Local LLMs: accelerating development and more accessible"
    - "Growing market need for self-service AI infrastructure"
---

# Product Requirements Document - benchmarketer

**Author:** Gonzalo
**Date:** 2026-04-25 (Updated: Hybrid Architecture)

## Executive Summary

**Benchmarketer** is an open-source **hybrid tool** (CLI + Web Dashboard) that enables individual developers to objectively compare local and commercial LLMs on their own hardware, helping them make informed decisions about which model best fits their specific development tasks and computing resources.

**Target Users:** Individual developers and small teams who run LLMs locally or use commercial LLMs and need data-driven guidance on model selection.

**Core Problem:** The LLM landscape is fragmented and rapidly evolving. Developers cannot easily determine which model offers the best balance of speed, cost, quality, and compatibility with their hardware. Commercial LLMs are becoming increasingly expensive and less reliable, while local LLMs are proliferating with accelerating development.

**Solution:** Benchmarketer provides standardized, reproducible benchmarks that measure what matters to developers—execution time, token consumption, code quality, and test pass rates—regardless of whether the LLM runs locally (llama.cpp, Ollama, LMStudio) or via commercial API.

**Architecture:** Hybrid CLI + Web Dashboard. The CLI executes benchmarks on the user's machine with real hardware. The Dashboard provides a web interface for configuration, visualization, and execution control.

### What Makes This Special

| Differentiator | Description |
|----------------|-------------|
| **Individual empowerment** | Not a corporate tool—a developer runs benchmarks on their own machine with their actual hardware |
| **Hybrid interaction** | Both CLI and Dashboard interfaces for flexibility |
| **Incremental history** | Benchmarks accumulate over time; compare a new local LLM today against one you tested last month |
| **Hardware transparency** | Full hardware context is captured and exported, enabling meaningful cross-user comparisons |
| **Transparent metrics** | No composite scores—each dimension (speed, tokens, quality) is reported independently with clear rankings |

**Core Insight:** The best LLM is not universal—it depends on your hardware, your tasks, and your priorities. Benchmarketer makes this empirically determinable for each developer.

**Success Definition:** Developers open benchmarketer when a new local LLM is released to answer: *"Should I switch from Claude/Minimax, or stay with my current choice?"*

## Project Classification

| Attribute | Value |
|-----------|-------|
| **Project Type** | developer_tool (Hybrid: CLI + Webapp) |
| **Domain** | scientific (AI/ML Benchmarking) |
| **Complexity** | medium |
| **Project Context** | greenfield |

## Architecture Overview

### Hybrid Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DASHBOARD (Webapp)                   │
│              localhost:3000 (or Docker)                 │
│  ┌─────────────────────────────────────────────────┐ │
│  │  - Configuration UI for LLM providers            │ │
│  │  - Results visualization (charts, rankings)       │ │
│  │  - Benchmark execution control                   │ │
│  │  - Export/Import management                   │ │
│  │  - CLI output display (real-time logs)         │ │
│  └─────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTP API
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      API SERVER                        │
│                   localhost:3001                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  - Express REST API                            │ │
│  │  - CLI process management (spawn/kill)          │ │
│  │  - Results storage (SQLite)                   │ │
│  │  - Provider health checks                      │ │
│  └─────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────┘
                            │ child_process / HTTP
                            ▼
┌─────────────────────────────────────────────────────────┐
│                        CLI ENGINE                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  - LLM Provider abstraction layer             │ │
│  │  - Benchmark execution (llama.cpp, Ollama...)  │ │
│  │  - Metrics collection (time, tokens, quality)  │ │
│  │  - JSON output                               │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Language** | TypeScript | Type safety for metrics and benchmark data |
| **Runtime** | Node.js | Native HTTP client, child processes, cross-platform |
| **Frontend** | React + Vite | Modern SPA, fast development, good DX |
| **Backend** | Express.js | Simple, well-documented REST API |
| **Database** | SQLite | Local, portable, no external dependencies |
| **CLI Framework** | Commander.js | CLI interface for power users |
| **Distribution** | Docker + npm | Flexible installation options |
| **Real-time** | Server-Sent Events (SSE) | CLI output to dashboard |

## User Journeys

### Journey 1: El Analista — Developer Evaluando un Nuevo LLM

**Persona:** Marcos, 32 años, full-stack developer. Usa Cursor AI y está frustrado con el costo de Claude.

> *"Cada vez que sale un nuevo LLM me pregunto: ¿debería cambiar?"*

**Journey:**

| Step | Action | Interface | Emotional State |
|------|--------|----------|-----------------|
| 1. Discovery | Ve announcement de nuevo LLM local | Dashboard | Excitement + Skepticism |
| 2. Setup | Abre benchmarketer, configura el nuevo LLM | Dashboard | Curiosity |
| 3. Task Selection | Selecciona tarea predefinida: "Landing Page L2" | Dashboard | Focus |
| 4. Execution | Ejecuta benchmark — ve progreso en tiempo real | Dashboard | Anticipation |
| 5. Comparison | Dashboard muestra resultados: nuevo LLM vs Claude vs Llama anterior | Dashboard | Revelation |
| 6. Decision | Analiza rankings por categoría | Dashboard | Empowerment |
| 7. Sharing | Exporta resultados y comparte en Twitter/HN | Dashboard | Pride |

### Journey 2: La Consultora — Agentic AI User Compartiendo Decisiones

**Persona:** Lucía, 45 años, consultora de startups tech. No programa pero usa agentic AI daily.

> *"Mis clientes me preguntan: ¿qué LLM me conviene? Necesito datos, no opiniones."*

**Journey:**

| Step | Action | Interface | Emotional State |
|------|--------|----------|-----------------|
| 1. Client Request | Un cliente pregunta qué LLM usar para su startup | Dashboard | Responsibility |
| 2. Quick Import | Abre benchmarketer, importa un benchmark que alguien más hizo | Dashboard | Relief |
| 3. Filtering | Filtra por hardware similar al cliente (AMD RX 9070, 64GB RAM) | Dashboard | Focus |
| 4. Visualization | Ve dashboard con gráficas comparativas | Dashboard | Clarity |
| 5. Recommendation | Genera reporte con 1-click | Dashboard | Confidence |
| 6. Handoff | Envía reporte al cliente con datos transpararentes | Dashboard | Trust |

### Journey 3: El Ops — Configurando un Nuevo LLM Local

**Persona:** Dani, 28 años, devops. Mantiene el setup de LLMs del equipo.

> *"Tenemos 3 devs, cada uno quiere probar modelos diferentes. Necesito que el benchmark sea justo."*

**Journey:**

| Step | Action | Interface | Emotional State |
|------|--------|----------|-----------------|
| 1. New Model | Un dev pide agregar un nuevo LLM al benchmark pool | Dashboard | Challenge |
| 2. LLM Setup | Benchmarketer detecta nuevo endpoint (LMStudio). Valida conexión. | Dashboard | Efficiency |
| 3. Verification | Sistema verifica que el modelo cargó correctamente — muestra VRAM usada, context window | Dashboard | Satisfaction |
| 4. Registration | Guarda configuración en el catálogo de LLMs | Dashboard | Control |
| 5. Ready | Informa al dev: "Listo para benchmarkear" | Dashboard | Pride |

### Journey 4: El Power User — CLI Interface

**Persona:** Carlos, 35 años, senior developer. Prefiere CLI para automatización.

> *"Quiero integrar benchmark en mi CI/CD pipeline."*

**Journey:**

| Step | Action | Interface | Emotional State |
|------|--------|----------|-----------------|
| 1. Config | Edita config.yaml con providers | CLI | Focus |
| 2. Execute | Ejecuta: `benchmarketer run --task landing-page-l2` | CLI | Efficiency |
| 3. Output | Ve resultados en formato JSON/tabla | CLI | Clarity |
| 4. CI/CD | Integra en GitHub Actions | CLI | Power |

## Functional Requirements

### Dashboard Interface (Webapp)

- FR1: Users can access the dashboard via web browser (localhost or Docker)
- FR2: Users can view the dashboard in dark/light mode
- FR3: Users can see real-time benchmark execution progress via SSE
- FR4: Users can view benchmark results with charts, tables, and rankings
- FR5: Users can filter results by hardware context, date, or provider
- FR6: Users can export results as JSON or generate shareable reports
- FR7: Users can import external benchmark results for comparison
- FR8: Users can configure benchmark settings (timeouts, default task)

### API Server

- FR9: API server exposes REST endpoints for all operations
- FR10: API server spawns CLI processes for benchmark execution
- FR11: API server streams CLI output to dashboard via SSE
- FR12: API server stores results in local SQLite database
- FR13: API server validates provider connections before benchmark
- FR14: API server enforces security: API keys in environment variables only

### CLI Engine

- FR15: CLI can be run standalone without dashboard
- FR16: CLI supports adding/removing LLM providers
- FR17: CLI executes benchmarks and outputs JSON results
- FR18: CLI captures hardware context automatically (CPU, RAM, GPU, OS)
- FR19: CLI supports all LLM providers: llama.cpp, Ollama, LMStudio, Claude, Minimax
- FR20: CLI supports benchmark task catalog (L1-L4 complexity levels)
- FR21: CLI supports real-time progress output
- FR22: CLI can be controlled via HTTP API by the dashboard

### LLM Provider Management

- FR23: Users can add a new LLM provider via dashboard or CLI
- FR24: Users can verify that an LLM provider connection is working
- FR25: Users can view a list of all configured LLM providers
- FR26: Users can remove a configured LLM provider
- FR27: Users can configure per-provider settings (timeout, endpoint, API key)

### Benchmark Execution

- FR28: Users can select one or more LLM providers for a benchmark
- FR29: Users can select a benchmark task from the catalog (L1-L4)
- FR30: Users can execute a benchmark and view real-time progress
- FR31: Users can stop a benchmark execution at any time
- FR32: Benchmark continues if one provider fails (graceful degradation)

### Metrics Collection

- FR33: System automatically captures execution time per LLM
- FR34: System automatically captures token consumption (input + output)
- FR35: System automatically captures quality metrics (tests passed, lint results)
- FR36: System automatically captures hardware context (CPU, RAM, GPU, OS)
- FR37: System automatically captures LLM provider details (version, settings)

### Results & Reporting

- FR38: Users can view benchmark results in visual dashboard with rankings
- FR39: Users can compare results across different LLMs side-by-side
- FR40: Users can filter results by hardware context or date
- FR41: Users can export benchmark as JSON with full execution context
- FR42: Users can import benchmark JSON to view in dashboard
- FR43: Users can generate one-click summary report

### Configuration

- FR44: Users can configure default benchmark settings (timeout, temperature, max tokens)
- FR45: Users can customize which metrics are collected
- FR46: Users can configure task catalog (add/edit/remove tasks)

## Non-Functional Requirements

### Performance

- **Benchmark execution**: Single task benchmark completes within configurable timeout (default 5 minutes per task)
- **Dashboard load time**: Dashboard loads within 3 seconds
- **Real-time updates**: Progress updates streamed within 1 second
- **API response time**: API endpoints respond within 500ms

### Security

- **API keys**: Stored in environment variables, never in database or logs
- **Local execution**: All benchmark data remains on user's machine (no cloud sync)
- **JSON exports**: Exported files contain no credentials
- **Input validation**: All API inputs sanitized

### Integration

- **Provider timeout**: Configurable per LLM provider (default 120 seconds)
- **Error handling**: Failed provider connections display clear error messages
- **Graceful degradation**: If one LLM provider fails, benchmark continues with remaining

### Technical

- **Database**: SQLite stored locally in user's data directory
- **Docker**: Full application containerized with docker-compose
- **CLI**: CLI works standalone without dashboard
- **Cross-platform**: Works on Linux, Windows, Mac

## Technology Stack Summary

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Frontend** | React 18 + Vite | SPA, fast development |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Backend** | Express.js | REST API |
| **Database** | SQLite | Local storage |
| **Language** | TypeScript | Full-stack |
| **CLI** | Commander.js | Power user interface |
| **Container** | Docker + docker-compose | Full stack deployment |
| **Real-time** | Server-Sent Events | CLI output streaming |
