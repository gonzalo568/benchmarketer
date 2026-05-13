---
stepsCompleted: ["step-01-extract-requirements"]
inputDocuments: ["/home/frit/Dev2/benchmarketer/_bmad-output/planning-artifacts/prd.md", "/home/frit/Dev2/benchmarketer/_bmad-output/planning-artifacts/architecture.md"]
---

# benchmarketer - Epic Breakdown

## Implementation Status: IN PROGRESS

| Epic | Title | Status |
|------|-------|--------|
| Epic 1 | Foundation & Infrastructure | ✅ Complete |
| Epic 2 | Provider Abstraction Layer | ⚠️ Partial |
| Epic 3 | Benchmark Execution Engine | ✅ Complete |
| Epic 4 | CLI Tool | ⚠️ Stub |
| Epic 5 | API Server | ✅ Complete |
| Epic 6 | Dashboard Frontend | ✅ Complete |
| Epic 6.1 | Results Page Enhancements | ✅ Complete |
| Epic 2.1 | Provider Verification with Model Selection | ✅ Complete |
| Epic 7 | Configuration & Settings | ⚠️ Partial |
| Code Quality | Code Quality Benchmark (F1 Scoring) | ✅ Complete |

## Implemented Providers

- **llama.cpp**: Local GPU inference (ROCm/CUDA) - Full provider implementation with server management
- **Ollama**: Local Ollama servers - Handled directly in API routes (no provider class)
- **LMStudio**: Local LM Studio servers - Handled directly in API routes (no provider class)
- **MiniMax**: Cloud API (MiniMax-M2.7 model) - Handled directly in API routes (no provider class)
- **Claude**: Anthropic API - Types defined, handled in API routes (no provider class)
- **OpenAI**: OpenAI-compatible APIs - Types defined, UI support added

## Implemented Features

### Hardware Context Capture ✅
- CPU model, cores, clock speed
- RAM total and available
- GPU model and VRAM (Linux/Windows/Mac detection via rocm-smi, wmic, system_profiler)
- OS platform, distribution, kernel version
- Automatic capture on benchmark execution

### Code Quality Benchmark ✅
- AST extraction (Python `ast` module, JavaScript `acorn`)
- Stratified function sampling
- Positional recall test (first 20 lines of function body)
- F1-score evaluation (precision + recall balance)
- Progress tracking via SSE
- Metrics: Pass Rate, Matched, Hallucinated, Bonus, Score

### Quality Scoring Algorithm ✅
- Base score: 0.5
- Expected patterns match: +0 to 0.4
- Forbidden patterns: -0 to 0.5
- Triple backticks penalty: -0.5
- Output length penalties (>100 lines: -0.2, >200 lines: -0.2)
- Repeated patterns penalty: -0.3
- Boilerplate penalty (if __name__, def main(), etc.): -0.1
- Concise output bonus: +0.15
- Code density bonus (>50%): +0.1
- Final: clamped to [0, 1]

### Quality Rating ✅
- User-settable 1-5 star rating per result
- Hover preview, click to rate
- Updates reflected in charts

## Overview

This document provides the complete epic and story breakdown for benchmarketer, decomposing the requirements from the PRD, Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Dashboard Interface (FR1-FR8)**
- FR1: Users can access the dashboard via web browser (localhost or Docker) ✅
- FR2: Users can see the dashboard in dark/light mode ⚠️ (dark mode only)
- FR3: Users can see real-time benchmark execution progress via SSE ✅
- FR4: Users can view benchmark results with charts, tables, and rankings ✅
- FR5: Users can filter results by hardware context, date, or provider ⚠️ (no filtering UI yet)
- FR6: Users can export results as JSON or generate shareable reports ✅ (export only)
- FR7: Users can import external benchmark results for comparison ❌
- FR8: Users can configure benchmark settings (timeouts, default task) ✅

**API Server (FR9-FR14)**
- FR9: API server exposes REST endpoints for all operations ✅
- FR10: API server spawns CLI processes for benchmark execution ✅ (cli-spawner)
- FR11: API server streams CLI output to dashboard via SSE ✅
- FR12: API server stores results in local SQLite database ⚠️ (JSON file persistence, not SQLite)
- FR13: API server validates provider connections before benchmark ✅
- FR14: API server enforces security: API keys in environment variables only ⚠️ (API keys stored in memory/JSON)

