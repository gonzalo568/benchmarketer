import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export function Dashboard() {
  const { data: providers } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/providers`);
      return res.json();
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/tasks`);
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-emerald-400 font-semibold mb-2">Providers</h3>
          <p className="text-4xl font-bold">{providers?.length || 0}</p>
          <p className="text-gray-400 text-sm">Configured</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-emerald-400 font-semibold mb-2">Tasks</h3>
          <p className="text-4xl font-bold">{tasks?.length || 0}</p>
          <p className="text-gray-400 text-sm">Available</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-emerald-400 font-semibold mb-2">Benchmarks</h3>
          <p className="text-4xl font-bold">0</p>
          <p className="text-gray-400 text-sm">Completed</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Quick Start</h3>
        <div className="space-y-3">
          <p className="text-gray-400">1. Add your LLM providers in the Providers page</p>
          <p className="text-gray-400">2. Select a task and run a benchmark</p>
          <p className="text-gray-400">3. View results and compare performance</p>
        </div>
      </div>
    </div>
  );
}
