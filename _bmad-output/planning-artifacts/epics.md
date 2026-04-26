---
stepsCompleted: ["step-01-extract-requirements"]
inputDocuments: ["/home/frit/Dev2/benchmarketer/_bmad-output/planning-artifacts/prd.md", "/home/frit/Dev2/benchmarketer/_bmad-output/planning-artifacts/architecture.md"]
---

# benchmarketer - Epic Breakdown

## Implementation Status: COMPLETED

| Epic | Title | Status |
|------|-------|--------|
| Epic 1 | Foundation & Infrastructure | ✅ Complete |
| Epic 2 | Provider Abstraction Layer | ✅ Complete |
| Epic 3 | Benchmark Execution Engine | ✅ Complete |
| Epic 4 | CLI Tool | ✅ Complete |
| Epic 5 | API Server | ✅ Complete |
| Epic 6 | Dashboard Frontend | ✅ Complete |
| Epic 7 | Configuration & Settings | ✅ Complete |

## Implemented Providers

- **llama.cpp**: Local GPU inference (ROCm/CUDA)
- **Ollama**: Local Ollama servers
- **LMStudio**: Local LM Studio servers
- **MiniMax**: Cloud API (MiniMax-M2.7 model)
- **Claude**: Anthropic API (planned)
- **OpenAI**: OpenAI-compatible APIs (planned)

## Implemented Features

### Hardware Context Capture ✅
- CPU model, cores, clock speed
- RAM total and available
- GPU model and VRAM (Linux/Windows/Mac detection)
- OS platform, distribution, kernel version
- Automatic capture on benchmark execution

## Overview

This document provides the complete epic and story breakdown for benchmarketer, decomposing the requirements from the PRD, Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Dashboard Interface (FR1-FR8)**
- FR1: Users can access the dashboard via web browser (localhost or Docker)
- FR2: Users can see the dashboard in dark/light mode
- FR3: Users can see real-time benchmark execution progress via SSE
- FR4: Users can view benchmark results with charts, tables, and rankings
- FR5: Users can filter results by hardware context, date, or provider
- FR6: Users can export results as JSON or generate shareable reports
- FR7: Users can import external benchmark results for comparison
- FR8: Users can configure benchmark settings (timeouts, default task)

**API Server (FR9-FR14)**
- FR9: API server exposes REST endpoints for all operations
- FR10: API server spawns CLI processes for benchmark execution
- FR11: API server streams CLI output to dashboard via SSE
- FR12: API server stores results in local SQLite database
- FR13: API server validates provider connections before benchmark
- FR14: API server enforces security: API keys in environment variables only

**CLI Engine (FR15-FR22)**
- FR15: CLI can be run standalone without dashboard
- FR16: CLI supports adding/removing LLM providers
- FR17: CLI executes benchmarks and outputs JSON results
- FR18: CLI captures hardware context automatically (CPU, RAM, GPU, OS)
- FR19: CLI supports all LLM providers: llama.cpp, Ollama, LMStudio, Claude, Minimax
- FR20: CLI supports benchmark task catalog (L1-L4 complexity levels)
- FR21: CLI supports real-time progress output
- FR22: CLI can be controlled via HTTP API by the dashboard

**LLM Provider Management (FR23-FR27)**
- FR23: Users can add a new LLM provider via dashboard or CLI
- FR24: Users can verify that an LLM provider connection is working
- FR25: Users can view a list of all configured LLM providers
- FR26: Users can remove a configured LLM provider
- FR27: Users can configure per-provider settings (timeout, endpoint, API key)

**Benchmark Execution (FR28-FR32)**
- FR28: Users can select one or more LLM providers for a benchmark
- FR29: Users can select a benchmark task from the catalog (L1-L4)
- FR30: Users can execute a benchmark and view real-time progress
- FR31: Users can stop a benchmark execution at any time
- FR32: Benchmark continues if one provider fails (graceful degradation)

