import { Router } from 'express';
import type { BenchmarkTask } from '@benchmarketer/shared';

export const tasksRouter = Router();

// Predefined benchmark tasks
const tasks: BenchmarkTask[] = [
  {
    id: 'l1-micro',
    name: 'Micro Task',
    level: 'L1',
    description: 'Simple function or script generation',
    prompt: 'Write a function that validates an email address',
  },
  {
    id: 'l2-feature',
    name: 'Feature Task',
    level: 'L2',
    description: 'Single file or module with multiple functions',
    prompt: 'Create a REST API endpoint for user authentication with JWT tokens',
  },
  {
    id: 'l3-system',
    name: 'System Task',
    level: 'L3',
    description: 'Multi-file project with business logic',
    prompt: 'Build a user authentication system with login, registration, and password reset',
  },
  {
    id: 'l4-fullstack',
    name: 'Full-Stack Task',
    level: 'L4',
    description: 'Complete application with frontend and backend',
    prompt: 'Create a task management application with real-time updates',
  },
];

tasksRouter.get('/', (_req, res) => {
  res.json(tasks);
});

tasksRouter.get('/:id', (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json(task);
});
