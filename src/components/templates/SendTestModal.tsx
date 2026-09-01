'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';

import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface SendTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: AnyRecord | null;
}

export function SendTestModal({ isOpen, onClose, template }: SendTestModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [variables, setVariables] = useState<Record<number, string>>({ 1: 'Test Customer', 2: 'Apex Store', 3: 'PROMO50' });

  let parsedComponents: AnyRecord[] = [];
  try {
    if (template?.components) {
      parsedComponents = typeof template.components === 'string' ? JSON.parse(template.components) : template.components;
    }
  } catch {
    /* noop */
  }
  const bodyComp = parsedComponents.find((c) => c && c.type === 'BODY');
  const expectedVarCount = bodyComp?.text ? (bodyComp.text.match(/{{\d+}}/g) || []).length : 0;

  if (!template) return null;

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setResult(null);
    const bodyVars = Array.from({ length: expectedVarCount }, (_, i) => variables[i + 1] || `Sample_${i + 1}`);
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
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to dispatch test message');
      setResult({ success: true, message: data.message || `Test message dispatched to ${phoneNumber}` });
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Failed to dispatch test message' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={(o) => !o && onClose()}
      title={
        <span className="inline-flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-subtle text-brand-subtle-foreground">
            <Send className="size-4" />
          </span>
          Send test WhatsApp message
        </span>
      }
      description={<span className="font-mono">Template: {template.name}</span>}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="send-test-form" disabled={isSending}>
            <Send />
            {isSending ? 'Sending…' : 'Dispatch test'}
          </Button>
        </>
      }
    >
      <form id="send-test-form" onSubmit={handleSendTest} className="space-y-4">
        {result && (
          <div
            className={`flex items-center gap-2 rounded-lg border p-3 text-xs ${
              result.success
                ? 'border-success/20 bg-success-subtle text-success-subtle-foreground'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}
          >
            {result.success ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
            <span>{result.message}</span>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">
            Recipient WhatsApp number (E.164) <span className="text-destructive">*</span>
          </label>
          <Input
            required
            placeholder="+971501234567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="font-mono"
          />
          <p className="mt-1 text-[0.625rem] text-muted-foreground">Include country code with + symbol</p>
        </div>

        <div className="space-y-2 rounded-lg border border-border bg-muted p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Dynamic template parameters</span>
            <span className="font-mono text-[0.625rem] font-medium text-muted-foreground">
              {expectedVarCount} {expectedVarCount === 1 ? 'variable' : 'variables'}
            </span>
          </div>

          {expectedVarCount === 0 ? (
            <p className="py-1 text-xs italic text-muted-foreground">This template has no dynamic variables (static message).</p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {Array.from({ length: expectedVarCount }).map((_, idx) => {
                const varNum = idx + 1;
                return (
                  <div key={varNum} className="flex items-center gap-2">
                    <span className="w-8 shrink-0 font-mono text-xs font-bold text-muted-foreground">{`{{${varNum}}}`}</span>
                    <Input
                      placeholder={`Value for {{${varNum}}}`}
                      value={variables[varNum] || ''}
                      onChange={(e) => setVariables({ ...variables, [varNum]: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