**Metrics Collection (FR33-FR37)**
- FR33: System automatically captures execution time per LLM
- FR34: System automatically captures token consumption (input + output)
- FR35: System automatically captures quality metrics (tests passed, lint results)
- FR36: System automatically captures hardware context (CPU, RAM, GPU, OS)
- FR37: System automatically captures LLM provider details (version, settings)

**Results & Reporting (FR38-FR43)**
- FR38: Users can view benchmark results in visual dashboard with rankings
- FR39: Users can compare results across different LLMs side-by-side
- FR40: Users can filter results by hardware context or date
- FR41: Users can export benchmark as JSON with full execution context
- FR42: Users can import benchmark JSON to view in dashboard
- FR43: Users can generate one-click summary report

**Configuration (FR44-FR46)**
- FR44: Users can configure default benchmark settings (timeout, temperature, max tokens)
- FR45: Users can customize which metrics are collected
- FR46: Users can configure task catalog (add/edit/remove tasks)

### NonFunctional Requirements

**Performance (NFR1-NFR4)**
- NFR1: Single task benchmark completes within configurable timeout (default 5 minutes per task)
- NFR2: Dashboard loads within 3 seconds
- NFR3: Progress updates streamed within 1 second
- NFR4: API endpoints respond within 500ms

**Security (NFR5-NFR8)**
- NFR5: API keys stored in environment variables, never in database or logs
- NFR6: All benchmark data remains on user's machine (no cloud sync)
- NFR7: Exported files contain no credentials
- NFR8: All API inputs sanitized

**Integration (NFR9-NFR11)**
- NFR9: Configurable timeout per LLM provider (default 120 seconds)
- NFR10: Failed provider connections display clear error messages
- NFR11: Graceful degradation - if one provider fails, benchmark continues

**Technical (NFR12-NFR13)**
- NFR12: SQLite stored locally in user's data directory
- NFR13: Full application containerized with docker-compose

### Additional Requirements (from Architecture)

- **Drizzle ORM** for database operations with migrations
- **REST resources pattern**: /providers, /benchmarks, /tasks
- **SSE endpoint**: /api/benchmarks/:id/stream for real-time progress
- **React Query** for server state management, **Zustand** for client state
- **Recharts** for data visualization
- **React Hook Form + Zod** for type-safe form validation
- **5 LLM Provider integrations**: llama.cpp, Ollama, LMStudio, Claude, Minimax

### UX Design Requirements

_(Not yet created - UX design is pending)_

## Epic List

Based on the PRD and Architecture, the following epics are proposed:

| Epic | Title | FR Coverage |
|------|-------|-------------|
| Epic 1 | Foundation & Infrastructure | FR9, FR12, FR14, NFR12, NFR13 |
| Epic 2 | Provider Abstraction Layer | FR16, FR19, FR23, FR24, FR25, FR26, FR27 |
| Epic 3 | Benchmark Execution Engine | FR17, FR18, FR20, FR21, FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR35, FR36, FR37 |
| Epic 4 | CLI Tool | FR15, FR16, FR17, FR20, FR21, FR22 |
| Epic 5 | API Server | FR9, FR10, FR11, FR12, FR13, FR14 |
| Epic 6 | Dashboard Frontend | FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR38, FR39, FR40, FR41, FR42, FR43 |
| Epic 6.1 | Results Page Enhancements | Provider names, multiple outputs, delete, quality scoring |
| Epic 7 | Configuration & Settings | FR8, FR44, FR45, FR46 |

---

## Epic 2.1 (Augmented): Provider Verification with Model Selection

**Goal:** Enable users to verify provider endpoints and select from available models before adding.

### Story 2.1.1: Provider Endpoint Verification API

As a developer,
I want an API endpoint that verifies provider connectivity and returns available models,
So that the dashboard can display a model selection dropdown after verification.

**Acceptance Criteria:**

