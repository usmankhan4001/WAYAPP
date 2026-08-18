'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import { X, Upload, CheckCircle2, AlertCircle, FileSpreadsheet, ArrowRight } from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: any[];
  tags: any[];
  onImported: () => void;
}

export function CsvImportModal({ isOpen, onClose, groups, tags, onImported }: CsvImportModalProps) {
  const [step, setStep] = useState<'UPLOAD' | 'MAP' | 'IMPORTING' | 'DONE'>('UPLOAD');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<{
    phoneNumber: string;
    firstName: string;
    lastName: string;
    email: string;
  }>({
    phoneNumber: '',
    firstName: '',
    lastName: '',
    email: '',
  });

  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedTagId, setSelectedTagId] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          setError('The uploaded CSV file is empty.');
          return;
        }

        const cols = Object.keys(results.data[0] as object);
        setHeaders(cols);
        setParsedRows(results.data);

        // Auto-guess column mappings
        const mapping = { phoneNumber: '', firstName: '', lastName: '', email: '' };
        cols.forEach((col) => {
          const lower = col.toLowerCase();
          if (lower.includes('phone') || lower.includes('mobile') || lower.includes('whatsapp') || lower.includes('tel')) {
            mapping.phoneNumber = col;
          } else if (lower.includes('first') || lower === 'name') {
            mapping.firstName = col;
          } else if (lower.includes('last')) {
            mapping.lastName = col;
          } else if (lower.includes('email') || lower.includes('mail')) {
            mapping.email = col;
          }
        });

        if (!mapping.phoneNumber && cols.length > 0) {
          mapping.phoneNumber = cols[0];
        }

        setColumnMapping(mapping);
        setStep('MAP');
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
      },
    });
  };

  const handleExecuteImport = async () => {
    if (!columnMapping.phoneNumber) {
      setError('Please select which column contains the Phone Number.');
      return;
    }

    setStep('IMPORTING');
    setError(null);

    try {
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: parsedRows,
          columnMapping,
          targetGroupId: selectedGroupId || undefined,
          targetTagId: selectedTagId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Import failed');
      }

      setImportResult({
        imported: data.importedCount,
        skipped: data.skippedCount,
        errors: data.errors || [],
      });
      setStep('DONE');
      onImported();
    } catch (err: any) {
      setError(err.message);
      setStep('MAP');
    }
  };

  const reset = () => {
    setStep('UPLOAD');
    setParsedRows([]);
    setHeaders([]);
    setImportResult(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bulk Contact Import</h3>
              <p className="text-xs text-slate-500">Upload CSV file and categorize into audience groups</p>
            </div>
          </div>
          <button
            onClick={reset}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'UPLOAD' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-emerald-500 transition-colors bg-slate-50/50">
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800 mb-1">Choose a CSV file to import</h4>
                <p className="text-xs text-slate-500 mb-4">Supports columns for Phone Number, First Name, Last Name, Email, and Custom Attributes</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-sm transition-all">
                  <span>Browse CSV File</span>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-[11px] text-emerald-800">
                <span className="font-bold">Tip:</span> International phone numbers with or without leading + are automatically normalized to E.164. Any extra columns in your CSV will be stored as dynamic custom attributes!
              </div>
            </div>
          )}

          {step === 'MAP' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                <span>Loaded <strong>{parsedRows.length}</strong> contacts from CSV</span>
                <button onClick={() => setStep('UPLOAD')} className="text-emerald-600 hover:underline font-semibold text-xs">
                  Change File
                </button>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Map CSV Columns</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number Column <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={columnMapping.phoneNumber}
                      onChange={(e) => setColumnMapping({ ...columnMapping, phoneNumber: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">Select column...</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">First Name Column</label>
                    <select
                      value={columnMapping.firstName}
                      onChange={(e) => setColumnMapping({ ...columnMapping, firstName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">(None / Optional)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name Column</label>
                    <select
                      value={columnMapping.lastName}
                      onChange={(e) => setColumnMapping({ ...columnMapping, lastName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">(None / Optional)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Column</label>
                    <select
                      value={columnMapping.email}
                      onChange={(e) => setColumnMapping({ ...columnMapping, email: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">(None / Optional)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Categorize during import */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800">Auto-Assign Group & Tag (Optional)</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Assign to Group</label>
                    <select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">(No Group)</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Assign Tag</label>
                    <select
                      value={selectedTagId}
                      onChange={(e) => setSelectedTagId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">(No Tag)</option>
                      {tags.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={reset}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <span>Start Import</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 'IMPORTING' && (
            <div className="p-8 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Processing & Normalizing Contacts...</h4>
              <p className="text-xs text-slate-500">Validating phone numbers and creating audience records</p>
            </div>
          )}

          {step === 'DONE' && importResult && (
            <div className="p-4 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Import Completed Successfully!</h4>
                <p className="text-xs text-slate-600 mt-1">
                  <strong>{importResult.imported}</strong> contacts imported & categorized.
                  {importResult.skipped > 0 && ` (${importResult.skipped} skipped or invalid)`}
                </p>
              </div>

              {importResult.errors.length > 0 && (
                <div className="text-left p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 space-y-1">
                  <span className="font-bold">Notices:</span>
                  {importResult.errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}

              <button
                onClick={reset}
                className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Close & View Contacts
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
