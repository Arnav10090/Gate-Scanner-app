import React from 'react';
import { CheckCircle, XCircle, User, Phone, Truck, Globe, FileText, AlertCircle, Send } from 'lucide-react';

export default function VerificationDetails({ submission, onApprove, onReject, onCancel, loading, error }) {
  const statusBadge = (status) => {
    const map = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      verified: 'bg-blue-100 text-blue-800 border-blue-300',
      completed: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
    };
    return <span className={`px-2 py-1 text-xs rounded border ${map[status] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>{status}</span>;
  };

  return (
    <div className="w-full bg-white rounded-lg shadow p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Submission Details</h3>
        </div>
        {statusBadge(submission.status)}
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded p-4">
          <p className="text-xs uppercase text-gray-500">Company</p>
          <p className="text-base font-medium">{submission.companyName || '—'}</p>
        </div>
        <div className="bg-gray-50 rounded p-4">
          <p className="text-xs uppercase text-gray-500">Vehicle Number</p>
          <p className="text-2xl md:text-3xl font-bold tracking-wide text-gray-900">{submission.vehicleNumber || '—'}</p>
        </div>
        <div className="bg-gray-50 rounded p-4">
          <p className="text-xs uppercase text-gray-500 flex items-center gap-1"><User className="w-4 h-4" /> Driver</p>
          <p className="text-base font-medium">{submission.driverName || '—'}</p>
          <p className="text-gray-700 flex items-center gap-1 mt-1"><Phone className="w-4 h-4" /> {submission.driverPhone || '—'}</p>
        </div>
        <div className="bg-gray-50 rounded p-4">
          <p className="text-xs uppercase text-gray-500">Helper</p>
          <p className="text-base font-medium">{submission.helperName || '—'}</p>
          <p className="text-gray-700 flex items-center gap-1 mt-1"><Phone className="w-4 h-4" /> {submission.helperPhone || '—'}</p>
        </div>
        <div className="bg-gray-50 rounded p-4">
          <p className="text-xs uppercase text-gray-500 flex items-center gap-1"><Globe className="w-4 h-4" /> Preferred Language</p>
          <p className="text-base font-medium">{submission.preferredLanguage || '—'}</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> Uploaded Documents</p>
        <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {(submission.documents || []).map((doc, idx) => (
            <li key={idx} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">{doc}</span>
            </li>
          ))}
          {(!submission.documents || submission.documents.length === 0) && (
            <li className="text-sm text-gray-600">No documents listed.</li>
          )}
        </ul>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {error}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={onApprove}
          disabled={loading || submission.status === 'completed' || submission.status === 'rejected'}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-60"
        >
          <Send className="w-4 h-4" /> Approve & Send Token
        </button>
        <button
          onClick={onReject}
          disabled={loading || submission.status === 'completed'}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-60"
        >
          <XCircle className="w-4 h-4" /> Reject
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