**Given** a provider type and endpoint
**When** POST `/api/providers/verify-endpoint` is called
**Then** the response includes `verified: boolean`, `message: string`, and `models: [{name, id, size}]`
**And** for LM Studio, models are fetched from `/api/v1/models` endpoint

### Story 2.1.2: Dashboard Model Selection After Verification

As a user,
I want to see available models in a dropdown after verifying my provider,
So that I can select the correct model for benchmarking.

**Acceptance Criteria:**

**Given** I'm adding a new provider (Ollama or LM Studio)
**When** I click "Verify" and the endpoint is reachable
**Then** a model dropdown appears with the list of available models
**And** I can select one model for this provider

---

## Epic 6 (Augmented): Results Page Enhancements

**Goal:** Display provider names, support multiple expanded outputs, and enable benchmark deletion.

### Story 6.6.1: Provider Names in Results

As a user,
I want to see provider names (not GUIDs) in results,
So that I can easily identify which provider produced which result.

**Acceptance Criteria:**

**Given** benchmark results exist
**When** I view the results page
**Then** the bar chart shows provider names
**And** result cards show provider names
**And** expanded output headers show provider names

### Story 6.6.2: Multiple Expanded Outputs

As a user,
I want to keep multiple result outputs open simultaneously,
So that I can compare outputs from different providers.

**Acceptance Criteria:**

**Given** multiple benchmark results exist
**When** I click on a result card to expand its output
**Then** the output expands inline below that card
**And** clicking another result card expands its output too (without closing the first)
**And** each output has its own close button

### Story 6.6.3: Delete Benchmark

As a user,
I want to delete benchmarks from the results page,
So that I can remove unwanted or test data.

**Acceptance Criteria:**

**Given** I'm viewing results
**When** I click the delete (trash) icon next to a benchmark
**Then** a confirmation prompt appears
**And** if confirmed, the benchmark is removed from the list

---

## Epic 1: Foundation & Infrastructure

**Goal:** Set up project scaffolding, database schema, and core infrastructure that all other epics depend on.

### Story 1.1: Project Scaffolding

As a developer,
I want the project scaffolded with React + Express + Docker,
So that all team members work in a consistent development environment.

**Acceptance Criteria:**

**Given** a clean development machine
**When** I run the scaffold script
**Then** the monorepo structure is created with apps/api, apps/cli, apps/dashboard, packages/shared, packages/providers
**And** Docker configuration is in place
**And** TypeScript is configured with proper paths

**Given** the scaffolded project
**When** I run `npm install`
**Then** all workspace dependencies are installed
**And** `npm run dev` starts all services

### Story 1.2: Database Schema with Drizzle

As a developer,
I want the database schema defined with Drizzle ORM,
So that I can persist benchmark results and provider configurations.

**Acceptance Criteria:**

**Given** Drizzle is installed
**When** I define the schema
**Then** tables exist for: providers, benchmarks, benchmark_results, tasks
**And** migrations can be generated with `drizzle-kit generate`
**And** migrations can be applied with `drizzle-kit push`

### Story 1.3: Environment Configuration

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

### Story 2.1: Provider Interface Definition

As a developer,
I want a common LLMProvider interface,
So that benchmark logic works uniformly regardless of provider type.

**Acceptance Criteria:**

**Given** the shared package
**When** I define LLMProvider interface
**Then** it includes: connect(), disconnect(), complete(), getMetadata()
**And** TypeScript types are in @benchmarketer/shared

### Story 2.2: Ollama Provider Implementation

As a developer,
I want Ollama provider implemented using REST API,
So that benchmarks can run against local Ollama instances.

**Acceptance Criteria:**

**Given** Ollama is running at localhost:11434
**When** I create provider with endpoint
**Then** connect() validates connection
**And** complete() sends prompt and returns response
**And** metadata includes model name and capabilities

### Story 2.3: Claude Provider Implementation

As a developer,
I want Claude provider implemented using Anthropic API,
So that benchmarks can run against Claude models.

**Acceptance Criteria:**

