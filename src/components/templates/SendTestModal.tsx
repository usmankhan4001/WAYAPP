'use client';

import React, { useState } from 'react';
import { X, Send, CheckCircle2, AlertCircle } from 'lucide-react';

interface SendTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: any;
}

export function SendTestModal({ isOpen, onClose, template }: SendTestModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  let parsedComponents: any[] = [];
  try {
    if (template?.components) {
      parsedComponents =
        typeof template.components === 'string'
          ? JSON.parse(template.components)
          : template.components;
    }
  } catch {}

  const bodyComp = parsedComponents.find((c: any) => c && c.type === 'BODY');
  const bodyMatches = bodyComp?.text ? (bodyComp.text.match(/{{\d+}}/g) || []) : [];
  const expectedVarCount = bodyMatches.length;

  const [variables, setVariables] = useState<Record<number, string>>({
    1: 'Test Customer',
    2: 'Apex Store',
    3: 'PROMO50',
  });

  if (!isOpen || !template) return null;

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setResult(null);

    const bodyVars: string[] = [];
    for (let i = 1; i <= expectedVarCount; i++) {
      bodyVars.push(variables[i] || `Sample_${i}`);
    }

    try {
      const res = await fetch('/api/templates/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          templateName: template.name,
          languageCode: template.language || 'en_US',
          bodyVariables: bodyVars,
          templateComponents: template.components,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to dispatch test message');
      }

      setResult({
        success: true,
        message: data.message || `Test message dispatched to ${phoneNumber}`,
      });
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Send Test WhatsApp Message</h3>
              <p className="text-[11px] text-slate-500 font-mono">Template: {template.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSendTest} className="p-6 space-y-4">
          {result && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                result.success
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span>{result.message}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Recipient WhatsApp Number (E.164) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="+971501234567 or +12025550143"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">Include country code with + symbol</p>
          </div>

          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Dynamic Template Parameters</span>
              <span className="text-[10px] text-slate-500 font-medium font-mono">
                {expectedVarCount} {expectedVarCount === 1 ? 'variable' : 'variables'}
              </span>
            </div>

            {expectedVarCount === 0 ? (
              <p className="text-xs text-slate-500 italic py-1">
                This template has no dynamic variables (static message).
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {Array.from({ length: expectedVarCount }).map((_, idx) => {
                  const varNum = idx + 1;
                  return (
                    <div key={varNum} className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500 w-8 shrink-0">
                        {`{{${varNum}}}`}
                      </span>
                      <input
                        type="text"
                        placeholder={`Value for {{${varNum}}}`}
                        value={variables[varNum] || ''}
                        onChange={(e) =>
                          setVariables({ ...variables, [varNum]: e.target.value })
                        }
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-60 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Sending Test...' : 'Dispatch Test'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
