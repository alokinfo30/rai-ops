import { useEffect, useState } from 'react';
import { AlertCircle, Check, Loader2, Save } from 'lucide-react';

import { useAuth } from './context/AuthContext';
import api from './lib/api';

export default function Profile() {
  const { user, fetchUser } = useAuth();
  const [infoData, setInfoData] = useState({ email: "", company: "" });
  const [passwordData, setPasswordData] = useState({ password: "", confirmPassword: "" });

  const [infoMessage, setInfoMessage] = useState("");
  const [infoError, setInfoError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setInfoData({ email: user.email, company: user.company || "" });
    }
  }, [user]);

  const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInfoData({ ...infoData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingInfo(true);
    setInfoError("");
    setInfoMessage("");
    try {
      await api.put("/auth/profile", infoData);
      setInfoMessage("Profile information updated successfully.");
      if (fetchUser) fetchUser();
    } catch (err: any) {
      setInfoError(err.response?.data?.error || "Failed to update profile.");
    } finally {
      setIsSavingInfo(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (passwordData.password !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setIsSavingPassword(true);
    try {
      await api.put("/auth/profile", { password: passwordData.password });
      setPasswordMessage("Password updated successfully.");
      setPasswordData({ password: "", confirmPassword: "" });
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || "Failed to update password.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">My Profile</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your account details and password.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">User Information</h3>
        <form onSubmit={handleInfoSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
            <input
              type="email"
              name="email"
              value={infoData.email}
              onChange={handleInfoChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company</label>
            <input
              type="text"
              name="company"
              value={infoData.company}
              onChange={handleInfoChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
            />
          </div>
          <div className="flex items-center justify-between">
            <button type="submit" disabled={isSavingInfo} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50">
              {isSavingInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Information
            </button>
            {infoMessage && <span className="text-sm text-green-600 flex items-center"><Check className="h-4 w-4 mr-1"/>{infoMessage}</span>}
            {infoError && <span className="text-sm text-red-600 flex items-center"><AlertCircle className="h-4 w-4 mr-1"/>{infoError}</span>}
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Change Password</h3>
        <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
            <input
              type="password"
              name="password"
              value={passwordData.password}
              onChange={handlePasswordChange}
              placeholder="••••••••"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              placeholder="••••••••"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <button type="submit" disabled={isSavingPassword} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50">
              {isSavingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Update Password
            </button>
            {passwordMessage && <span className="text-sm text-green-600 flex items-center"><Check className="h-4 w-4 mr-1"/>{passwordMessage}</span>}
            {passwordError && <span className="text-sm text-red-600 flex items-center"><AlertCircle className="h-4 w-4 mr-1"/>{passwordError}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}