**Given** ANTHROPIC_API_KEY is in environment
**When** I create Claude provider
**Then** connect() validates API key
**And** complete() sends prompt and returns response
**And** metadata includes model name and pricing tier

### Story 2.4: Minimax Provider Implementation

As a developer,
I want Minimax provider implemented using REST API,
So that benchmarks can run against Minimax models.

**Acceptance Criteria:**

**Given** MINIMAX_API_KEY is in environment
**When** I create Minimax provider
**Then** connect() validates API key
**And** complete() sends prompt and returns response
**And** metadata includes model name

### Story 2.5: llama.cpp Provider Implementation

As a developer,
I want llama.cpp provider implemented using child process spawning,
So that benchmarks can run against local llama.cpp binaries.

**Acceptance Criteria:**

**Given** llama.cpp binary exists at configured path
**When** I create llama.cpp provider
**Then** connect() validates binary execution
**And** complete() spawns process with prompt
**And** response is parsed from stdout

### Story 2.6: LMStudio Provider Implementation

As a developer,
I want LMStudio provider implemented using REST API,
So that benchmarks can run against LMStudio local server.

**Acceptance Criteria:**

**Given** LMStudio is running at localhost:1234
**When** I create provider with endpoint
**Then** connect() validates connection
**And** complete() sends prompt and returns response

### Story 2.7: Provider CRUD Operations

As a user,
I want to add, list, verify, and remove providers via CLI,
So that I can manage my benchmark configuration.

**Acceptance Criteria:**

**Given** no providers configured
**When** I run `benchmarketer providers add -n Ollama -t ollama -e http://localhost:11434`
**Then** provider is saved to config
**And** `benchmarketer providers list` shows the new provider
**And** `benchmarketer providers verify -n Ollama` tests the connection

---

## Epic 3: Benchmark Execution Engine

**Goal:** Core benchmark execution with metrics collection, real-time progress, and graceful degradation.

### Story 3.1: Benchmark Task Catalog

As a developer,
I want benchmark tasks defined with L1-L4 complexity levels,
So that users can select appropriate tests for their needs.

**Acceptance Criteria:**

**Given** task definitions exist
**When** user selects a task
**Then** the task prompt is loaded and executed against all selected providers
**And** task includes expected output format for quality evaluation

### Story 3.2: Metrics Collection

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

### Story 3.3: Real-time Progress Output

As a user,
I want to see benchmark progress in real-time,
So that I know which provider is being tested and overall completion.

**Acceptance Criteria:**

**Given** a benchmark is running
**When** progress updates occur
**Then** current provider and task are displayed
**And** percentage completion is shown
**And** any errors are displayed immediately

### Story 3.4: Graceful Degradation

As a user,
I want the benchmark to continue if one provider fails,
So that I get results for working providers even if one is down.

**Acceptance Criteria:**

**Given** a benchmark with providers A, B, C
**When** provider B fails
**Then** the benchmark continues with A and C
**And** provider B is marked as "failed" with error message
**And** results for A and C are still captured

### Story 3.5: Benchmark Cancellation

As a user,
I want to stop a benchmark at any time,
So that I don't waste time on unnecessary tests.

**Acceptance Criteria:**

**Given** a benchmark is running
**When** user presses Ctrl+C or clicks stop
**Then** all running providers are cancelled
**And** partial results are saved
**And** summary shows what completed vs what was cancelled

---

## Epic 4: CLI Tool

**Goal:** Complete CLI implementation for power users and CI/CD integration.

### Story 4.1: CLI Core Commands

As a power user,
I want CLI commands for all benchmark operations,
So that I can automate benchmarking in scripts and CI.

**Acceptance Criteria:**

**Given** CLI is installed
**When** I run `benchmarketer --help`
**Then** I see all available commands
**And** each command has proper help text

### Story 4.2: JSON Output Format

As a developer,
I want JSON output for benchmark results,
So that I can parse results programmatically.

