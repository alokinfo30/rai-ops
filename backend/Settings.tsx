import { useEffect, useState } from 'react';
import { Save, Loader2, Check } from 'lucide-react';
import api from '../lib/api';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    alert_threshold: 80,
    email_notifications: true,
    digest_frequency: 'daily',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        setSettings(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.post('/settings', settings);
      setMessage('Settings saved successfully.');
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      console.error(e);
      setMessage('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">Global Settings</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Configure platform-wide thresholds and notifications.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Alert Threshold (%)</label>
            <div className="mt-1">
              <input
                type="number"
                min="0"
                max="100"
                value={settings.alert_threshold}
                onChange={e => setSettings({...settings, alert_threshold: parseInt(e.target.value)})}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
              />
              <p className="mt-1 text-xs text-gray-500">Trigger alerts when model drift score exceeds this value.</p>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="email_notifications"
              type="checkbox"
              checked={settings.email_notifications}
              onChange={e => setSettings({...settings, email_notifications: e.target.checked})}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="email_notifications" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Enable Email Notifications</label>
          </div>

          <div className="pt-4">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
            {message && <span className="ml-4 text-sm text-green-600 flex-inline items-center"><Check className="h-4 w-4 inline mr-1"/>{message}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}