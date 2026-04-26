# Agent Guidelines

## Always Run Servers in Background

When starting development servers, ALWAYS run in background using `nohup` and `&`:

```bash
nohup npm run dev:dashboard > /tmp/vite.log 2>&1 &
```

NOT just:
```bash
npm run dev:dashboard &
```

Because `&` can still hang the shell. Use `nohup` for proper background execution.

## Critical Rules

1. **Never run blocking commands** like `pkill`, `kill`, `sleep` with long timeouts without background
2. **Use background for all long-running operations**
3. **If you need to kill processes, do it in background**: `pkill -f vite &`
4. **Use timeout for network commands**: `curl --max-time 5 http://...`