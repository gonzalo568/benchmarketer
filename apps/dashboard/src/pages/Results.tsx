import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Share2, CheckCircle, XCircle, Clock, Zap, Hash, FileText, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function ResultsPage() {
  const [expandedResult, setExpandedResult] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: benchmarks = [], isLoading } = useQuery({
    queryKey: ['benchmarks'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/benchmarks`);
      return res.json();
    },
    refetchInterval: 5000,
  });

  const chartData = benchmarks.flatMap((b: any) =>
    b.results?.map((r: any) => ({
      name: r.providerId,
      'Time (s)': +(r.executionTimeMs / 1000).toFixed(2),
      'Tokens': r.tokensUsed,
      'Tokens/s': +r.tokensPerSecond.toFixed(1),
      'Quality': r.qualityScore * 10,
    })) || []
  );

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Results</h1>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition">
            <Download size={20} />
            Export
          </button>
          <button className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition">
            <Share2 size={20} />
            Share
          </button>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Performance Comparison</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Bar dataKey="Tokens/s" fill="#10B981" />
                <Bar dataKey="Quality" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Benchmark History</h3>

        {isLoading ? (
          <p className="text-gray-400">Loading...</p>
        ) : benchmarks.length === 0 ? (
          <p className="text-gray-400">No benchmarks yet. Run a benchmark to see results.</p>
        ) : (
          <div className="space-y-4">
            {benchmarks.map((benchmark: any) => (
              <div key={benchmark.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {benchmark.status === 'completed' ? (
                      <CheckCircle size={20} className="text-emerald-400" />
                    ) : benchmark.status === 'failed' ? (
                      <XCircle size={20} className="text-red-400" />
                    ) : (
                      <Clock size={20} className="text-yellow-400" />
                    )}
                    <div>
                      <p className="font-medium">Task: {benchmark.taskId}</p>
                      <p className="text-sm text-gray-400">
                        {new Date(benchmark.startedAt).toLocaleString()}
                        {benchmark.completedAt && ` - ${(Number(new Date(benchmark.completedAt)) - Number(new Date(benchmark.startedAt))) / 1000}s`}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    benchmark.status === 'completed' ? 'bg-emerald-900 text-emerald-400' :
                    benchmark.status === 'failed' ? 'bg-red-900 text-red-400' :
                    'bg-yellow-900 text-yellow-400'
                  }`}>
                    {benchmark.status}
                  </span>
                </div>

                {benchmark.results?.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {benchmark.results.map((result: any, idx: number) => (
                      <div key={idx} className="bg-gray-800 rounded p-3">
                        <p className="text-xs text-gray-400 mb-1">{result.providerId}</p>
                        <div className="flex items-center gap-2">
                          <Zap size={14} className="text-emerald-400" />
                          <span className="font-medium">{(result.executionTimeMs / 1000).toFixed(1)}s</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Hash size={14} className="text-blue-400" />
                          <span>{result.tokensUsed} tok</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <FileText size={14} className="text-purple-400" />
                          <span>{result.tokensPerSecond.toFixed(1)}/s</span>
                        </div>
                        <button
                          onClick={() => setExpandedResult(expandedResult?.id === result.id ? null : result)}
                          className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-emerald-400 transition"
                        >
                          Output
                          {expandedResult?.id === result.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {expandedResult && (
                  <div className="mt-4 bg-gray-800 rounded-lg p-4 border border-emerald-700">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-emerald-400">Output - {expandedResult.providerId}</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(expandedResult.output || '', expandedResult.id)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-400 transition"
                        >
                          {copiedId === expandedResult.id ? <Check size={12} /> : <Copy size={12} />}
                          {copiedId === expandedResult.id ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                          onClick={() => setExpandedResult(null)}
                          className="text-xs text-gray-400 hover:text-gray-200 transition"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                    <pre className="text-xs text-gray-300 bg-gray-900 rounded p-3 overflow-x-auto whitespace-pre-wrap">
                      {expandedResult.output || '(no output)'}
                    </pre>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-gray-700 rounded p-2">
                        <span className="text-gray-400">Execution Time:</span>
                        <span className="ml-1">{(expandedResult.executionTimeMs / 1000).toFixed(2)}s</span>
                      </div>
                      <div className="bg-gray-700 rounded p-2">
                        <span className="text-gray-400">Tokens:</span>
                        <span className="ml-1">{expandedResult.tokensUsed}</span>
                      </div>
                      <div className="bg-gray-700 rounded p-2">
                        <span className="text-gray-400">Quality:</span>
                        <span className="ml-1">{expandedResult.qualityScore}/1</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
