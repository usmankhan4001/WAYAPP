'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet, ArrowRight, Download, Check } from 'lucide-react';

import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: AnyRecord[];
  tags: AnyRecord[];
  onImported: () => void;
}

interface ColumnMapping {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  tags: string;
}

const selectClass =
  'w-full rounded-lg border border-input bg-transparent p-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';
const fieldLabel = 'mb-1 block text-xs font-semibold text-foreground';

export function CsvImportModal({ isOpen, onClose, groups, tags, onImported }: CsvImportModalProps) {
  const [step, setStep] = useState<'UPLOAD' | 'MAP' | 'IMPORTING' | 'DONE'>('UPLOAD');
  const [parsedRows, setParsedRows] = useState<AnyRecord[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
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

  const downloadSampleCsv = () => {
    const csvContent =
      'phoneNumber,firstName,lastName,email,company,city,tags\n' +
      '+971501234567,Ahmed,Al-Maktoum,ahmed@example.com,Dubai Holdings,Dubai,"VIP, Premium"\n' +
      '+15550192834,John,Smith,john.smith@example.com,Acme Corp,New York,"VIP, Partner"\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'wayapp_contacts_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        setParsedRows(results.data as AnyRecord[]);
        const mapping: ColumnMapping = { phoneNumber: '', firstName: '', lastName: '', email: '', tags: '' };
        cols.forEach((col) => {
          const lower = col.toLowerCase().trim();
          if (/phone|mobile|whatsapp|tel|^number$/.test(lower)) mapping.phoneNumber ||= col;
          else if (/first|^name$/.test(lower)) mapping.firstName ||= col;
          else if (/last|surname/.test(lower)) mapping.lastName ||= col;
          else if (/e?mail/.test(lower)) mapping.email ||= col;
          else if (/tags?|label/.test(lower)) mapping.tags ||= col;
        });
        if (!mapping.phoneNumber && cols.length > 0) mapping.phoneNumber = cols[0];
        setColumnMapping(mapping);
        setStep('MAP');
      },
      error: (err) => setError(`Failed to parse CSV file: ${err.message}`),
    });
  };

  const handleExecuteImport = async () => {
    if (!columnMapping.phoneNumber) {
      setError('Please select which column contains the phone number.');
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
      if (!res.ok || data.error) throw new Error(data.error || 'Import failed');
      setImportResult({ imported: data.importedCount, skipped: data.skippedCount, errors: data.errors || [] });
      setStep('DONE');
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
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

  const mapSelect = (key: keyof ColumnMapping, label: string, required = false, allowNone = true) => (
    <div>
      <label className={fieldLabel}>
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <select
        value={columnMapping[key]}
        onChange={(e) => setColumnMapping({ ...columnMapping, [key]: e.target.value })}
        className={selectClass}
      >
        <option value="">{allowNone ? '— none / skip —' : '— select column —'}</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </div>
  );

  const footer =
    step === 'UPLOAD' ? (
      <Button variant="outline" onClick={reset}>
        Cancel
      </Button>
    ) : step === 'MAP' ? (
      <>
        <Button variant="outline" onClick={() => setStep('UPLOAD')}>
          Back
        </Button>
        <Button onClick={handleExecuteImport}>
          Import {parsedRows.length} contacts
          <ArrowRight />
        </Button>
      </>
    ) : step === 'DONE' ? (
      <Button onClick={reset}>Done &amp; return to contacts</Button>
    ) : null;

  return (
    <Modal
      open={isOpen}
      onOpenChange={(o) => !o && reset()}
      size="xl"
      title={
        <span className="inline-flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-subtle text-brand-subtle-foreground">
            <FileSpreadsheet className="size-5" />
          </span>
          Bulk contact import
        </span>
      }
      description="Upload a CSV with phone numbers and custom audience attributes"
      footer={footer ?? undefined}
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 'UPLOAD' && (
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-dashed border-border bg-muted/50 p-8 text-center transition-colors hover:border-primary">
              <Upload className="mx-auto mb-3 size-10 text-muted-foreground" />
              <h4 className="mb-1 text-sm font-semibold text-foreground">Choose a CSV file to import</h4>
              <p className="mx-auto mb-4 max-w-md text-xs text-muted-foreground">
                Supports Phone Number, First/Last Name, Email, Tags and unlimited custom parameters.
              </p>
              <div className="flex items-center justify-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                  <Upload className="size-3.5" />
                  <span>Browse CSV file</span>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
                <Button variant="outline" size="sm" onClick={downloadSampleCsv}>
                  <Download />
                  Sample template
                </Button>
              </div>
            </div>

            <div className="space-y-1 rounded-lg border border-success/20 bg-success-subtle p-3.5 text-[0.6875rem] text-success-subtle-foreground">
              <div className="flex items-center gap-1.5 font-semibold">
                <Check className="size-3.5" />
                <span>Automatic E.164 normalization &amp; attribute capture</span>
              </div>
              <p className="leading-relaxed opacity-90">
                International numbers are auto-formatted. Extra columns (company, city, balance…) are saved as dynamic
                attributes for broadcast personalization.
              </p>
            </div>
          </div>
        )}

        {step === 'MAP' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted p-3 text-xs text-foreground">
              <span>
                Loaded <strong>{parsedRows.length}</strong> contacts from CSV
              </span>
              <button onClick={() => setStep('UPLOAD')} className="text-xs font-semibold text-primary hover:underline">
                Change file
              </button>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Map CSV columns</span>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {mapSelect('phoneNumber', 'Phone number column', true, false)}
                {mapSelect('firstName', 'First name column')}
                {mapSelect('lastName', 'Last name column')}
                {mapSelect('email', 'Email address column')}
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Bulk assign to group &amp; tag (optional)
              </span>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className={fieldLabel}>Assign to group</label>
                  <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} className={selectClass}>
                    <option value="">— no group —</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={fieldLabel}>Apply tag</label>
                  <select value={selectedTagId} onChange={(e) => setSelectedTagId(e.target.value)} className={selectClass}>
                    <option value="">— no tag —</option>
                    {tags.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-2">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                First 3 rows preview
              </span>
              <div className="overflow-x-auto rounded-lg border border-border text-[0.6875rem]">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      {headers.slice(0, 5).map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedRows.slice(0, 3).map((row, idx) => (
                      <tr key={idx}>
                        {headers.slice(0, 5).map((h) => (
                          <td key={h} className="max-w-[140px] truncate px-3 py-1.5 text-foreground">
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
          <div className="space-y-3 py-12 text-center">
            <div className="mx-auto size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <h4 className="text-sm font-semibold text-foreground">Processing and normalising contacts…</h4>
            <p className="text-xs text-muted-foreground">Validating phone formats, assigning tags, updating attributes.</p>
          </div>
        )}

        {step === 'DONE' && importResult && (
          <div className="space-y-4 py-8 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-subtle text-brand-subtle-foreground">
              <CheckCircle2 className="size-7" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-foreground">Import processed successfully</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                <strong>{importResult.imported}</strong> imported · <strong>{importResult.skipped}</strong> skipped
              </p>
            </div>
            {importResult.errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-lg border border-warning/30 bg-warning-subtle p-3 text-left text-xs text-warning-subtle-foreground">
                <span className="mb-1 block font-semibold">Warnings / skipped rows:</span>
                <ul className="list-disc space-y-0.5 pl-4 text-[0.6875rem]">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
