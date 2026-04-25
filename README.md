# Benchmarketer

Open-source LLM benchmarking tool for comparing local LLMs (llama.cpp, Ollama, LMStudio) vs commercial (Claude, Minimax) with visual dashboard and CLI.

## Features

- **Hardware Context Capture** - CPU, RAM, GPU, OS automatically recorded
- **Visual Dashboard** - React + TailwindCSS dashboard
- **CLI Tool** - Commander.js CLI for automation
- **Export/Import** - JSON benchmark results
- **Docker** - Full-stack containerized

## Stack

| Component | Technology |
|-----------|-------------|
| API | Express.js + TypeScript |
| CLI | Commander.js + TypeScript |
| Dashboard | React 18 + Vite + TailwindCSS |
| Database | SQLite (local) |
| Container | Docker + docker-compose |

## Setup

```bash
npm install
```

## Development

```bash
# All services
npm run dev

# API only
npm run dev:api

# Dashboard only
npm run dev:dashboard
```

## Docker

```bash
docker compose up -d
```

## CLI Usage

```bash
# Add provider
benchmarketer providers add -n Ollama -t ollama -e http://localhost:11434

# List providers
benchmarketer providers list

# Run benchmark
benchmarketer run l2-feature --providers provider-id
```
