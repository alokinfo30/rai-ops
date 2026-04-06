import { useEffect, useState } from 'react';
import { Bell, Mail } from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';

interface Notification {
    id: number;
    message: string;
    timestamp: string;
    is_read: boolean;
}

export default function Notifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleMarkAsRead = async (id: number) => {
        try {
            await api.post(`/notifications/${id}/read`);
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error("Failed to mark notification as read", error);
        }
    };
    
    const handleMarkAllAsRead = async () => {
        try {
            await api.post('/notifications/read-all');
            fetchNotifications(); // Re-fetch to confirm all are marked as read
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    };

    if (loading) return <div className="p-8">Loading notifications...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">Notifications</h2>
                <button 
                    onClick={handleMarkAllAsRead}
                    className="inline-flex items-center gap-x-2 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                    <Mail className="-ml-0.5 h-5 w-5" />
                    Mark All As Read
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
                <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
                    {notifications.length === 0 ? (
                        <li className="px-6 py-4 text-center text-gray-500">You have no notifications.</li>
                    ) : (
                        notifications.map((notification) => (
                            <li key={notification.id} className={cn("flex items-center justify-between gap-x-6 px-6 py-5", !notification.is_read && "bg-indigo-50 dark:bg-indigo-900/20")}>
                                <div className="flex items-start gap-x-4">
                                    <Bell className="h-6 w-6 flex-none text-gray-400" />
                                    <div className="min-w-0 flex-auto">
                                        <p className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">{notification.message}</p>
                                        <p className="mt-1 flex text-xs leading-5 text-gray-500 dark:text-gray-400">{new Date(notification.timestamp).toLocaleString()}</p>
                                    </div>
                                </div>
                                {!notification.is_read && (
                                    <button onClick={() => handleMarkAsRead(notification.id)} className="rounded-full bg-white dark:bg-gray-700 px-2.5 py-1 text-xs font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        Mark as read
                                    </button>
                                )}
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}