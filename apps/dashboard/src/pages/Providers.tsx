import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Play, Square, Loader2, CheckCircle, XCircle, AlertCircle, Server, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function Providers() {
  const queryClient = useQueryClient();

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/providers`);
      return res.json();
    },
  });

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/config`);
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (provider: any) => {
      const res = await fetch(`${API_URL}/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(provider),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${API_URL}/providers/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  });

  const startMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/providers/${id}/start`, { method: 'POST' });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  });

  const stopMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/providers/${id}/stop`, { method: 'POST' });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  });

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/providers/${id}/verify`, { method: 'POST' });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [providerType, setProviderType] = useState<'llamacpp' | 'ollama' | 'lmstudio' | 'claude' | 'minimax'>('llamacpp');
  const [newProvider, setNewProvider] = useState({
    name: '',
    binaryPath: config?.providerDefaults?.llamacpp?.binaryPath || '',
    modelsDir: config?.providerDefaults?.llamacpp?.modelsDir || '/home/frit/models',
    modelPath: '',
    serverPort: config?.providerDefaults?.llamacpp?.serverPort || 8080,
    contextSize: config?.providerDefaults?.llamacpp?.contextSize || 512,
    gpuLayers: config?.providerDefaults?.llamacpp?.gpuLayers || 99,
    endpoint: 'http://localhost:11434',
    apiKey: '',
    modelName: '',
    settings: { timeoutMs: 300000, maxTokens: 100, temperature: 0.1 },
  });

  const handleAdd = () => {
    let provider: any = { name: newProvider.name, type: providerType, settings: newProvider.settings };

    switch (providerType) {
      case 'llamacpp':
        provider = {
          ...provider,
          binaryPath: newProvider.binaryPath,
          modelsDir: newProvider.modelsDir,
          modelPath: newProvider.modelPath,
          serverPort: newProvider.serverPort,
          contextSize: newProvider.contextSize,
          gpuLayers: newProvider.gpuLayers,
        };
        break;
      case 'ollama':
        provider = { ...provider, endpoint: newProvider.endpoint, modelName: newProvider.modelName };
        break;
      case 'lmstudio':
        provider = { ...provider, endpoint: newProvider.endpoint, modelName: newProvider.modelName };
        break;
      case 'claude':
        provider = { ...provider, apiKey: newProvider.apiKey, modelName: newProvider.modelName };
        break;
      case 'minimax':
        provider = { ...provider, apiKey: newProvider.apiKey, modelName: newProvider.modelName };
        break;
    }

    addMutation.mutate(provider);
    setShowAdd(false);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'running': return <CheckCircle size={16} className="text-emerald-400" />;
      case 'starting': return <Loader2 size={16} className="text-yellow-400 animate-spin" />;
      case 'error': return <XCircle size={16} className="text-red-400" />;
      default: return <AlertCircle size={16} className="text-gray-400" />;
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'running': return 'Running';
      case 'starting': return 'Starting...';
      case 'error': return 'Error';
      default: return 'Stopped';
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">LLM Providers</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition"
        >
          <Plus size={20} />
          Add Provider
        </button>
      </div>

      {showAdd && (
        <div className="bg-gray-800 rounded-lg p-6 border border-emerald-600">
          <h3 className="text-lg font-semibold mb-4">Add New Provider</h3>

          <div className="flex gap-2 mb-4">
            {(['llamacpp', 'ollama', 'lmstudio', 'claude', 'minimax'] as const).map(type => (
              <button
                key={type}
                onClick={() => {
                  setProviderType(type);
                  setNewProvider(prev => ({ ...prev, modelName: '', modelPath: '' }));
                }}
                className={`px-3 py-1 rounded text-sm transition ${
                  providerType === type ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              placeholder="Provider name"
              value={newProvider.name}
              onChange={e => setNewProvider({ ...newProvider, name: e.target.value })}
              className="bg-gray-700 rounded px-3 py-2 col-span-2"
            />

            {providerType === 'llamacpp' && (
              <>
                <input
                  placeholder="Server binary path"
                  value={newProvider.binaryPath}
                  onChange={e => setNewProvider({ ...newProvider, binaryPath: e.target.value })}
                  className="bg-gray-700 rounded px-3 py-2"
                />
                <input
                  placeholder="Models directory"
                  value={newProvider.modelsDir}
                  onChange={e => setNewProvider({ ...newProvider, modelsDir: e.target.value })}
                  className="bg-gray-700 rounded px-3 py-2"
                />
                <select
                  value={newProvider.modelPath}
                  onChange={e => setNewProvider({ ...newProvider, modelPath: e.target.value })}
                  className="bg-gray-700 rounded px-3 py-2"
                >
                  <option value="">Select model...</option>
                  {config?.availableModels?.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <input
                  placeholder="Server port"
                  type="number"
                  value={newProvider.serverPort}
                  onChange={e => setNewProvider({ ...newProvider, serverPort: parseInt(e.target.value) || 8080 })}
                  className="bg-gray-700 rounded px-3 py-2"
                />
              </>
            )}

            {providerType === 'ollama' && (
              <>
                <input
                  placeholder="Endpoint (e.g., http://localhost:11434)"
                  value={newProvider.endpoint}
                  onChange={e => setNewProvider({ ...newProvider, endpoint: e.target.value })}
                  className="bg-gray-700 rounded px-3 py-2 col-span-2"
                />
                <input
                  placeholder="Model name (e.g., llama3, codellama)"
                  value={newProvider.modelName}
                  onChange={e => setNewProvider({ ...newProvider, modelName: e.target.value })}
                  className="bg-gray-700 rounded px-3 py-2 col-span-2"
                />
              </>
            )}

            {providerType === 'lmstudio' && (
              <>
                <input
                  placeholder="Endpoint (e.g., http://localhost:1234)"
                  value={newProvider.endpoint}
                  onChange={e => setNewProvider({ ...newProvider, endpoint: e.target.value })}
                  className="bg-gray-700 rounded px-3 py-2 col-span-2"
                />
                <input
                  placeholder="Model name (leave empty for auto)"
                  value={newProvider.modelName}
                  onChange={e => setNewProvider({ ...newProvider, modelName: e.target.value })}
                  className="bg-gray-700 rounded px-3 py-2 col-span-2"
                />
              </>
            )}

            {(providerType === 'claude' || providerType === 'minimax') && (
              <>
                <input
                  placeholder="API Key"
                  type="password"
                  value={newProvider.apiKey}
                  onChange={e => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                  className="bg-gray-700 rounded px-3 py-2 col-span-2"
                />
                <input
                  placeholder="Model name"
                  value={newProvider.modelName}
                  onChange={e => setNewProvider({ ...newProvider, modelName: e.target.value })}
                  className="bg-gray-700 rounded px-3 py-2 col-span-2"
                />
              </>
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded transition">
              Save Provider
            </button>
            <button onClick={() => setShowAdd(false)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((provider: any) => (
          <div key={provider.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{provider.name}</h3>
                <p className="text-gray-400 text-sm">{provider.type.toUpperCase()}</p>
              </div>
              <div className="flex items-center gap-2">
                {provider.status === 'verified' && (
                  <span className="flex items-center gap-1 text-emerald-400 text-sm">
                    <CheckCircle size={14} /> Verified
                  </span>
                )}
                <button
                  onClick={() => verifyMutation.mutate(provider.id)}
                  className="text-gray-400 hover:text-emerald-400 transition p-1"
                  title="Verify"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(provider.id)}
                  className="text-gray-400 hover:text-red-400 transition p-1"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {provider.type === 'llamacpp' ? (
              <div className="bg-gray-700 rounded p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Server size={16} className="text-gray-400" />
                  <span className="text-sm">Server Status</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(provider.serverStatus)}
                    <span className="font-medium">{getStatusText(provider.serverStatus)}</span>
                  </div>
                  {provider.serverStatus === 'running' ? (
                    <button
                      onClick={() => stopMutation.mutate(provider.id)}
                      disabled={stopMutation.isPending}
                      className="flex items-center gap-1 bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition"
                    >
                      <Square size={12} /> Stop
                    </button>
                  ) : (
                    <button
                      onClick={() => startMutation.mutate(provider.id)}
                      disabled={startMutation.isPending || !provider.modelPath}
                      className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded text-sm transition disabled:opacity-50"
                      title={!provider.modelPath ? 'Select a model first' : ''}
                    >
                      {startMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                      Start
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-700 rounded p-4 mb-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon(provider.status === 'verified' ? 'running' : 'stopped')}
                  <span className="font-medium">{provider.status === 'verified' ? 'Connected' : 'Not verified'}</span>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-400 space-y-1">
              {provider.type === 'llamacpp' && (
                <>
                  <p>Model: {provider.modelPath?.split('/').pop() || 'None selected'}</p>
                  <p>Port: {provider.serverPort}</p>
                </>
              )}
              {provider.type === 'ollama' && <p>Endpoint: {provider.endpoint}</p>}
              {provider.type === 'lmstudio' && <p>Endpoint: {provider.endpoint}</p>}
              {(provider.type === 'claude' || provider.type === 'minimax') && (
                <>
                  <p>Model: {provider.modelName}</p>
                  <p>API Key: {provider.apiKey ? '***' + provider.apiKey.slice(-4) : 'Not set'}</p>
                </>
              )}
            </div>
          </div>
        ))}

        {providers.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-400">
            No providers configured. Click "Add Provider" to get started.
          </div>
        )}
      </div>
    </div>
  );
}
