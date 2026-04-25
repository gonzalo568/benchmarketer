import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { providersRouter } from './routes/providers';
import { benchmarksRouter } from './routes/benchmarks';
import { tasksRouter } from './routes/tasks';
import { configRouter } from './routes/config';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/providers', providersRouter);
app.use('/api/benchmarks', benchmarksRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/config', configRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SSE stream for benchmark progress
app.get('/api/benchmarks/:id/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // TODO: Implement SSE streaming from CLI process
  res.write('data: {"type":"progress","status":"pending"}\n\n');
});

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});
