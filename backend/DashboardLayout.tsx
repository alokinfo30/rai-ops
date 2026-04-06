import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../ThemeContext';
import { Activity, BookOpen, FileText, LayoutDashboard, LogOut, Menu, Moon, Settings, ShieldAlert, Sun, User as UserIcon, MessageSquare, X, Send, ShieldCheck, Bell } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function DashboardLayout() {
  const { logout, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Red Team Lab', href: '/red-team', icon: ShieldAlert },
    { name: 'Monitoring', href: '/monitoring', icon: Activity },
    { name: 'Knowledge Base', href: '/knowledge', icon: BookOpen },
    { name: 'Reports', href: '/reports', icon: FileText },
  ];

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingFeedback(true);
    try {
      await api.post('/feedback', { message: feedbackText, page_context: location.pathname });
      setFeedbackSuccess(true);
      setFeedbackText("");
      setTimeout(() => {
        setFeedbackOpen(false);
        setFeedbackSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      alert("Sorry, something went wrong while submitting your feedback.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      try {
        const res = await api.get('/notifications');
        const count = res.data.filter((n: any) => !n.is_read).length;
        setUnreadCount(count);
      } catch (error) {
        console.error("Failed to fetch notifications", error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 dark:text-gray-100 transition-colors duration-300">
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={cn("fixed inset-y-0 z-50 flex w-72 flex-col bg-gray-900 transition-transform lg:translate-x-0", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-16 shrink-0 items-center px-6 text-white font-bold text-xl tracking-wider">
          RAI OPS
        </div>
        <nav className="flex flex-1 flex-col px-6 pb-4">
          <ul className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul className="-mx-2 space-y-1">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <Link to={item.href} onClick={() => setSidebarOpen(false)} className={cn("group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6", location.pathname === item.href ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800")}>
                      <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                      {item.name}
                    </Link>
                  </li>
                ))}
                {user?.role === 'admin' && (
                  <li>
                    <Link to="/admin/feedback" onClick={() => setSidebarOpen(false)} className={cn("group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6", location.pathname === '/admin/feedback' ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800")}>
                      <ShieldCheck className="h-6 w-6 shrink-0" aria-hidden="true" /> Admin
                    </Link>
                  </li>
                )}
              </ul>
            </li>
            <li className="mt-auto">
              <Link to="/settings" className={cn("group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6", location.pathname === '/settings' ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800")}>
                  <Settings className="h-6 w-6 shrink-0" />
                  Settings
              </Link>
              <div className="flex items-center gap-x-4 py-3 text-sm font-semibold leading-6 text-white">
                <Link to="/profile" className="flex items-center gap-x-2 truncate hover:underline text-left">
                  <UserIcon className="h-5 w-5" /> {user?.username}
                </Link>
                <Link to="/profile" className="relative text-gray-400 hover:text-white" title="Notifications">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </Link>
                <button 
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
                  className="text-gray-400 hover:text-white"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
                <button onClick={logout} title="Sign out" className="ml-auto text-gray-400 hover:text-white"><LogOut className="h-5 w-5" /></button>
              </div>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:hidden">
          <button type="button" className="-m-2.5 p-2.5 text-gray-700 lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-6 w-6" /></button>
          <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">RAI Ops Platform</div>
        </div>
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Feedback Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        {feedbackOpen ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-72 border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-sm">Send Feedback</h3>
              <button onClick={() => setFeedbackOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            {feedbackSuccess ? (
              <div className="py-4 text-center text-green-600 flex flex-col items-center gap-2">
                <ShieldCheck className="h-8 w-8" />
                <p className="text-sm font-medium">Thank you for your feedback!</p>
              </div>
            ) : (
            <form onSubmit={handleFeedbackSubmit}>
              <textarea
                className="w-full text-sm p-2 border rounded-md mb-2 bg-gray-50 dark:bg-gray-900 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none disabled:opacity-50"
                rows={3}
                placeholder="Tell us what you think..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                disabled={isSubmittingFeedback}
                required
              />
              <button
                type="submit"
                disabled={isSubmittingFeedback}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isSubmittingFeedback ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                {isSubmittingFeedback ? 'Sending...' : 'Submit'}
              </button>
            </form>
            )}
          </div>
        ) : (
          <button
            onClick={() => setFeedbackOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center"
            title="Send Feedback"
          >
            <MessageSquare className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  );
}