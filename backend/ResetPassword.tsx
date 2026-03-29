import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
        setError("Invalid or missing reset token. Please request a new link.");
        return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="mt-4 text-2xl font-bold text-gray-900">Password Reset Complete</h2>
                <p className="mt-2 text-gray-600">Your password has been updated successfully. Redirecting to login...</p>
                <Link to="/login" className="mt-6 inline-block text-indigo-600 hover:text-indigo-500 font-medium">Click here if you are not redirected</Link>
            </div>
        </div>
      );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Reset Password</h2>
          <p className="mt-2 text-sm text-gray-600">Enter your new password below</p>
        </div>

        {error && (
            <div className="rounded-md bg-red-50 p-4 flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
            </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="-space-y-px rounded-md shadow-sm">
            <input name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="relative block w-full rounded-t-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" placeholder="New Password" />
            <input name="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="relative block w-full rounded-b-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" placeholder="Confirm New Password" />
          </div>

          <div>
            <button type="submit" disabled={isSubmitting} className={cn("group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600", isSubmitting && "opacity-50 cursor-not-allowed")}>
              {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}