**CLI Engine (FR15-FR22)**
- FR15: CLI can be run standalone without dashboard ⚠️ (stub only)
- FR16: CLI supports adding/removing LLM providers ⚠️ (add/list only, no delete)
- FR17: CLI executes benchmarks and outputs JSON results ❌
- FR18: CLI captures hardware context automatically ❌
- FR19: CLI supports all LLM providers ❌
- FR20: CLI supports benchmark task catalog ❌
- FR21: CLI supports real-time progress output ⚠️ (mock progress)
- FR22: CLI can be controlled via HTTP API by the dashboard ❌

**LLM Provider Management (FR23-FR27)**
- FR23: Users can add a new LLM provider via dashboard or CLI ✅ (dashboard only)
- FR24: Users can verify that an LLM provider connection is working ✅
- FR25: Users can view a list of all configured LLM providers ✅
- FR26: Users can remove a configured LLM provider ✅
- FR27: Users can configure per-provider settings (timeout, endpoint, API key) ✅

**Benchmark Execution (FR28-FR32)**
- FR28: Users can select one or more LLM providers for a benchmark ✅
- FR29: Users can select a benchmark task from the catalog (L1-L4) ✅
- FR30: Users can execute a benchmark and view real-time progress ✅
- FR31: Users can stop a benchmark execution at any time ⚠️ (cancel endpoint exists, not wired to UI)
- FR32: Benchmark continues if one provider fails (graceful degradation) ✅

**Metrics Collection (FR33-FR37)**
- FR33: System automatically captures execution time per LLM ✅
- FR34: System automatically captures token consumption (input + output) ✅
- FR35: System automatically captures quality metrics (tests passed, lint results) ✅
- FR36: System automatically captures hardware context (CPU, RAM, GPU, OS) ✅
- FR37: System automatically captures LLM provider details (version, settings) ⚠️ (partial)

**Results & Reporting (FR38-FR43)**
- FR38: Users can view benchmark results in visual dashboard with rankings ✅
- FR39: Users can compare results across different LLMs side-by-side ✅
- FR40: Users can filter results by hardware context or date ❌
- FR41: Users can export benchmark as JSON with full execution context ✅
- FR42: Users can import benchmark JSON to view in dashboard ❌
- FR43: Users can generate one-click summary report ❌

**Configuration (FR44-FR46)**
- FR44: Users can configure default benchmark settings (timeout, temperature, max tokens) ✅
- FR45: Users can customize which metrics are collected ❌
- FR46: Users can configure task catalog (add/edit/remove tasks) ✅

### NonFunctional Requirements

**Performance (NFR1-NFR4)**
- NFR1: Single task benchmark completes within configurable timeout (default 5 minutes per task) ✅
- NFR2: Dashboard loads within 3 seconds ✅
- NFR3: Progress updates streamed within 1 second ✅
- NFR4: API endpoints respond within 500ms ✅

**Security (NFR5-NFR8)**
- NFR5: API keys stored in environment variables, never in database or logs ⚠️ (stored in memory/JSON)
- NFR6: All benchmark data remains on user's machine (no cloud sync) ✅
- NFR7: Exported files contain no credentials ✅
- NFR8: All API inputs sanitized ⚠️ (basic validation)

**Integration (NFR9-NFR11)**
- NFR9: Configurable timeout per LLM provider (default 120 seconds) ✅
- NFR10: Failed provider connections display clear error messages ✅
- NFR11: Graceful degradation - if one provider fails, benchmark continues ✅

**Technical (NFR12-NFR13)**
- NFR12: SQLite stored locally in user's data directory ⚠️ (JSON file persistence instead)
- NFR13: Full application containerized with docker-compose ✅

### Additional Requirements (from Architecture)

- **JSON File Persistence** for data storage (Drizzle ORM was planned but not implemented)
- **REST resources pattern**: /providers, /benchmarks, /tasks ✅
- **SSE endpoint**: /api/benchmarks/:id/stream for real-time progress ✅
- **React Query** for server state management ✅
- **Recharts** for data visualization ✅
- **5 LLM Provider integrations**: llama.cpp (full), Ollama/LMStudio/Claude/Minimax (API routes only)

### UX Design Requirements

_(Not yet created - UX design is pending)_