**Acceptance Criteria:**

**Given** benchmark completes
**When** I run with `--format json`
**Then** output is valid JSON with complete benchmark data
**And** includes all metrics and hardware context

### Story 4.3: CLI Configuration File

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

### Story 5.1: REST API Endpoints

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

### Story 5.2: SSE Streaming

As a dashboard user,
I want real-time benchmark progress via SSE,
So that I see live updates as benchmark runs.

**Acceptance Criteria:**

**Given** a benchmark is running
**When** dashboard connects to /api/benchmarks/:id/stream
**Then** SSE events are sent with progress updates
**And** events include: provider started, provider completed, provider failed, percentage

### Story 5.3: CLI Process Management

As a developer,
I want API to spawn and manage CLI processes,
So that benchmarks run as child processes.

**Acceptance Criteria:**

**Given** benchmark request is received
**When** API spawns CLI process
**Then** stdout/stderr are captured
**And** process can be killed via API
**And** exit code is captured

### Story 5.4: Provider Health Checks

As a developer,
I want API to validate provider connections,
So that users know if their providers are working.

**Acceptance Criteria:**

**Given** provider is configured
**When** health check is triggered
**Then** API attempts connection
**And** returns status: connected, error with message

---

## Epic 6: Dashboard Frontend

**Goal:** React dashboard with configuration, visualization, and real-time updates.

### Story 6.1: Dashboard Setup

As a user,
I want to access dashboard via browser,
So that I can configure and monitor benchmarks visually.

**Acceptance Criteria:**

**Given** Docker is running
**When** I open localhost:3000
**Then** dashboard loads within 3 seconds
**And** all static assets load correctly

### Story 6.2: Provider Configuration UI

As a user,
I want to add and manage providers via dashboard,
So that I don't need CLI knowledge.

**Acceptance Criteria:**

**Given** dashboard is loaded
**When** I navigate to providers
**Then** I see list of configured providers
**And** I can add new provider via form
**And** I can remove provider with confirmation

### Story 6.3: Results Visualization

As a user,
I want to view benchmark results with charts,
So that I can quickly compare LLM performance.

**Acceptance Criteria:**

**Given** benchmark has completed
**When** I view results
**Then** charts show execution time per provider
**And** charts show token consumption per provider
**And** rankings are displayed by metric

### Story 6.4: Dark/Light Mode

As a user,
I want dark/light mode toggle,
So that dashboard is comfortable in any lighting.

**Acceptance Criteria:**

**Given** dashboard is loaded
**When** I toggle theme
**Then** all colors update appropriately
**And** preference is persisted

### Story 6.5: Export/Import Results

As a user,
I want to export and import benchmark results,
So that I can share or backup benchmark data.

**Acceptance Criteria:**

**Given** benchmark results exist
**When** I click export
**Then** JSON file is downloaded with complete data
**And** JSON can be imported to view in dashboard

---

## Epic 7: Configuration & Settings

**Goal:** User-configurable settings for benchmark behavior and metrics.

### Story 7.1: Default Benchmark Settings

As a user,
I want to configure default timeout, temperature, max tokens,
So that benchmarks run with my preferred defaults.

**Acceptance Criteria:**

**Given** settings page
**When** I update default timeout to 180 seconds
**Then** new benchmarks use 180 second timeout
**And** existing benchmarks are unchanged

### Story 7.2: Metrics Customization

As a user,
I want to choose which metrics are collected,
So that I can focus on what matters to me.

**Acceptance Criteria:**

**Given** settings page
**When** I uncheck "capture token consumption"
**Then** future benchmarks don't measure tokens
**And** results view updates to reflect choice

### Story 7.3: Task Catalog Management

As a user,
I want to add/edit/remove benchmark tasks,
So that I can customize the test suite.

**Acceptance Criteria:**

**Given** task management page
**When** I add new task with prompt and expected format
**Then** task appears in task selection
**And** task is persisted across sessions