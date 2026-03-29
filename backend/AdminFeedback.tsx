import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Download, MessageSquareOff, Loader2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import api from './lib/api';
import FeedbackStats from './FeedbackStats';

interface Feedback {
    id: number;
    username: string;
    message: string;
    page_context: string;
    timestamp: string;
}

export default function AdminFeedback() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 5;

    const filteredFeedback = feedback.filter(f => 
        f.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.page_context.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredFeedback.length / pageSize);
    const paginatedFeedback = filteredFeedback.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => {
        if (user?.role !== 'admin') {
            navigate('/dashboard'); // Redirect if not admin
            return;
        }

        const fetchFeedback = async () => {
            try {
                const res = await api.get('/feedback');
                setFeedback(res.data);
            } catch (error) {
                console.error("Failed to fetch feedback", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFeedback();
    }, [user, navigate]);

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this feedback?")) return;
        setDeletingId(id);
        setSelectedIds(prev => prev.filter(i => i !== id));
        try {
            await api.delete(`/feedback/${id}`);
            setFeedback(feedback.filter(f => f.id !== id));
        } catch (error) {
            console.error("Failed to delete feedback", error);
        } finally {
            setDeletingId(null);
        }
    };

    const handleToggleSelect = (id: number) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleToggleSelectAll = () => {
        if (selectedIds.length === paginatedFeedback.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(paginatedFeedback.map(f => f.id));
        }
    };

    const handleDeleteSelected = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} items?`)) return;
        setIsBulkDeleting(true);
        try {
            await Promise.all(selectedIds.map(id => api.delete(`/feedback/${id}`)));
            setFeedback(feedback.filter(f => !selectedIds.includes(f.id)));
            setSelectedIds([]);
        } catch (error) {
            console.error("Failed to delete selected feedback", error);
        } finally {
            setIsBulkDeleting(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds([]);
    }, [searchTerm]);

    if (loading) return <div className="p-8">Loading feedback...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">User Feedback Submissions</h2>
                <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                        <button 
                            onClick={handleDeleteSelected}
                            disabled={isBulkDeleting}
                            className="inline-flex items-center gap-x-2 rounded-md bg-red-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
                        >
                            {isBulkDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                            Delete Selected ({selectedIds.length})
                        </button>
                    )}
                    <a 
                        href="/api/feedback/export/csv" 
                        className="inline-flex items-center gap-x-2 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        download
                    >
                        <Download className="-ml-0.5 h-5 w-5" />
                        Export CSV
                    </a>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Feedback by Page</h3>
                <FeedbackStats />
            </div>

            <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative max-w-xs">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
                        </div>
                        <input
                            type="text"
                            className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-700 dark:ring-gray-600 dark:text-white"
                            placeholder="Search feedback..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left">
                                <input 
                                    type="checkbox" 
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                    checked={paginatedFeedback.length > 0 && selectedIds.length === paginatedFeedback.length}
                                    onChange={handleToggleSelectAll}
                                />
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Message</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Page Context</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredFeedback.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <MessageSquareOff className="h-8 w-8 text-gray-300" />
                                        <span>{feedback.length === 0 ? 'No feedback submissions found.' : 'No matching results.'}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                        paginatedFeedback.map((item) => (
                            <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input 
                                        type="checkbox" 
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                        checked={selectedIds.includes(item.id)}
                                        onChange={() => handleToggleSelect(item.id)}
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(item.timestamp).toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.username}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{item.message}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">{item.page_context}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button 
                                        onClick={() => handleDelete(item.id)} 
                                        disabled={deletingId === item.id}
                                        className="text-red-600 hover:text-red-900 dark:hover:text-red-400 disabled:opacity-50"
                                    >
                                        {deletingId === item.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                                    </button>
                                </td>
                            </tr>
                        ))
                        )}
                    </tbody>
                </table>
                
                {filteredFeedback.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredFeedback.length)} of {filteredFeedback.length}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                            ><ChevronLeft className="h-4 w-4" /></button>
                            <button 
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                            ><ChevronRight className="h-4 w-4" /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}