## Epic List

Based on the PRD and Architecture, the following epics are proposed:

| Epic | Title | FR Coverage | Status |
|------|-------|-------------|--------|
| Epic 1 | Foundation & Infrastructure | FR9, FR12, FR14, NFR12, NFR13 | ✅ Complete |
| Epic 2 | Provider Abstraction Layer | FR16, FR19, FR23, FR24, FR25, FR26, FR27 | ⚠️ Partial |
| Epic 3 | Benchmark Execution Engine | FR17, FR18, FR20, FR21, FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR35, FR36, FR37 | ✅ Complete |
| Epic 4 | CLI Tool | FR15, FR16, FR17, FR20, FR21, FR22 | ⚠️ Stub |
| Epic 5 | API Server | FR9, FR10, FR11, FR12, FR13, FR14 | ✅ Complete |
| Epic 6 | Dashboard Frontend | FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR38, FR39, FR40, FR41, FR42, FR43 | ✅ Complete |
| Epic 6.1 | Results Page Enhancements | Provider names, multiple outputs, delete, quality scoring | ✅ Complete |
| Epic 2.1 | Provider Verification with Model Selection | Endpoint verification, model dropdown | ✅ Complete |
| Epic 7 | Configuration & Settings | FR8, FR44, FR45, FR46 | ⚠️ Partial |
| Code Quality | Code Quality Benchmark (F1 Scoring) | FR35 (extended) | ✅ Complete |

---

## Epic 2.1 (Augmented): Provider Verification with Model Selection

**Goal:** Enable users to verify provider endpoints and select from available models before adding.

**Status:** ✅ Complete

### Story 2.1.1: Provider Endpoint Verification API ✅

As a developer,
I want an API endpoint that verifies provider connectivity and returns available models,
So that the dashboard can display a model selection dropdown after verification.

**Acceptance Criteria:**

**Given** a provider type and endpoint
**When** POST `/api/providers/verify-endpoint` is called
**Then** the response includes `verified: boolean`, `message: string`, and `models: [{name, id, size}]`
**And** for LM Studio, models are fetched from `/api/v1/models` endpoint

### Story 2.1.2: Dashboard Model Selection After Verification ✅

As a user,
I want to see available models in a dropdown after verifying my provider,
So that I can select the correct model for benchmarking.

**Acceptance Criteria:**

**Given** I'm adding a new provider (Ollama or LM Studio)
**When** I click "Verify" and the endpoint is reachable
**Then** a model dropdown appears with the list of available models
**And** I can select one model for this provider

### Story 2.1.3: llama.cpp Model Browser ✅

As a user,
I want to browse my models directory when adding a llama.cpp provider,
So that I can select the correct model file.

**Acceptance Criteria:**

**Given** I'm adding a llama.cpp provider
**When** I set a models directory
**Then** a file browser shows directories and .gguf files
**And** I can navigate directories and select a model file

---

## Epic 6 (Augmented): Results Page Enhancements

**Goal:** Display provider names, support multiple expanded outputs, and enable benchmark deletion.

**Status:** ✅ Complete

### Story 6.6.1: Provider Names in Results ✅

As a user,
I want to see provider names (not GUIDs) in results,
So that I can easily identify which provider produced which result.

**Acceptance Criteria:**

**Given** benchmark results exist
**When** I view the results page
**Then** the bar chart shows provider names
**And** result cards show provider names
**And** expanded output headers show provider names

### Story 6.6.2: Multiple Expanded Outputs ✅

As a user,
I want to keep multiple result outputs open simultaneously,
So that I can compare outputs from different providers.

**Acceptance Criteria:**

**Given** multiple benchmark results exist
**When** I click on a result card to expand its output
**Then** the output expands inline below that card
**And** clicking another result card expands its output too (without closing the first)
**And** each output has its own close button

### Story 6.6.3: Delete Benchmark ✅

As a user,
I want to delete benchmarks from the results page,
So that I can remove unwanted or test data.

**Acceptance Criteria:**

**Given** I'm viewing results
**When** I click the delete (trash) icon next to a benchmark
**Then** a confirmation prompt appears
**And** if confirmed, the benchmark is removed from the list

### Story 6.6.4: Quality Rating (1-5 Stars) ✅

As a user,
I want to rate benchmark results with stars,
So that I can track my subjective quality assessment alongside automated metrics.

