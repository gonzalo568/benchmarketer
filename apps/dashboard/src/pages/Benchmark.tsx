import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play, Square, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function BenchmarkPage() {
  const [selectedTask, setSelectedTask] = useState('hello-world');
  const [selectedProviders, setSelectedProviders] = useState<string[]>(['llama-cpp-local']);
  const [currentExecution, setCurrentExecution] = useState<any>(null);

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/config`);
      return res.json();
    },
  });

  const runBenchmark = async () => {
    if (selectedProviders.length === 0) return;

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
        prompt: 'Write hello world in python - only output the code, no markdown',
        timeoutMs: 120000,
      }),
    });
    const result = await startRes.json();
    setCurrentExecution(result);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Run Benchmark</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Select Task</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded bg-emerald-900 border border-emerald-600 cursor-pointer">
              <input type="radio" name="task" value="hello-world" checked readOnly className="hidden" />
              <div>
                <p className="font-medium">Hello World</p>
                <p className="text-sm text-gray-400">Write a hello world function</p>
              </div>
              <span className="ml-auto text-xs bg-emerald-600 px-2 py-1 rounded">L1</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded bg-gray-700 hover:bg-gray-650 cursor-pointer">
              <input type="radio" name="task" value="fizzbuzz" disabled className="hidden" />
              <div>
                <p className="font-medium text-gray-400">FizzBuzz</p>
                <p className="text-sm text-gray-500">Implement FizzBuzz</p>
              </div>
              <span className="ml-auto text-xs bg-gray-600 px-2 py-1 rounded text-gray-500">L2</span>
            </label>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Select Providers</h3>
          <div className="space-y-2">
            {config?.providers?.map((provider: any) => (
              <label
                key={provider.id}
                className={`flex items-center gap-3 p-3 rounded cursor-pointer transition ${
                  selectedProviders.includes(provider.id) ? 'bg-emerald-900 border border-emerald-600' : 'bg-gray-700 hover:bg-gray-650'
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
                  <p className="text-sm text-gray-400">{provider.type} - {provider.modelPath.split('/').pop()}</p>
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
    </div>
  );
}
