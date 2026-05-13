import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Share2, CheckCircle, XCircle, Clock, Zap, Hash, FileText, ChevronDown, ChevronUp, Copy, Check, Trash2, Edit2, Target, AlertTriangle, Award } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export function ResultsPage() {
  const [expandedResultIds, setExpandedResultIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: benchmarks = [], isLoading } = useQuery({
    queryKey: ['benchmarks'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/benchmarks`);
      return res.json();
    },
    refetchInterval: 5000,
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/providers`);
      return res.json();
    },
  });

  const getProviderName = (providerId: string) => {
    const provider = providers.find((p: any) => p.id === providerId);
    return provider?.name || provider?.modelPath?.split('/').pop() || providerId;
  };

  const toggleExpanded = (resultId: string) => {
    setExpandedResultIds(prev => {
      const next = new Set(prev);
      if (next.has(resultId)) {
        next.delete(resultId);
      } else {
        next.add(resultId);
      }
      return next;
    });
  };

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${API_URL}/benchmarks/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['benchmarks'] }),
  });

  const updateQualityMutation = useMutation({
    mutationFn: async ({ benchmarkId, resultId, score }: { benchmarkId: string; resultId: string; score: number }) => {
      const benchmark = benchmarks.find((b: any) => b.id === benchmarkId);
      if (!benchmark) return;
      const updatedResults = benchmark.results.map((r: any) => 
        r.id === resultId ? { ...r, qualityScoreUser: score } : r
      );
      await fetch(`${API_URL}/benchmarks/${benchmarkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: updatedResults }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['benchmarks'] }),
  });

  const [qualityValue, setQualityValue] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);

  const startEditQuality = (benchmarkId: string, resultId: string, currentScore: number) => {
    updateQualityMutation.mutate({
      benchmarkId,
      resultId,
      score: Math.round(currentScore) || 3,
    });
  };

  const downloadBenchmark = (benchmark: any) => {
    const data = JSON.stringify(benchmark, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark-${benchmark.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = benchmarks.flatMap((b: any) =>
    b.results?.map((r: any) => ({
      name: getProviderName(r.providerId),
      'Time (s)': +(r.executionTimeMs / 1000).toFixed(2),
      'Tokens': r.tokensUsed,
      'Tokens/s': +r.tokensPerSecond.toFixed(1),
      'Prompt Processing (tok/s)': r.qualityMetrics?.ppTokensPerSec ? +r.qualityMetrics.ppTokensPerSec.toFixed(1) : 0,
      'Text Generation (tok/s)': r.qualityMetrics?.tgTokensPerSec ? +r.qualityMetrics.tgTokensPerSec.toFixed(1) : 0,
      'Quality': +((r.qualityScoreUser ?? r.qualityScore) * 10).toFixed(2),
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
                <Bar dataKey="Prompt Processing (tok/s)" fill="#F59E0B" />
                <Bar dataKey="Text Generation (tok/s)" fill="#EF4444" />
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
            {[...benchmarks].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).map((benchmark: any) => (
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
<p className="text-sm text-gray-300">
                          {new Date(benchmark.startedAt).toLocaleString()}
                        </p>
                        {benchmark.hardwareContext?.os && (
                          <p className="text-sm text-emerald-400 mt-1">
                            {benchmark.hardwareContext.os.platform === 'linux' ? 'Linux' : benchmark.hardwareContext.os.platform === 'win32' ? 'Windows' : 'Mac'} | {benchmark.hardwareContext.cpu?.cores} cores | {Math.round(benchmark.hardwareContext.ram?.totalGB)}GB RAM
                            {benchmark.hardwareContext.gpu && (
                              <span> | GPU: {benchmark.hardwareContext.gpu.model} ({benchmark.hardwareContext.gpu.vramGB}GB VRAM)</span>
                            )}
                          </p>
                        )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadBenchmark(benchmark)}
                      className="flex items-center gap-1 text-gray-400 hover:text-emerald-400 transition p-1"
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(benchmark.id)}
                      className="flex items-center gap-1 text-gray-400 hover:text-red-400 transition p-1"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                    <span className={`text-xs px-2 py-1 rounded ${
                      benchmark.status === 'completed' ? 'bg-emerald-900 text-emerald-400' :
                      benchmark.status === 'failed' ? 'bg-red-900 text-red-400' :
                      'bg-yellow-900 text-yellow-400'
                    }`}>
                      {benchmark.status}
                    </span>
                  </div>
                </div>

                {benchmark.results?.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {benchmark.results.map((result: any, idx: number) => (
                      <div key={idx} className="bg-gray-800 rounded p-3">
                        <p className="text-xs text-emerald-400 mb-1 font-medium">{getProviderName(result.providerId)}</p>
                        <div className="flex items-center gap-2">
                          <Zap size={14} className="text-emerald-400" />
                          <span className="text-sm">{(result.executionTimeMs / 1000).toFixed(1)}s</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Hash size={14} className="text-blue-400" />
                          <span className="text-sm">{result.tokensUsed} tok</span>
                          <span className="text-gray-500 mx-1">|</span>
                          <FileText size={14} className="text-purple-400" />
                          <span className="text-sm">{result.tokensPerSecond.toFixed(1)}/s</span>
                        </div>
                        {result.qualityMetrics?.ppTokensPerSec && result.qualityMetrics?.tgTokensPerSec && (
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            <span className="text-gray-400">Prompt Processing: {result.qualityMetrics.ppTokensPerSec.toFixed(1)}</span>
                            <span className="text-gray-400">Text Generation: {result.qualityMetrics.tgTokensPerSec.toFixed(1)}</span>
                          </div>
                        )}
                        {result.qualityMetrics?.codeQuality && (
                          <div className="mt-2 bg-gray-900 rounded p-2 border border-blue-700">
                            <p className="text-xs text-blue-400 font-medium mb-2 flex items-center gap-1">
                              <Target size={12} /> Code Quality Metrics
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-1">
                                <CheckCircle size={12} className="text-emerald-400" />
                                <span className="text-gray-300">Pass Rate: {(result.qualityMetrics.codeQuality.passRate * 100).toFixed(0)}%</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Award size={12} className="text-yellow-400" />
                                <span className="text-gray-300">Matched: {result.qualityMetrics.codeQuality.totalMatched}/{result.qualityMetrics.codeQuality.totalPrimary}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <AlertTriangle size={12} className="text-orange-400" />
                                <span className="text-gray-300">Hallucinated: {result.qualityMetrics.codeQuality.totalHallucinated}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Target size={12} className="text-blue-400" />
                                <span className="text-gray-300">Bonus: {result.qualityMetrics.codeQuality.totalBonus}</span>
                              </div>
                              <div className="col-span-2 flex items-center gap-1">
                                <span className="text-gray-300">Score: {(result.qualityMetrics.codeQuality.score * 100).toFixed(2)}%</span>
                                <span className="text-gray-500">|</span>
                                <span className="text-gray-300">Functions: {result.qualityMetrics.codeQuality.functionsTested}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => toggleExpanded(result.id)}
                          className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-emerald-400 transition"
                        >
                          Output
                          {expandedResultIds.has(result.id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        {expandedResultIds.has(result.id) && (
                          <div className="mt-3 bg-gray-900 rounded p-3 border border-emerald-700">
                            {result.settings && (
                              <div className="mb-2 text-sm text-emerald-400 flex gap-4">
                                {result.settings.maxTokens && <span>Max Tokens: {result.settings.maxTokens}</span>}
                                {result.settings.temperature !== undefined && <span>Temperature: {result.settings.temperature}</span>}
                              </div>
                            )}
                            <pre className="text-sm text-gray-300 overflow-x-auto whitespace-pre-wrap">
                              {result.output || '(no output)'}
                            </pre>
                            <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center">
                              <div className="flex items-center gap-4">
                                <span className="text-sm">Time: {(result.executionTimeMs / 1000).toFixed(1)}s</span>
                                <span className="text-sm">Tokens: {result.tokensUsed}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div
                                  onMouseLeave={() => setHoverStar(0)}
                                  className="flex items-center gap-1"
                                >
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      onClick={() => {
                                        updateQualityMutation.mutate({
                                          benchmarkId: benchmark.id,
                                          resultId: result.id,
                                          score: star,
                                        });
                                      }}
                                      onMouseEnter={() => setHoverStar(star)}
                                      style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer', color: star <= (hoverStar || (result.qualityScoreUser ?? result.qualityScore ?? 0)) ? '#FBBF24' : '#4B5563', padding: '2px' }}
                                    >
                                      ★
                                    </button>
                                  ))}
                                </div>
                                <button
                                  onClick={() => copyToClipboard(result.output || '', result.id)}
                                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-emerald-400 transition ml-2"
                                >
                                  {copiedId === result.id ? <Check size={12} /> : <Copy size={12} />}
                                  Copy
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
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