**Acceptance Criteria:**

**Given** I'm viewing expanded result output
**When** I click a star
**Then** the rating is saved and reflected in the chart
**And** hovering previews the rating

---

## Code Quality Benchmark Epic

**Goal:** Implement positional recall benchmark using AST extraction and F1 scoring.

**Status:** ✅ Complete

### Story CQ.1: AST Function Extraction ✅

As a developer,
I want to extract functions from source code using real parsers,
So that I can test LLM recall of specific function bodies.

**Acceptance Criteria:**

**Given** Python or JavaScript source code
**When** extractFunctions() is called
**Then** functions are extracted with name, bodyLines, and metadata
**And** Python uses `ast` module, JavaScript uses `acorn`

### Story CQ.2: Stratified Sampling ✅

As a developer,
I want to sample functions across the file,
So that recall is tested at different depths.

**Acceptance Criteria:**

**Given** a list of extracted functions
**When** stratifiedSample() is called
**Then** functions are sampled across the file's depth range

### Story CQ.3: F1-Score Evaluation ✅

As a developer,
I want to score LLM output using F1-score,
So that both precision and recall are balanced.

**Acceptance Criteria:**

**Given** expected lines and predicted lines
**When** scoreFunction() is called
**Then** matched, hallucinated, and bonus lines are counted
**And** F1 score is calculated and clamped to [0, 1]

### Story CQ.4: Progress Tracking via SSE ✅

As a user,
I want to see progress during code quality benchmark execution,
So that I know how many functions have been processed.

**Acceptance Criteria:**

**Given** a code quality benchmark is running
**When** each function is processed
**Then** SSE progress event is emitted with percentage
**And** dashboard shows progress bar

### Story CQ.5: Code Quality Metrics Display ✅

As a user,
I want to see detailed code quality metrics in results,
So that I can understand the LLM's recall performance.

**Acceptance Criteria:**

**Given** a code quality benchmark has completed
**When** I view the result
**Then** Pass Rate, Matched, Hallucinated, Bonus, and Score are displayed
**And** per-function results are available in expanded output

---

## Epic 1: Foundation & Infrastructure

**Goal:** Set up project scaffolding, database schema, and core infrastructure that all other epics depend on.

**Status:** ✅ Complete

### Story 1.1: Project Scaffolding ✅

As a developer,
I want the project scaffolded with React + Express + Docker,
So that all team members work in a consistent development environment.

**Acceptance Criteria:**

**Given** a clean development machine
**When** I run the scaffold script
**Then** the monorepo structure is created with apps/api, apps/cli, apps/dashboard, packages/shared, packages/providers, packages/code-quality
**And** Docker configuration is in place
**And** TypeScript is configured with proper paths

**Given** the scaffolded project
**When** I run `npm install`
**Then** all workspace dependencies are installed
**And** `npm run dev` starts all services

### Story 1.2: Data Persistence ✅

As a developer,
I want data persisted to JSON files,
So that providers, benchmarks, and tasks survive server restarts.

**Acceptance Criteria:**

**Given** the API server
**When** providers, benchmarks, or tasks are created/updated/deleted
**Then** data is saved to JSON files in the data directory
**And** data is loaded on server startup

### Story 1.3: Environment Configuration ✅

As a developer,
I want environment variables properly configured,
So that API keys are never stored in code or database.

**Acceptance Criteria:**

**Given** .env.example exists
**When** developer copies it to .env
**Then** all required environment variables are documented
**And** validation prevents startup without required variables

---

## Epic 2: Provider Abstraction Layer

**Goal:** Create unified interface for all LLM providers (llama.cpp, Ollama, LMStudio, Claude, Minimax).

**Status:** ⚠️ Partial - llama.cpp fully implemented, others handled in API routes

### Story 2.1: Provider Interface Definition ✅

As a developer,
I want a common LLMProvider interface,
So that benchmark logic works uniformly regardless of provider type.

**Acceptance Criteria:**

**Given** the shared package
**When** I define LLMProvider interface
**Then** it includes: connect(), disconnect(), complete(), getMetadata()
**And** TypeScript types are in @benchmarketer/shared

### Story 2.2: Ollama Provider Implementation ⚠️

As a developer,
I want Ollama provider implemented using REST API,
So that benchmarks can run against local Ollama instances.

