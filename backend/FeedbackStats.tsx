import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../lib/api';

interface FeedbackStat {
  page_context: string;
  count: number;
}

export default function FeedbackStats() {
  const [data, setData] = useState<FeedbackStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/feedback');
        // Aggregate counts locally for this widget since the API returns raw list
        // In a real app, you'd likely have a dedicated stats endpoint
        const counts: Record<string, number> = {};
        res.data.forEach((item: any) => {
          const page = item.page_context || 'Unknown';
          counts[page] = (counts[page] || 0) + 1;
        });

        const chartData = Object.entries(counts).map(([page, count]) => ({
          page_context: page,
          count,
        }));
        
        setData(chartData);
      } catch (error) {
        console.error("Failed to fetch feedback stats", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="h-64 flex items-center justify-center">Loading Stats...</div>;
  if (data.length === 0) return <div className="h-64 flex items-center justify-center text-gray-500">No feedback data available.</div>;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis dataKey="page_context" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip 
          contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
          cursor={{ fill: 'transparent' }}
        />
        <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}