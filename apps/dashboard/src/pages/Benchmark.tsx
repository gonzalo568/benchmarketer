import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Square, CheckCircle, XCircle, Loader2, Edit2, Save, X, Trash2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export function BenchmarkPage() {
  const [selectedTask, setSelectedTask] = useState('hello-world');
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [currentExecution, setCurrentExecution] = useState<any>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');

  const queryClient = useQueryClient();

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/config`);
      return res.json();
    },
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/providers`);
      return res.json();
    },
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/tasks`);
      return res.json();
    },
  });

  const { data: benchmarks = [], isLoading: benchmarksLoading } = useQuery({
    queryKey: ['benchmarks'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/benchmarks`);
      return res.json();
    },
    refetchInterval: 5000,
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, prompt }: { id: string; prompt: string }) => {
      const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditingTaskId(null);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const startEditTask = (task: any) => {
    setEditingTaskId(task.id);
    setEditPrompt(task.prompt);
  };

  const saveEditTask = () => {
    if (editingTaskId) {
      updateTaskMutation.mutate({ id: editingTaskId, prompt: editPrompt });
    }
  };

  useEffect(() => {
    console.log('Benchmark useEffect - benchmarks:', benchmarks?.length, 'currentExecution:', currentExecution?.status);
    if (!currentExecution || currentExecution.status === 'completed' || currentExecution.status === 'failed' || currentExecution.status === 'cancelled') {
      const running = benchmarks.find((b: any) => b.status === 'running' || b.status === 'pending');
      if (running) {
        console.log('Setting currentExecution to running benchmark');
        setCurrentExecution(running);
        setSelectedTask(running.taskId);
        setSelectedProviders(running.providerIds);
      }
    }
  }, [benchmarks, currentExecution]);

  const runBenchmark = async () => {
    if (selectedProviders.length === 0) return;

    const task = tasks.find((t: any) => t.id === selectedTask);
    const prompt = task?.prompt || 'Write hello world in python - only output the code, no markdown';

    const createRes = await fetch(`${API_URL}/benchmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: selectedTask,
        providerIds: selectedProviders,
        hardwareContext: {},
      }),
    });
    const execution = await createRes.json();

    setCurrentExecution({ ...execution, status: 'running' });

    const startRes = await fetch(`${API_URL}/benchmarks/${execution.id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt,
        timeoutMs: 120000,
      }),
    });
    const result = await startRes.json();
    setCurrentExecution(result);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Run Benchmark</h1>
      {tasksLoading && <p className="text-gray-400">Loading tasks...</p>}
      {!tasksLoading && tasks.length === 0 && <p className="text-gray-400">No tasks available. Check API connectivity.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Select Task</h3>
          <div className="space-y-2">
            {tasks.map((task: any) => (
              <div
                key={task.id}
                className={`p-3 rounded cursor-pointer transition ${selectedTask === task.id ? 'bg-emerald-900 border border-emerald-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                onClick={() => setSelectedTask(task.id)}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="task"
                    value={task.id}
                    checked={selectedTask === task.id}
                    onChange={(e) => setSelectedTask(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="hidden"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{task.name}</p>
                    <p className="text-sm text-gray-400">{task.description}</p>
                    {selectedTask === task.id && (
                      <p className="text-xs text-emerald-300 mt-1">Prompt: {task.prompt}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); startEditTask(task); }}
                    className="text-gray-400 hover:text-emerald-400 p-1"
                    title="Edit prompt"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTaskMutation.mutate(task.id); }}
                    className="text-gray-400 hover:text-red-400 p-1"
                    title="Delete task"
                  >
                    <Trash2 size={14} />
                  </button>
                  <span className="text-xs bg-emerald-600 px-2 py-1 rounded">{task.level}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Select Providers</h3>
          <div className="space-y-2">
            {providers.map((provider: any) => (
              <label
                key={provider.id}
                className={`flex items-center gap-3 p-3 rounded cursor-pointer transition ${
                  selectedProviders.includes(provider.id) ? 'bg-emerald-900 border border-emerald-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedProviders.includes(provider.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedProviders([...selectedProviders, provider.id]);
                    } else {
                      setSelectedProviders(selectedProviders.filter(id => id !== provider.id));
                    }
                  }}
                  className="hidden"
                />
                <div className="flex-1">
                  <p className="font-medium">{provider.name}</p>
                  <p className="text-sm text-gray-400">{provider.type}{provider.modelPath ? ` - ${provider.modelPath.split('/').pop()}` : ''}</p>
                </div>
                {selectedProviders.includes(provider.id) && (
                  <CheckCircle size={18} className="text-emerald-400" />
                )}
              </label>
            ))}
          </div>
        </div>
      </div>

      {currentExecution && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Benchmark Progress</h3>
            {currentExecution.status === 'running' && <Loader2 size={20} className="animate-spin text-emerald-400" />}
            {currentExecution.status === 'completed' && <CheckCircle size={20} className="text-emerald-400" />}
            {currentExecution.status === 'failed' && <XCircle size={20} className="text-red-400" />}
          </div>

          <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
            <div
              className={`h-4 rounded-full transition-all ${
                currentExecution.status === 'completed' ? 'bg-emerald-500' :
                currentExecution.status === 'failed' ? 'bg-red-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${currentExecution.progress || 0}%` }}
            />
          </div>

          {currentExecution.results?.length > 0 && currentExecution.results[0] && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-gray-700 rounded p-4">
                <p className="text-gray-400 text-sm">Time</p>
                <p className="text-2xl font-bold">{(currentExecution.results[0].executionTimeMs / 1000).toFixed(1)}s</p>
              </div>
              <div className="bg-gray-700 rounded p-4">
                <p className="text-gray-400 text-sm">Tokens</p>
                <p className="text-2xl font-bold">{currentExecution.results[0].tokensUsed}</p>
              </div>
              <div className="bg-gray-700 rounded p-4">
                <p className="text-gray-400 text-sm">Tokens/s</p>
                <p className="text-2xl font-bold">{currentExecution.results[0].tokensPerSecond.toFixed(1)}</p>
              </div>
              <div className="bg-gray-700 rounded p-4">
                <p className="text-gray-400 text-sm">Output</p>
                <p className="text-2xl font-bold">{currentExecution.results[0].qualityMetrics.outputLength} chars</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={runBenchmark}
          disabled={selectedProviders.length === 0 || currentExecution?.status === 'running'}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg transition"
        >
          {currentExecution?.status === 'running' ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
          {currentExecution?.status === 'running' ? 'Running...' : 'Start Benchmark'}
        </button>

        {currentExecution && (
          <button
            onClick={() => setCurrentExecution(null)}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg transition"
          >
            New Benchmark
          </button>
        )}
      </div>

      {editingTaskId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl border border-emerald-600">
            <h3 className="text-lg font-semibold mb-4">Edit Task Prompt</h3>
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              className="w-full bg-gray-700 rounded px-3 py-2 h-32 mb-4"
              placeholder="Enter the prompt for this task..."
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditingTaskId(null)}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition"
              >
                <X size={16} />
                Cancel
              </button>
              <button
                onClick={saveEditTask}
                disabled={updateTaskMutation.isPending}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 px-4 py-2 rounded transition"
              >
                {updateTaskMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