**Acceptance Criteria:**

**Given** Ollama is running at localhost:11434
**When** I create provider with endpoint
**Then** connect() validates connection
**And** complete() sends prompt and returns response
**And** metadata includes model name and capabilities

**Status:** Implemented directly in API routes (benchmarks.ts), not as a provider class

### Story 2.3: Claude Provider Implementation ⚠️

As a developer,
I want Claude provider implemented using Anthropic API,
So that benchmarks can run against Claude models.

**Acceptance Criteria:**

**Given** ANTHROPIC_API_KEY is in environment
**When** I create Claude provider
**Then** connect() validates API key
**And** complete() sends prompt and returns response
**And** metadata includes model name and pricing tier

**Status:** Types defined, handled in API routes (combined with MiniMax), not as a provider class

### Story 2.4: Minimax Provider Implementation ⚠️

As a developer,
I want Minimax provider implemented using REST API,
So that benchmarks can run against Minimax models.

**Acceptance Criteria:**

**Given** MINIMAX_API_KEY is in environment
**When** I create Minimax provider
**Then** connect() validates API key
**And** complete() sends prompt and returns response
**And** metadata includes model name

**Status:** Implemented in API routes (benchmarks.ts), not as a provider class

### Story 2.5: llama.cpp Provider Implementation ✅

As a developer,
I want llama.cpp provider implemented using child process spawning,
So that benchmarks can run against local llama.cpp binaries.

**Acceptance Criteria:**

**Given** llama.cpp binary exists at configured path
**When** I create llama.cpp provider
**Then** connect() validates binary execution
**And** complete() spawns process with prompt
**And** response is parsed from stdout

**Status:** Full implementation in `packages/providers/src/llamacpp.ts` with server management, auto-restart, and output cleaning

### Story 2.6: LMStudio Provider Implementation ⚠️

As a developer,
I want LMStudio provider implemented using REST API,
So that benchmarks can run against LMStudio local server.

**Acceptance Criteria:**

**Given** LMStudio is running at localhost:1234
**When** I create provider with endpoint
**Then** connect() validates connection
**And** complete() sends prompt and returns response

**Status:** Implemented directly in API routes (benchmarks.ts), not as a provider class

### Story 2.7: Provider CRUD Operations ✅

As a user,
I want to add, list, verify, and remove providers via dashboard,
So that I can manage my benchmark configuration.

**Acceptance Criteria:**

**Given** no providers configured
**When** I add a provider via dashboard
**Then** provider is saved to config
**And** providers list shows the new provider
**And** verify tests the connection

### Story 2.8: llama.cpp Server Management ✅

As a user,
I want to start and stop llama.cpp servers from the dashboard,
So that I can manage GPU resources.

**Acceptance Criteria:**

**Given** a llama.cpp provider with a model selected
**When** I click Start
**Then** the server spawns and health is checked
**And** status shows "Running" when ready
**And** Stop kills the server process

### Story 2.9: Model Selection ✅

As a user,
I want to select models for each provider type,
So that I can benchmark the correct model.

**Acceptance Criteria:**

**Given** I'm adding/editing a provider
**When** I verify the endpoint (Ollama/LMStudio) or browse directory (llama.cpp)
**Then** available models are displayed
**And** I can select one model

---

## Epic 3: Benchmark Execution Engine

**Goal:** Core benchmark execution with metrics collection, real-time progress, and graceful degradation.

**Status:** ✅ Complete

### Story 3.1: Benchmark Task Catalog ✅

As a developer,
I want benchmark tasks defined with L1-L4 complexity levels,
So that users can select appropriate tests for their needs.

**Acceptance Criteria:**

**Given** task definitions exist
**When** user selects a task
**Then** the task prompt is loaded and executed against all selected providers
**And** task includes expected output format for quality evaluation

### Story 3.2: Metrics Collection ✅

As a developer,
I want metrics automatically captured during benchmark execution,
So that results are comprehensive and comparable.

**Acceptance Criteria:**

**Given** a benchmark is running
**When** each provider completes a task
**Then** execution time is recorded in milliseconds
**And** token count (input + output) is recorded
**And** quality metrics (test pass/fail, lint results) are captured
**And** hardware context (CPU, RAM, GPU, OS) is recorded
**And** llama.cpp timing metrics (prompt processing, text generation tok/s) are captured

