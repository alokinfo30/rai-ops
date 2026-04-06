import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Shield, AlertTriangle, CheckCircle, RefreshCcw, ExternalLink } from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';

interface Stats {
  securityTests: number;
  activeAlerts: number;
  modelsMonitored: number;
  complianceScore: number;
}

interface ActivityItem {
  activity_type: string;
  description: string;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [vulnerabilityTrend, setVulnerabilityTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const [statsRes, chartRes, activityRes, trendRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/chart-data'),
        api.get('/dashboard/recent-activity?per_page=5'),
        api.get('/dashboard/vulnerability-trend')
      ]);

      setStats(statsRes.data);
      const formattedChartData = chartRes.data?.labels ? chartRes.data.labels.map((label: string, index: number) => ({
        name: label,
        tests: chartRes.data.tests?.[index] || 0,
        alerts: chartRes.data.alerts?.[index] || 0
      })) : [];
      setChartData(formattedChartData);
      setActivities(activityRes.data.activities);
      setVulnerabilityTrend(trendRes.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  const formattedTrendData = useMemo(() => {
    const grouped: Record<string, any> = {};
    vulnerabilityTrend.forEach(item => {
      if (!grouped[item.date]) grouped[item.date] = { date: item.date };
      grouped[item.date][item.status] = item.count;
    });
    return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [vulnerabilityTrend]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-lg dark:bg-gray-800 dark:border-gray-700">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">
            {new Date(label).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs font-medium" style={{ color: entry.color }}>
              {entry.name}: <span className="font-bold">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const cards = [
    { name: 'Compliance Score', value: `${stats?.complianceScore ?? 0}%`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { name: 'Active Alerts', value: stats?.activeAlerts ?? 0, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', link: '/monitoring' },
    { name: 'Security Tests', value: stats?.securityTests ?? 0, icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-50', link: '/red-team' },
    { name: 'Models Monitored', value: stats?.modelsMonitored ?? 0, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50', link: '/monitoring' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Governance Overview</h2>
        <button 
          onClick={() => fetchData(true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.name} className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow transition-colors">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={cn("rounded-md p-3", card.bg)}>
                    <card.icon className={cn("h-6 w-6", card.color)} />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">{card.name}</dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {card.link ? <Link to={card.link} className="hover:underline">{card.value}</Link> : card.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Activity Chart */}
        <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow lg:col-span-2 transition-colors">
          <h3 className="mb-4 text-base font-semibold leading-6 text-gray-900 dark:text-white">7-Day Activity Trend</h3>
          <div className="h-80 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="tests" stroke="#4f46e5" fillOpacity={1} fill="url(#colorTests)" name="Security Tests" />
                <Area type="monotone" dataKey="alerts" stroke="#d97706" fillOpacity={1} fill="url(#colorAlerts)" name="Alerts" />
              </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">No chart data available</div>
            )}
          </div>
        </div>

        {/* Vulnerability Status Trend */}
        <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow transition-colors">
          <h3 className="mb-4 text-base font-semibold leading-6 text-gray-900 dark:text-white">Vulnerability Remediation</h3>
          <div className="h-80 w-full">
            {formattedTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                  <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="new" stackId="a" fill="#ef4444" name="New" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="in_progress" stackId="a" fill="#f59e0b" name="In Progress" />
                  <Bar dataKey="resolved" stackId="a" fill="#10b981" name="Resolved" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-lg">
                No remediation data available
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="rounded-lg bg-white dark:bg-gray-800 shadow transition-colors lg:col-span-3">
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">Recent Activity</h3>
            <Link to="/reports" className="text-xs text-indigo-600 hover:text-indigo-500 font-medium">View All</Link>
          </div>
          <ul role="list" className="divide-y divide-gray-100 dark:divide-gray-700 px-4 sm:px-6">
            {activities.length === 0 ? (
              <li className="py-4 text-center text-sm text-gray-500">No recent activity</li>
            ) : (
              activities.map((item, idx) => (
                <li key={idx} className="flex gap-x-4 py-4">
                  <div className="min-w-0 flex-auto group">
                    <div className="flex items-center gap-x-2">
                      <Link 
                        to={item.activity_type === 'test' ? '/red-team' : '/monitoring'} 
                        className="text-sm font-semibold leading-6 text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                      >
                        {item.description}
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <span className={cn(
                        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                        item.status === 'completed' || item.status === 'SUCCESS' ? "bg-green-50 text-green-700 ring-green-600/20" : 
                        item.status === 'failed' ? "bg-red-50 text-red-700 ring-red-600/20" : "bg-gray-50 text-gray-600 ring-gray-500/10"
                      )}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs leading-5 text-gray-500">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}