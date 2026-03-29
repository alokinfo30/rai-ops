import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Plus, FileText, Loader2, AlertCircle, Eye, GitCompare, Trash2, Search } from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';

interface Test {
  id: number;
  test_name: string;
  test_type: string;
  target_system: string;
  status: string;
  created_at: string;
  results?: any;
}

export default function RedTeam() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningTestId, setRunningTestId] = useState<number | null>(null);
  const [testProgress, setTestProgress] = useState<number>(0);
  const [updatingVulnId, setUpdatingVulnId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const [selectedTests, setSelectedTests] = useState<number[]>([]);
  const [selectedTestDetails, setSelectedTestDetails] = useState<Test | null>(null);

  // New Test Form State
  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTest, setNewTest] = useState({ test_name: '', test_type: 'Prompt Injection', target_system: '' });
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTests = tests.filter(test => 
    (statusFilter === 'all' || test.status === statusFilter) &&
    (test.test_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     test.target_system.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const fetchTests = async () => {
    try {
      const res = await api.get('/redteam/tests?per_page=20');
      setTests(res.data.tests);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await api.post('/redteam/test', newTest);
      setNewTest({ test_name: '', test_type: 'Prompt Injection', target_system: '' });
      setShowForm(false);
      fetchTests();
    } catch (err) {
      console.error("Failed to create test", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRun = async (id: number) => {
    setRunningTestId(id);
    setTestProgress(0);
    
    // Simulate progress for the prototype's functional feel
    const interval = setInterval(() => {
      setTestProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.floor(Math.random() * 15);
      });
    }, 800);

    try {
      await api.post(`/redteam/test/${id}/run`);
      setTestProgress(100);
      setTimeout(() => setRunningTestId(null), 500);
      fetchTests();
    } catch (err) {
      console.error("Failed to run test", err);
      setRunningTestId(null);
    } finally {
      clearInterval(interval);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this test? All results will be lost.")) return;
    setDeletingId(id);
    try {
      await api.delete(`/redteam/test/${id}`);
      setTests(tests.filter(t => t.id !== id));
    } catch (err) {
      console.error("Failed to delete test", err);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedTests.includes(id)) {
      setSelectedTests(selectedTests.filter(tid => tid !== id));
    } else {
      if (selectedTests.length < 2) {
        setSelectedTests([...selectedTests, id]);
      }
    }
  };

  const updateVulnerabilityStatus = async (description: string, status: string) => {
    if (!selectedTestDetails) return;
    
    setUpdatingVulnId(description);
    // Optimistic UI Update
    const originalDetails = { ...selectedTestDetails };
    const updatedVulns = selectedTestDetails.results?.vulnerabilities_found?.map((v: any) => 
        v.description === description ? { ...v, status } : v
    );
    
    setSelectedTestDetails({
        ...selectedTestDetails,
        results: { ...selectedTestDetails.results, vulnerabilities_found: updatedVulns }
    });

    try {
      await api.post(`/redteam/test/${selectedTestDetails.id}/vulnerability/update`, {
        description,
        status
      });
    } catch (err) {
      console.error(err);
      // Rollback on error
      setSelectedTestDetails(originalDetails);
    } finally {
      setUpdatingVulnId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">Red Team Lab</h2>
          <p className="mt-1 text-sm text-gray-500">Manage and execute adversarial attacks against your AI models.</p>
        </div>
        <div className="flex gap-2">
          {selectedTests.length === 2 && (
            <button
              onClick={() => navigate(`/red-team/compare?test1=${selectedTests[0]}&test2=${selectedTests[1]}`)}
              className="inline-flex items-center gap-x-2 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <GitCompare className="-ml-0.5 h-5 w-5" />
              Compare ({selectedTests.length})
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <Plus className="-ml-0.5 h-5 w-5" />
            New Test
          </button>
        </div>
      </div>

      {/* Creation Form */}
      {showForm && (
        <div className="rounded-lg bg-gray-50 p-6 shadow-sm border border-gray-200">
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-4 items-end">
             <div>
               <label className="block text-sm font-medium text-gray-900">Test Name</label>
               <input type="text" required value={newTest.test_name} onChange={e => setNewTest({...newTest, test_name: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 sm:text-sm sm:leading-6" placeholder="e.g. Alpha Model Injection" />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-900">Type</label>
               <select value={newTest.test_type} onChange={e => setNewTest({...newTest, test_type: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6">
                 <option>Prompt Injection</option>
                 <option>PII Leakage</option>
                 <option>Jailbreak</option>
                 <option>Hallucination Induction</option>
                 <option>Deepfake Detection</option>
               </select>
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-900">Target System</label>
               <input type="text" required value={newTest.target_system} onChange={e => setNewTest({...newTest, target_system: e.target.value})} className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 sm:text-sm sm:leading-6" placeholder="e.g. GPT-4 Proxy" />
             </div>
             <button type="submit" disabled={isCreating} className="inline-flex justify-center items-center gap-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 min-w-[120px]">
               {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
               Save Test
             </button>
          </form>
        </div>
      )}

      {/* Tests List */}
      <div className="overflow-hidden bg-white shadow sm:rounded-md">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Test Inventory</h3>
            {statusFilter !== 'all' && (
              <button 
                onClick={() => setStatusFilter('all')}
                className="text-xs text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Clear Filter
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Filter Status:</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 py-1"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
        <ul role="list" className="divide-y divide-gray-200">
          {loading ? <li className="p-4 text-center">Loading tests...</li> : filteredTests.length === 0 ? <li className="p-4 text-center text-gray-500">{tests.length === 0 ? 'No tests found.' : 'No tests matching current filter.'}</li> : filteredTests.map((test) => (
            <li key={test.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center h-full mr-4">
                  <input
                    type="checkbox"
                    title={!selectedTests.includes(test.id) && selectedTests.length >= 2 ? "Select maximum 2 tests for comparison" : ""}
                    disabled={!selectedTests.includes(test.id) && selectedTests.length >= 2}
                    checked={selectedTests.includes(test.id)}
                    onChange={() => toggleSelect(test.id)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  />
                </div>

                <div className="min-w-0 flex-1">
                   <div className="flex items-center gap-x-3">
                     <p className="truncate text-sm font-medium text-indigo-600">{test.test_name}</p>
                     <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset", 
                        test.status === 'completed' ? "bg-green-50 text-green-700 ring-green-600/20" :
                        test.status === 'running' ? "bg-blue-50 text-blue-700 ring-blue-600/20" :
                        "bg-yellow-50 text-yellow-800 ring-yellow-600/20"
                     )}>
                       {test.status}
                     </span>
                   </div>
                   <div className="mt-2 flex items-center text-sm text-gray-500 gap-x-4">
                     <span>{test.test_type}</span>
                     <span>&bull;</span>
                     <span>Target: {test.target_system}</span>
                     <span>&bull;</span>
                     <span>{new Date(test.created_at).toLocaleDateString()}</span>
                     {test.results?.vulnerabilities_found?.length > 0 && (
                       <>
                         <span>&bull;</span>
                         <span className="text-red-600 font-semibold">{test.results.vulnerabilities_found.length} Vulns</span>
                       </>
                     )}
                   </div>
                </div>
                <div className="flex items-center gap-x-2">
                  {test.status === 'pending' || test.status === 'completed' || test.status === 'failed' ? (
                    <button 
                      onClick={() => handleRun(test.id)} 
                      disabled={runningTestId === test.id}
                      className="rounded bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-600 shadow-sm hover:bg-indigo-100 disabled:opacity-50"
                    >
                      {runningTestId === test.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <div className="flex items-center gap-1"><Play className="h-3 w-3" /> Run</div>}
                    </button>
                  ) : null}
                  {test.results && (
                    <button 
                      onClick={() => setSelectedTestDetails(test)}
                      className="rounded bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600 shadow-sm hover:bg-gray-100 flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" /> Review
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(test.id)}
                    disabled={deletingId === test.id || runningTestId === test.id}
                    className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                    title="Delete Test"
                  >
                    {deletingId === test.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Vulnerability Details Modal */}
      {selectedTestDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold dark:text-white">{selectedTestDetails.test_name} Results</h3>
                    <button onClick={() => setSelectedTestDetails(null)}><AlertCircle className="h-6 w-6 text-gray-400 hover:text-gray-500" /></button>
                </div>
                
                <div className="space-y-4">
                    {selectedTestDetails.results?.vulnerabilities_found?.map((vuln: any, idx: number) => (
                        <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="font-semibold text-gray-900 dark:text-white">{vuln.type}</span>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{vuln.description}</p>
                                </div>
                                <span className={cn("px-2 py-1 rounded text-xs font-medium", vuln.severity === 'Critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800')}>{vuln.severity}</span>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
                                <select 
                                    value={vuln.status || 'new'} 
                                    disabled={updatingVulnId === vuln.description}
                                    onChange={(e) => updateVulnerabilityStatus(vuln.description, e.target.value)}
                                    className="text-sm border-gray-300 rounded px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
                                >
                                    <option value="new">New</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="false_positive">False Positive</option>
                                </select>
                                {updatingVulnId === vuln.description && <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />}
                            </div>
                        </div>
                    ))}
                    {(!selectedTestDetails.results?.vulnerabilities_found || selectedTestDetails.results?.vulnerabilities_found.length === 0) && (
                        <p className="text-gray-500 dark:text-gray-400">No vulnerabilities found.</p>
                    )}
                </div>
                
                <div className="mt-6 flex justify-end gap-2">
                     <a href={`/api/redteam/test/${selectedTestDetails.id}/export/pdf`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-100">
                        <FileText className="h-4 w-4" /> Download Report
                     </a>
                     <button onClick={() => setSelectedTestDetails(null)} className="rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200">Close</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}