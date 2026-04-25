import './index.css';
import { Routes, Route, Link } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Providers } from './pages/Providers';
import { BenchmarkPage } from './pages/Benchmark';
import { ResultsPage } from './pages/Results';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-emerald-400">Benchmarketer</h1>
          <div className="flex gap-6">
            <Link to="/" className="hover:text-emerald-400 transition">Dashboard</Link>
            <Link to="/providers" className="hover:text-emerald-400 transition">Providers</Link>
            <Link to="/benchmark" className="hover:text-emerald-400 transition">Benchmark</Link>
            <Link to="/results" className="hover:text-emerald-400 transition">Results</Link>
          </div>
        </div>
      </nav>

      <main className="p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/providers" element={<Providers />} />
          <Route path="/benchmark" element={<BenchmarkPage />} />
          <Route path="/results" element={<ResultsPage />} />
        </Routes>
      </main>
    </div>
  );
}