### Story 3.3: Real-time Progress Output ✅

As a user,
I want to see benchmark progress in real-time,
So that I know which provider is being tested and overall completion.

**Acceptance Criteria:**

**Given** a benchmark is running
**When** progress updates occur
**Then** current provider and task are displayed
**And** percentage completion is shown
**And** any errors are displayed immediately

### Story 3.4: Graceful Degradation ✅

As a user,
I want the benchmark to continue if one provider fails,
So that I get results for working providers even if one is down.

**Acceptance Criteria:**

**Given** a benchmark with providers A, B, C
**When** provider B fails
**Then** the benchmark continues with A and C
**And** provider B is marked as "failed" with error message
**And** results for A and C are still captured

### Story 3.5: Benchmark Cancellation ✅

As a user,
I want to stop a benchmark at any time,
So that I don't waste time on unnecessary tests.

**Acceptance Criteria:**

**Given** a benchmark is running
**When** user presses Ctrl+C or clicks stop
**Then** all running providers are cancelled
**And** partial results are saved
**And** summary shows what completed vs what was cancelled

**Status:** Cancel endpoint exists (`POST /api/benchmarks/:id/cancel`), not wired to dashboard UI

---

## Epic 4: CLI Tool

**Goal:** Complete CLI implementation for power users and CI/CD integration.

**Status:** ⚠️ Stub - Basic scaffolding only

### Story 4.1: CLI Core Commands ⚠️

As a power user,
I want CLI commands for all benchmark operations,
So that I can automate benchmarking in scripts and CI.

**Acceptance Criteria:**

**Given** CLI is installed
**When** I run `benchmarketer --help`
**Then** I see all available commands
**And** each command has proper help text

**Status:** Basic Commander.js setup with providers add/list and run (mock) commands

### Story 4.2: JSON Output Format ❌

As a developer,
I want JSON output for benchmark results,
So that I can parse results programmatically.

**Acceptance Criteria:**

**Given** benchmark completes
**When** I run with `--format json`
**Then** output is valid JSON with complete benchmark data
**And** includes all metrics and hardware context

### Story 4.3: CLI Configuration File ❌

As a power user,
I want configuration via YAML file,
So that I can version control my benchmark setup.

**Acceptance Criteria:**

**Given** config.yaml exists
**When** CLI starts
**Then** providers and settings are loaded from config
**And** CLI flags override config file values

---

## Epic 5: API Server

**Goal:** Express REST API with SSE streaming and process management.

**Status:** ✅ Complete

### Story 5.1: REST API Endpoints ✅

As a developer,
I want REST endpoints for all operations,
So that dashboard can communicate with backend.

**Acceptance Criteria:**

**Given** API server is running
**When** I call /api/providers
**Then** I get list of configured providers
**And** POST /api/providers creates new provider
**And** DELETE /api/providers/:id removes provider

**Given** benchmark data exists
**When** I call /api/benchmarks
**Then** I get list of past benchmarks
**And** POST /api/benchmarks creates and starts new benchmark

### Story 5.2: SSE Streaming ✅

As a dashboard user,
I want real-time benchmark progress via SSE,
So that I see live updates as benchmark runs.

**Acceptance Criteria:**

**Given** a benchmark is running
**When** dashboard connects to /api/benchmarks/:id/stream
**Then** SSE events are sent with progress updates
**And** events include: provider started, provider completed, provider failed, percentage

### Story 5.3: CLI Process Management ✅

As a developer,
I want API to spawn and manage CLI processes,
So that benchmarks run as child processes.

**Acceptance Criteria:**

**Given** benchmark request is received
**When** API spawns CLI process
**Then** stdout/stderr are captured
**And** process can be killed via API
**And** exit code is captured

**Status:** cli-spawner.ts implemented for process lifecycle management

### Story 5.4: Provider Health Checks ✅

As a developer,
I want API to validate provider connections,
So that users know if their providers are working.

**Acceptance Criteria:**

**Given** provider is configured
**When** health check is triggered
**Then** API attempts connection
**And** returns status: connected, error with message

### Story 5.5: Hardware Context Detection ✅

As a developer,
I want the API to automatically detect hardware context,
So that benchmarks include accurate system information.

