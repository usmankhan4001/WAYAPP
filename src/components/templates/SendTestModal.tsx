'use client';

import React, { useEffect, useState } from 'react';
import { Send } from 'lucide-react';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchField } from '@/components/ui/search-field';
import { ListRow } from '@/components/ui/list-row';
import { contactLabel, defaultSample, plainName, variableNumbers, bodyTextOf } from '@/lib/templates/present';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface SendTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: AnyRecord | null;
}

export function SendTestModal({ isOpen, onClose, template }: SendTestModalProps) {
  const [contacts, setContacts] = useState<AnyRecord[]>([]);
  const [search, setSearch] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setResult(null);
    setVariables({});
    fetch('/api/contacts')
      .then((r) => r.json())
      .then((d) => setContacts(Array.isArray(d) ? d.slice(0, 200) : []))
      .catch(() => setContacts([]));
  }, [isOpen]);

  if (!template) return null;

  const vars = variableNumbers(bodyTextOf(template));
  const q = search.trim().toLowerCase();
  const shown = contacts
    .filter((c) => !q || `${contactLabel(c)} ${c.phoneNumber ?? ''}`.toLowerCase().includes(q))
    .slice(0, 5);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setResult(null);
    const bodyVars = vars.map((n) => variables[n]?.trim() || defaultSample(n));
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error('send failed');
      setResult({ success: true, message: `Test message sent to ${phoneNumber}. It should arrive in a few seconds.` });
    } catch {
      setResult({
        success: false,
        message: 'The test message did not send. Check the number includes the country code and that WhatsApp is connected, then try again.',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <BottomSheet
      open={isOpen}
      onOpenChange={(o) => !o && onClose()}
      title="Send a test"
      description={`Send "${plainName(template.name)}" to one person to see how it looks.`}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="submit" form="send-test-form" disabled={isSending || !phoneNumber.trim()}>
            <Send />
            {isSending ? 'Sending' : 'Send test'}
          </Button>
        </>
      }
    >
      <form id="send-test-form" onSubmit={handleSendTest} className="space-y-4">
        {result && <Alert tone={result.success ? 'success' : 'danger'}>{result.message}</Alert>}

        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Who should get it</p>
          <SearchField value={search} onValueChange={setSearch} placeholder="Search your contacts" />
          {shown.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-border">
              {shown.map((c) => (
                <ListRow
                  key={c.id ?? c.phoneNumber}
                  title={contactLabel(c)}
                  subtitle={c.phoneNumber}
                  active={phoneNumber === c.phoneNumber}
                  onClick={() => setPhoneNumber(c.phoneNumber)}
                />
              ))}
            </div>
          )}
          <Input
            required
            inputMode="tel"
            placeholder="Or type a number, like +971501234567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>

        {vars.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Fill in the blanks</p>
            {vars.map((n) => (
              <div key={n}>
                <label htmlFor={`test-var-${n}`} className="mb-1 block text-xs text-muted-foreground">
                  {Number(n) === 1 ? 'Name' : `Detail ${n}`}
                </label>
                <Input
                  id={`test-var-${n}`}
                  placeholder={defaultSample(n)}
                  value={variables[n] ?? ''}
                  onChange={(e) => setVariables({ ...variables, [n]: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}
      </form>
    </BottomSheet>
  );
}
