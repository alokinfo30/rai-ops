import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';

export default function TestComparison() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const test1Id = searchParams.get('test1');
  const test2Id = searchParams.get('test2');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!test1Id || !test2Id) {
            throw new Error("Missing test IDs");
        }
        const res = await api.get(`/redteam/test/compare?test1_id=${test1Id}&test2_id=${test2Id}`);
        setData(res.data.comparison);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Failed to fetch comparison');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [test1Id, test2Id]);

  if (loading) return <div className="p-8">Loading comparison...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  const { test1, test2 } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <ArrowLeft className="h-5 w-5 dark:text-gray-200" />
        </button>
        <h2 className="text-2xl font-bold dark:text-white">Test Comparison</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[test1, test2].map((test, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-2 text-indigo-600 dark:text-indigo-400">{test.test_name}</h3>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <p>ID: {test.id}</p>
                    <p>Date: {new Date(test.created_at).toLocaleString()}</p>
                    <p>Target: {test.target_system}</p>
                </div>
                
                <div className="space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Overall Score</p>
                        <p className="text-2xl font-bold dark:text-white">{(test.results?.overall_score * 100).toFixed(1)}%</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Risk Level</p>
                        <p className={cn("text-xl font-bold", 
                            test.results?.risk_level === 'Critical' ? 'text-red-600' : 
                            test.results?.risk_level === 'High' ? 'text-orange-600' : 'text-green-600'
                        )}>{test.results?.risk_level}</p>
                    </div>
                    
                    <div>
                        <h4 className="font-semibold mb-2 dark:text-gray-200">Vulnerabilities ({test.results?.vulnerabilities_found?.length || 0})</h4>
                        <ul className="space-y-2">
                            {test.results?.vulnerabilities_found?.map((v: any, i: number) => (
                                <li key={i} className="text-sm p-3 border dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900">
                                    <div className="flex justify-between">
                                        <span className="font-medium dark:text-gray-200">{v.type}</span>
                                        <span className={cn("text-xs px-2 py-0.5 rounded", 
                                          v.severity === 'Critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                        )}>{v.severity}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{v.description}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}