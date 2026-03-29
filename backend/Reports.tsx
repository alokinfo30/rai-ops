import { useState } from 'react';
import { FileText, Download, Mail, Check, AlertCircle, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';

export default function Reports() {
  const [downloading, setDownloading] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setMessage(null);
    try {
      const response = await api.get('/reports/compliance/pdf', {
        responseType: 'blob',
      });
      
      // Create a blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `compliance_report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setMessage({ type: 'success', text: 'Report downloaded successfully.' });
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to download report.' });
    } finally {
      setDownloading(false);
    }
  };

  const handleEmail = async () => {
    setEmailing(true);
    setMessage(null);
    try {
      await api.post('/reports/compliance/email');
      setMessage({ type: 'success', text: 'Report has been queued for email delivery.' });
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to send email.' });
    } finally {
      setEmailing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">Reports Center</h2>
        <p className="mt-1 text-sm text-gray-500">Generate and distribute compliance and audit reports.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-white shadow overflow-hidden border border-gray-100">
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 rounded-lg">
                <FileText className="h-8 w-8 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Compliance Summary</h3>
                <p className="text-sm text-gray-500">Full audit trail of all tests and logs.</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <button onClick={handleDownload} disabled={downloading} className="flex items-center justify-center gap-2 w-full rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50">
                {downloading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4" />}
                Download PDF
              </button>
              <button onClick={handleEmail} disabled={emailing} className="flex items-center justify-center gap-2 w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50">
                {emailing ? <Loader2 className="h-4 w-4 animate-spin"/> : <Mail className="h-4 w-4" />}
                Email Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className={cn("rounded-md p-4", message.type === 'success' ? "bg-green-50" : "bg-red-50")}>
          <div className="flex">
            <div className="flex-shrink-0">
              {message.type === 'success' ? (
                <Check className="h-5 w-5 text-green-400" aria-hidden="true" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
              )}
            </div>
            <div className="ml-3">
              <p className={cn("text-sm font-medium", message.type === 'success' ? "text-green-800" : "text-red-800")}>
                {message.text}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}