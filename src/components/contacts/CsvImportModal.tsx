'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Download,
  Check,
  HelpCircle,
} from 'lucide-react';

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
    tags: string;
  }>({
    phoneNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    tags: '',
  });

  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedTagId, setSelectedTagId] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const downloadSampleCsv = () => {
    const csvContent =
      'phoneNumber,firstName,lastName,email,company,city,tags\n' +
      '+971501234567,Ahmed,Al-Maktoum,ahmed@example.com,Dubai Holdings,Dubai,"VIP, Premium"\n' +
      '+966501234567,Sara,Al-Saud,sara@example.com,Riyadh Capital,Riyadh,"Lead, Retail"\n' +
      '+974501234567,Tariq,Mansoor,tariq@example.com,Doha Trading,Doha,Customer\n' +
      '+15550192834,John,Smith,john.smith@example.com,Acme Corp,New York,"VIP, Partner"\n' +
      '+447700900077,Emma,Watson,emma.watson@example.com,London Tech,London,Lead\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'wayapp_contacts_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          setError('The uploaded CSV file contains no data rows.');
          return;
        }

        const cols = Object.keys(results.data[0] as object);
        setHeaders(cols);
        setParsedRows(results.data);

        // Smart auto-mapping
        const mapping = { phoneNumber: '', firstName: '', lastName: '', email: '', tags: '' };
        cols.forEach((col) => {
          const lower = col.toLowerCase().trim();
          if (lower.includes('phone') || lower.includes('mobile') || lower.includes('whatsapp') || lower.includes('tel') || lower === 'number') {
            if (!mapping.phoneNumber) mapping.phoneNumber = col;
          } else if (lower.includes('first') || lower === 'name') {
            if (!mapping.firstName) mapping.firstName = col;
          } else if (lower.includes('last') || lower.includes('surname')) {
            if (!mapping.lastName) mapping.lastName = col;
          } else if (lower.includes('email') || lower.includes('mail')) {
            if (!mapping.email) mapping.email = col;
          } else if (lower.includes('tag') || lower.includes('tags') || lower.includes('label')) {
            if (!mapping.tags) mapping.tags = col;
          }
        });

        if (!mapping.phoneNumber && cols.length > 0) {
          mapping.phoneNumber = cols[0];
        }

        setColumnMapping(mapping);
        setStep('MAP');
      },
      error: (err) => {
        setError(`Failed to parse CSV file: ${err.message}`);
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bulk Contact Import</h3>
              <p className="text-xs text-slate-500">Upload CSV with phone numbers and custom audience attributes</p>
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
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'UPLOAD' && (
            <div className="space-y-4">
              {/* Drag and Drop Box */}
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-emerald-500 transition-colors bg-slate-50/50">
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800 mb-1">Choose a CSV file to import</h4>
                <p className="text-xs text-slate-500 mb-4 max-w-md mx-auto">
                  Supports columns for Phone Number, First Name, Last Name, Email, Tags, and unlimited custom parameters.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-sm transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Browse CSV File</span>
                    <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={downloadSampleCsv}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Download Sample Template</span>
                  </button>
                </div>
              </div>

              {/* Helper guidance note */}
              <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Automatic E.164 Normalization & Attribute Capture</span>
                </div>
                <p className="text-emerald-800 leading-relaxed">
                  International phone numbers (e.g. <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">+971501234567</code> or <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">971501234567</code>) are automatically formatted. Any extra columns in your file (like <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">company</code>, <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">city</code>, <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">balance</code>) will be saved as dynamic attributes for broadcast template personalization.
                </p>
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

              {/* Column Mapping Section */}
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
                      className="w-full text-xs rounded-xl border border-slate-300 bg-white p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="">-- Select Column --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">First Name Column</label>
                    <select
                      value={columnMapping.firstName}
                      onChange={(e) => setColumnMapping({ ...columnMapping, firstName: e.target.value })}
                      className="w-full text-xs rounded-xl border border-slate-300 bg-white p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="">-- None / Skip --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name Column</label>
                    <select
                      value={columnMapping.lastName}
                      onChange={(e) => setColumnMapping({ ...columnMapping, lastName: e.target.value })}
                      className="w-full text-xs rounded-xl border border-slate-300 bg-white p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="">-- None / Skip --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address Column</label>
                    <select
                      value={columnMapping.email}
                      onChange={(e) => setColumnMapping({ ...columnMapping, email: e.target.value })}
                      className="w-full text-xs rounded-xl border border-slate-300 bg-white p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="">-- None / Skip --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Categorization Assignment */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Bulk Assign to Audience Group & Tag (Optional)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Assign to Group</label>
                    <select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 bg-white p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="">-- No Group Assignment --</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Apply Tag</label>
                    <select
                      value={selectedTagId}
                      onChange={(e) => setSelectedTagId(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 bg-white p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="">-- No Tag Assignment --</option>
                      {tags.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  First 3 Rows Preview
                </span>
                <div className="border border-slate-200 rounded-xl overflow-x-auto text-[11px]">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        {headers.slice(0, 5).map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {parsedRows.slice(0, 3).map((row, idx) => (
                        <tr key={idx}>
                          {headers.slice(0, 5).map((h) => (
                            <td key={h} className="px-3 py-1.5 text-slate-700 truncate max-w-[140px]">
                              {String(row[h] || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 'IMPORTING' && (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Processing and normalising contacts...</h4>
              <p className="text-xs text-slate-500">
                Validating phone formats, assigning tags, and updating audience attributes.
              </p>
            </div>
          )}

          {step === 'DONE' && importResult && (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Import Processed Successfully</h4>
                <p className="text-xs text-slate-500 mt-1">
                  <strong>{importResult.imported}</strong> contacts imported &bull;{' '}
                  <strong>{importResult.skipped}</strong> skipped
                </p>
              </div>

              {importResult.errors.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-800 max-h-32 overflow-y-auto">
                  <span className="font-bold block mb-1">Warnings / Skipped Rows:</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          {step === 'UPLOAD' && (
            <button
              onClick={reset}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100"
            >
              Cancel
            </button>
          )}

          {step === 'MAP' && (
            <>
              <button
                onClick={() => setStep('UPLOAD')}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100"
              >
                Back
              </button>
              <button
                onClick={handleExecuteImport}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                <span>Import {parsedRows.length} Contacts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {step === 'DONE' && (
            <button
              onClick={reset}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              Done & Return to Contacts
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
