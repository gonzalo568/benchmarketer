import { Router } from 'express';
import type { BenchmarkTask } from '@benchmarketer/shared';
import { loadTasks, saveTasks } from '../lib/persistence';

export const tasksRouter = Router();

let tasks: BenchmarkTask[] = [];
let initialized = false;

async function initTasks() {
  if (!initialized) {
    tasks = await loadTasks();
    initialized = true;
  }
}

tasksRouter.get('/', async (_req, res) => {
  await initTasks();
  res.json(tasks);
});

tasksRouter.get('/:id', async (req, res) => {
  await initTasks();
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json(task);
});

tasksRouter.post('/', async (req, res) => {
  await initTasks();
  const newTask: BenchmarkTask = {
    id: req.body.id || `task-${Date.now()}`,
    name: req.body.name,
    level: req.body.level || 'L1',
    description: req.body.description || '',
    prompt: req.body.prompt,
    expectedPatterns: req.body.expectedPatterns,
    forbiddenPatterns: req.body.forbiddenPatterns,
    validation: req.body.validation,
  };
  tasks.push(newTask);
  await saveTasks(tasks);
  res.status(201).json(newTask);
});

tasksRouter.put('/:id', async (req, res) => {
  await initTasks();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  tasks[idx] = { ...tasks[idx], ...req.body };
  await saveTasks(tasks);
  res.json(tasks[idx]);
});

tasksRouter.delete('/:id', async (req, res) => {
  await initTasks();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  tasks.splice(idx, 1);
  await saveTasks(tasks);
  res.status(204).send();
});