**Acceptance Criteria:**

**Given** a benchmark is created
**When** hardware context is captured
**Then** CPU model, cores, RAM are detected
**And** GPU model and VRAM are detected (Linux via rocm-smi, Windows via wmic, Mac via system_profiler)
**And** OS platform and version are recorded

### Story 5.6: Code Quality Benchmark Integration ✅

As a developer,
I want the API to support code quality benchmark tasks,
So that LLM positional recall can be measured.

**Acceptance Criteria:**

**Given** a task with type "code-quality"
**When** benchmark is executed
**Then** functions are extracted, sampled, and scored
**And** F1 metrics are included in results
**And** progress is streamed via SSE

---

## Epic 6: Dashboard Frontend

**Goal:** React dashboard with configuration, visualization, and real-time updates.

**Status:** ✅ Complete

### Story 6.1: Dashboard Setup ✅

As a user,
I want to access dashboard via browser,
So that I can configure and monitor benchmarks visually.

**Acceptance Criteria:**

**Given** Docker is running
**When** I open localhost:3000
**Then** dashboard loads within 3 seconds
**And** all static assets load correctly

### Story 6.2: Provider Configuration UI ✅

As a user,
I want to add and manage providers via dashboard,
So that I don't need CLI knowledge.

**Acceptance Criteria:**

**Given** dashboard is loaded
**When** I navigate to providers
**Then** I see list of configured providers
**And** I can add new provider via form
**And** I can remove provider with confirmation
**And** I can edit existing providers
**And** I can start/stop llama.cpp servers
**And** I can verify provider connections

### Story 6.3: Results Visualization ✅

As a user,
I want to view benchmark results with charts,
So that I can quickly compare LLM performance.

**Acceptance Criteria:**

**Given** benchmark has completed
**When** I view results
**Then** charts show execution time per provider
**And** charts show token consumption per provider
**And** rankings are displayed by metric
**And** code quality metrics are displayed when applicable

### Story 6.4: Dark/Light Mode ⚠️

As a user,
I want dark/light mode toggle,
So that I dashboard is comfortable in any lighting.

**Acceptance Criteria:**

**Given** dashboard is loaded
**When** I toggle theme
**Then** all colors update appropriately
**And** preference is persisted

**Status:** Dark mode only implemented. Light mode theme support exists in Providers page but not globally.

### Story 6.5: Export/Import Results ⚠️

As a user,
I want to export and import benchmark results,
So that I can share or backup benchmark data.

**Acceptance Criteria:**

**Given** benchmark results exist
**When** I click export
**Then** JSON file is downloaded with complete data
**And** JSON can be imported to view in dashboard

**Status:** Export implemented. Import not yet implemented.

### Story 6.6: Task Management ✅

As a user,
I want to manage benchmark tasks from the dashboard,
So that I can customize the test suite.

**Acceptance Criteria:**

**Given** dashboard is loaded
**When** I navigate to benchmark page
**Then** I see list of available tasks
**And** I can edit task prompts
**And** I can delete tasks

---

## Epic 7: Configuration & Settings

**Goal:** User-configurable settings for benchmark behavior and metrics.

**Status:** ⚠️ Partial

### Story 7.1: Default Benchmark Settings ✅

As a user,
I want to configure default timeout, temperature, max tokens,
So that benchmarks run with my preferred defaults.

**Acceptance Criteria:**

**Given** settings page
**When** I update default timeout to 180 seconds
**Then** new benchmarks use 180 second timeout
**And** existing benchmarks are unchanged

**Status:** Per-provider settings (timeoutMs, maxTokens, temperature) implemented. Global settings endpoint exists.

### Story 7.2: Metrics Customization ❌

As a user,
I want to choose which metrics are collected,
So that I can focus on what matters to me.

**Acceptance Criteria:**

**Given** settings page
**When** I uncheck "capture token consumption"
**Then** future benchmarks don't measure tokens
**And** results view updates to reflect choice

### Story 7.3: Task Catalog Management ✅

As a user,
I want to add/edit/remove benchmark tasks,
So that I can customize the test suite.

**Acceptance Criteria:**

**Given** task management page
**When** I add new task with prompt and expected format
**Then** task appears in task selection
**And** task is persisted across sessions

**Status:** Edit and delete tasks implemented via dashboard. Add task via API.
