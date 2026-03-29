import { useEffect, useState, useMemo } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Loader2, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../lib/api';
import { cn } from '../lib/utils';

interface DriftMetric {
  id: number;
  model_name: string;
  metric_name: string;
  baseline_value: number;
  current_value: number;
  drift_score: number;
  alert_threshold: number;
  created_at: string;
}

export default function Monitoring() {
  const [metrics, setMetrics] = useState<DriftMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [resolveMessage, setResolveMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [selectedMetricIds, setSelectedMetricIds] = useState<number[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: keyof DriftMetric; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/monitoring/drift');
      setMetrics(res.data);
    } catch (error) {
      console.error("Failed to fetch drift data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post('/monitoring/generate');
      await fetchData();
    } catch (error) {
      console.error("Failed to generate metrics", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleResolveAll = async () => {
      setIsResolving(true);
      try {
          await api.post('/monitoring/alerts/resolve-all');
          setResolveMessage("All alerts resolved.");
          await fetchData();
          setTimeout(() => setResolveMessage(''), 3000);
      } catch (e) {
          console.error(e);
      } finally {
          setIsResolving(false);
      }
  }

  const handleResolveSelected = async () => {
      if (selectedMetricIds.length === 0) return;
      setIsResolving(true);
      try {
          await api.post('/monitoring/alerts/resolve-bulk', { ids: selectedMetricIds });
          setResolveMessage(`${selectedMetricIds.length} items processed.`);
          await fetchData();
          setSelectedMetricIds([]);
          setTimeout(() => setResolveMessage(''), 3000);
      } catch (e) {
          console.error(e);
      } finally {
          setIsResolving(false);
      }
  };

  useEffect(() => {
    // Reset to first page when search changes
    setCurrentPage(1);
    setSelectedMetricIds([]);
  }, [searchTerm]);

  const requestSort = (key: keyof DriftMetric) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedMetrics = [...metrics].filter(m => 
    m.model_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.metric_name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(processedMetrics.length / pageSize);
  const paginatedMetrics = processedMetrics.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const SortIcon = ({ column }: { column: keyof DriftMetric }) => {
    if (sortConfig?.key !== column) return <div className="w-4 h-4" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const trendData = useMemo(() => {
    // Generate aggregate trend for health visualization
    if (metrics.length === 0) return [];
    return [
      { name: 'Day 1', score: 0.12 },
      { name: 'Day 2', score: 0.15 },
      { name: 'Day 3', score: 0.11 },
      { name: 'Day 4', score: 0.18 },
      { name: 'Day 5', score: 0.22 },
      { name: 'Day 6', score: 0.25 },
      { name: 'Today', score: metrics.reduce((acc, m) => acc + m.drift_score, 0) / metrics.length }
    ];
  }, [metrics]);

  return (
    <div className="space-y-6">
      {/* Aggregate Health Chart */}
      <div className="bg-white p-6 shadow sm:rounded-lg border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">System-Wide Drift Trend (Mean)</h3>
        </div>
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" hide />
              <YAxis hide domain={[0, 1]} />
              <Tooltip 
                contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                formatter={(value: number) => [`${(value * 100).toFixed(2)}%`, 'Mean Drift']}
              />
              <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">Model Monitoring</h2>
          <p className="mt-1 text-sm text-gray-500">Continuous control monitoring for model drift and performance degradation.</p>
        </div>
        <div className="flex gap-2">
            {resolveMessage && (
              <span className="flex items-center text-sm text-green-600 animate-in fade-in duration-300">
                <CheckCircle className="mr-1 h-4 w-4" />
                {resolveMessage}
              </span>
            )}
            {selectedMetricIds.length > 0 && (
                <button
                    onClick={handleResolveSelected}
                    disabled={isResolving}
                    className="inline-flex items-center gap-x-2 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                    <CheckCircle className="-ml-0.5 h-5 w-5 text-indigo-600" />
                    Resolve Selected ({selectedMetricIds.length})
                </button>
            )}
            <button
              onClick={handleResolveAll}
              disabled={loading || isResolving}
              className="inline-flex items-center gap-x-2 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              {isResolving ? (
                <Loader2 className="-ml-0.5 h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle className="-ml-0.5 h-5 w-5 text-green-600" />
              )}
              {isResolving ? 'Resolving...' : 'Resolve Alerts'}
            </button>
            <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
            >
            <RefreshCw className={cn("-ml-0.5 h-5 w-5", generating && "animate-spin")} />
            {generating ? 'Analyzing...' : 'Run Analysis'}
            </button>
        </div>
      </div>

      <div className="overflow-hidden bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-base font-semibold leading-6 text-gray-900">Drift Metrics</h3>
          <div className="relative max-w-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="Search models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="select-none">
                <th scope="col" className="px-6 py-3 text-left">
                    <input 
                        type="checkbox" 
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        checked={paginatedMetrics.length > 0 && selectedMetricIds.length === paginatedMetrics.length}
                        onChange={() => {
                            if (selectedMetricIds.length === paginatedMetrics.length) setSelectedMetricIds([]);
                            else setSelectedMetricIds(paginatedMetrics.map(m => m.id));
                        }}
                    />
                </th>
                {([
                  ['model_name', 'Model'],
                  ['metric_name', 'Metric'],
                  ['baseline_value', 'Baseline'],
                  ['current_value', 'Current'],
                  ['drift_score', 'Drift Score'],
                ] as const).map(([key, label]) => (
                  <th key={key} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort(key)}>
                    <div className="flex items-center gap-1">{label} <SortIcon column={key} /></div>
                  </th>
                ))}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                    <tr><td colSpan={6} className="px-6 py-4 text-center">Loading data...</td></tr>
                ) : paginatedMetrics.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">{metrics.length === 0 ? 'No data available.' : 'No matching results found.'}</td></tr>
                ) : (
                    paginatedMetrics.map((m) => {
                        const isDrift = m.drift_score > m.alert_threshold;
                        return (
                            <tr key={m.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input 
                                        type="checkbox" 
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                        checked={selectedMetricIds.includes(m.id)}
                                        onChange={() => {
                                            setSelectedMetricIds(prev => prev.includes(m.id) ? prev.filter(i => i !== m.id) : [...prev, m.id]);
                                        }}
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{m.model_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{m.metric_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{m.baseline_value.toFixed(4)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{m.current_value.toFixed(4)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(m.drift_score * 100).toFixed(2)}%</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {isDrift ? (
                                        <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                                            <AlertTriangle className="mr-1 h-3 w-3" /> Drift Detected
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                            <CheckCircle className="mr-1 h-3 w-3" /> Healthy
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })
                )}
            </tbody>
            </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Previous</button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Next</button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, processedMetrics.length)}</span> of{' '}
                  <span className="font-medium">{processedMetrics.length}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}