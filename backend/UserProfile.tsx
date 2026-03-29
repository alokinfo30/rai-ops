import { X, User, Briefcase, Mail, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const { user } = useAuth();

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-gray-200">
        <div className="relative bg-indigo-600 px-4 py-6 sm:px-6">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-indigo-500 p-1 text-indigo-100 hover:bg-indigo-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-3xl font-bold text-indigo-600">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <h2 className="mt-4 text-xl font-bold text-white">{user.username}</h2>
            <p className="text-indigo-200">{user.email}</p>
          </div>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <dl className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <dt className="flex items-center text-sm font-medium text-gray-500">
                <Briefcase className="mr-2 h-4 w-4" /> Role
              </dt>
              <dd className="text-sm font-semibold text-gray-900">{user.role || 'User'}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
               <dt className="flex items-center text-sm font-medium text-gray-500">
                <Calendar className="mr-2 h-4 w-4" /> Member Since
              </dt>
              <dd className="text-sm text-gray-900">{new Date().getFullYear()}</dd>
            </div>
          </dl>
          <button onClick={onClose} className="mt-6 w-full rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200">Close</button>
        </div>
      </div>
    </div>
  );
}