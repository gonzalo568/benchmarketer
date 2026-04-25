# Benchmarketer CLI

Command-line interface for running LLM benchmarks.

## Usage

```bash
benchmarketer providers add -n Ollama -t ollama -e http://localhost:11434
benchmarketer run l2-feature --providers ollama-id
benchmarketer providers list
```

## Commands

- `providers` - Manage LLM providers
- `run` - Execute benchmarks
