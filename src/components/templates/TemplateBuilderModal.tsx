'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';

import { WhatsAppMockupPreview } from './WhatsAppMockupPreview';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { bodyTextOf, categoryLabel, defaultSample, insertVariable, parseComponents, plainName, variableLabel, variableNumbers, type TemplateRecord } from '@/lib/templates/present';

interface TemplateBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** pre-fill from an existing (for example rejected) template */
  initial?: TemplateRecord | null;
}

const META_LANGUAGES = [
  { code: 'en_US', name: 'English (US)' },
  { code: 'en_GB', name: 'English (UK)' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ur', name: 'Urdu' },
  { code: 'hi', name: 'Hindi' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt_BR', name: 'Portuguese (Brazil)' },
  { code: 'ru', name: 'Russian' },
  { code: 'tr', name: 'Turkish' },
  { code: 'zh_CN', name: 'Chinese (Simplified)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'id', name: 'Indonesian' },
  { code: 'fa', name: 'Persian' },
];

type Category = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
type HeaderType = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
const HEADER_LABEL: Record<HeaderType, string> = { NONE: 'None', TEXT: 'Text', IMAGE: 'Picture', VIDEO: 'Video', DOCUMENT: 'Document' };
const DEFAULT_MEDIA = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80';
type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
interface BuilderButton {
  type: ButtonType;
  text: string;
  url?: string;
  urlSample?: string;
  phone_number?: string;
}

const CATEGORY_HELP: Record<Category, string> = {
  MARKETING: 'Promotions, offers and news. Customers can turn these off.',
  UTILITY: 'Updates about something they asked for, like an order or a booking.',
  AUTHENTICATION: 'One-time login codes.',
};

const STEPS = ['Name and type', 'Message', 'Review'];

// A friendly name becomes the snake_case id Meta needs.
const toMetaName = (title: string) =>
  title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

export function TemplateBuilderModal({ isOpen, onClose, onCreated, initial }: TemplateBuilderModalProps) {
  const seed = useMemo(() => {
    if (!initial) return null;
    const parts = parseComponents(initial.components);
    const header = parts.find((c) => c.type === 'HEADER');
    const footer = parts.find((c) => c.type === 'FOOTER');
    const btns = (parts.find((c) => c.type === 'BUTTONS')?.buttons ?? []) as BuilderButton[];
    const body = parts.find((c) => c.type === 'BODY');
    const samples: Record<string, string> = {};
    (body?.example?.body_text?.[0] ?? []).forEach((v: string, i: number) => { samples[String(i + 1)] = v; });
    return { header, footer, btns, samples, body: bodyTextOf(initial) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(initial ? plainName(initial.name) : '');
  const [category, setCategory] = useState<Category>((initial?.category as Category) || 'UTILITY');
  const [language, setLanguage] = useState<string>(initial?.language || 'en_US');

  const [headerType, setHeaderType] = useState<HeaderType>((seed?.header?.format as HeaderType) || 'NONE');
  const [headerText, setHeaderText] = useState<string>(seed?.header?.format === 'TEXT' ? seed.header.text ?? '' : '');
  const [headerSampleValue, setHeaderSampleValue] = useState<string>(seed?.header?.example?.header_text?.[0] ?? '');
  const [headerMediaUrl, setHeaderMediaUrl] = useState<string>('');
  const [bodyText, setBodyText] = useState<string>(seed?.body || 'Hi {{1}}, thanks for getting in touch.');
  const [sampleValues, setSampleValues] = useState<Record<string, string>>(seed ? seed.samples : { '1': 'Sam' });
  const [footerText, setFooterText] = useState<string>(seed?.footer?.text ?? '');
  const [buttons, setButtons] = useState<BuilderButton[]>(seed?.btns ?? []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const metaName = toMetaName(title);
  const bodyVars = useMemo(() => variableNumbers(bodyText), [bodyText]);
  const headerVars = useMemo(() => variableNumbers(headerText), [headerText]);
  const nextVar = (bodyVars.length ? Math.max(...bodyVars.map(Number)) : 0) + 1;

  const handleAddVariable = () => {
    const cursor = bodyRef.current?.selectionStart ?? undefined;
    const res = insertVariable(bodyText, cursor);
    setBodyText(res.text);
    setSampleValues((prev) => ({ ...prev, [String(res.number)]: prev[String(res.number)] || defaultSample(res.number) }));
    requestAnimationFrame(() => {
      bodyRef.current?.focus();
      bodyRef.current?.setSelectionRange(res.cursor, res.cursor);
    });
  };

  const addButton = (type: ButtonType) => {
    if (buttons.length >= 10) return;
    const seed: Record<ButtonType, BuilderButton> = {
      QUICK_REPLY: { type, text: 'Yes, please' },
      URL: { type, text: 'Visit website', url: 'https://example.com' },
      PHONE_NUMBER: { type, text: 'Call us', phone_number: '+971501234567' },
      COPY_CODE: { type, text: 'Copy code' },
    };
    setButtons([...buttons, seed[type]]);
  };
  const updateButton = (i: number, patch: Partial<BuilderButton>) =>
    setButtons(buttons.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));

  // Components exactly as before: this is what the preview shows and what is submitted.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const previewComponents: any[] = [];
  if (headerType === 'TEXT' && headerText.trim()) {
    previewComponents.push({ type: 'HEADER', format: 'TEXT', text: headerText.replace(/{{\s*\d+\s*}}/g, headerSampleValue || 'Sample') });
  } else if (headerType === 'IMAGE') {
    previewComponents.push({ type: 'HEADER', format: 'IMAGE', example: { header_handle: [headerMediaUrl || DEFAULT_MEDIA] } });
  } else if (headerType === 'VIDEO' || headerType === 'DOCUMENT') {
    previewComponents.push({ type: 'HEADER', format: headerType });
  }
  previewComponents.push({ type: 'BODY', text: bodyText || ' ' });
  if (footerText.trim()) previewComponents.push({ type: 'FOOTER', text: footerText });
  if (buttons.length > 0) previewComponents.push({ type: 'BUTTONS', buttons });

  const step1Errors = useMemo(() => {
    const e: string[] = [];
    if (!metaName) e.push('Give the message a name so you can find it later.');
    return e;
  }, [metaName]);

  const step2Errors = useMemo(() => {
    const e: string[] = [];
    if (!bodyText.trim()) e.push('Write the message before you continue.');
    if (bodyText.length > 1024) e.push('The message is too long. Keep it under 1024 characters.');
    if (/{{(\d+)}}\s*{{(\d+)}}/.test(bodyText)) e.push('Two blanks cannot sit next to each other. Put a word between them.');
    for (const v of bodyVars) {
      if (!sampleValues[v]?.trim()) e.push(`Add an example for "${variableLabel(v)}" so Meta can check the message.`);
    }
    buttons.forEach((b, i) => {
      if (!b.text.trim()) e.push(`Button ${i + 1} needs a label.`);
    });
    return e;
  }, [bodyText, bodyVars, sampleValues, buttons]);

  const errorsForStep = step === 0 ? step1Errors : step === 1 ? step2Errors : [];
  const canContinue = errorsForStep.length === 0;

  const handleSubmit = async () => {
    const all = [...step1Errors, ...step2Errors];
    if (all.length > 0) {
      setError(all[0]);
      return;
    }
    setIsSubmitting(true);
    setError(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const components: any[] = [];
    if (headerType === 'TEXT' && headerText.trim()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const h: any = { type: 'HEADER', format: 'TEXT', text: headerText.trim() };
      if (headerVars.length > 0) h.example = { header_text: [headerSampleValue || 'Sample Header'] };
      components.push(h);
    } else if (headerType === 'IMAGE' || headerType === 'VIDEO' || headerType === 'DOCUMENT') {
      components.push({ type: 'HEADER', format: headerType, example: { header_handle: [headerMediaUrl || DEFAULT_MEDIA] } });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bodyObj: any = { type: 'BODY', text: bodyText.trim() };
    if (bodyVars.length > 0) {
      bodyObj.example = { body_text: [bodyVars.map((v) => sampleValues[v]?.trim() || `Sample_${v}`)] };
    }
    components.push(bodyObj);
    if (footerText.trim()) components.push({ type: 'FOOTER', text: footerText.trim() });
    if (buttons.length > 0) {
      const valid = buttons.map((b) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const btn: any = { type: b.type, text: b.text.trim() };
        if (b.type === 'URL') {
          btn.url = b.url?.trim() || 'https://example.com';
          if (btn.url.includes('{{1}}')) btn.example = [b.urlSample || 'sample_slug'];
        } else if (b.type === 'PHONE_NUMBER') {
          btn.phone_number = b.phone_number?.trim() || '+971501234567';
        }
        return btn;
      });
      components.push({ type: 'BUTTONS', buttons: valid });
    }

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: metaName, category, language, components }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'rejected');
      onCreated();
      onClose();
    } catch (err) {
      const detail = err instanceof Error && err.message !== 'rejected' ? ` Meta said: ${err.message}` : '';
      setError(`Your message was not sent to Meta.${detail} Check it and try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <BottomSheet
      open={isOpen}
      onOpenChange={(o) => !o && onClose()}
      size="xl"
      contentClassName="max-h-[85vh]"
      title="New template"
      description={`Step ${step + 1} of 3: ${STEPS[step]}`}
      footer={
        <>
          {step === 0 ? (
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => { setError(null); setStep(step - 1); }}>
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button type="button" disabled={!canContinue} onClick={() => setStep(step + 1)}>
              Continue
            </Button>
          ) : (
            <Button type="button" disabled={isSubmitting} onClick={handleSubmit}>
              <Check />
              {isSubmitting ? 'Sending to Meta' : 'Submit to Meta'}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-1.5" aria-hidden>
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        {error && <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert>}

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="tpl-title" className="mb-1 block text-sm font-semibold text-foreground">Name</label>
              <Input id="tpl-title" placeholder="Welcome offer" value={title} onChange={(e) => setTitle(e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">Only you see this. Use a few words that say what the message is for.</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">What kind of message is it</p>
              <div className="flex flex-wrap gap-2">
                {(['UTILITY', 'MARKETING', 'AUTHENTICATION'] as Category[]).map((c) => (
                  <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>
                    {categoryLabel(c)}
                  </Chip>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{CATEGORY_HELP[category]}</p>
            </div>
            <div>
              <label htmlFor="tpl-lang" className="mb-1 block text-sm font-semibold text-foreground">Language</label>
              <select id="tpl-lang" value={language} onChange={(e) => setLanguage(e.target.value)} className="input-base">
                {META_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="order-2 space-y-4 lg:order-1">
              <div>
                <p className="mb-2 text-sm font-semibold text-foreground">Top of the message (optional)</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(HEADER_LABEL) as HeaderType[]).map((t) => (
                    <Chip key={t} selected={headerType === t} onClick={() => setHeaderType(t)}>{HEADER_LABEL[t]}</Chip>
                  ))}
                </div>
                {headerType === 'TEXT' && (
                  <div className="mt-2 space-y-2">
                    <Input aria-label="Headline" maxLength={60} value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="Your booking" />
                    {headerVars.length > 0 && (
                      <Input aria-label="Example for the headline blank" value={headerSampleValue} onChange={(e) => setHeaderSampleValue(e.target.value)} placeholder="Example, like 98214" />
                    )}
                  </div>
                )}
                {headerType === 'IMAGE' && (
                  <Input className="mt-2" aria-label="Example picture address" value={headerMediaUrl} onChange={(e) => setHeaderMediaUrl(e.target.value)} placeholder="Example picture address (optional)" />
                )}
                {(headerType === 'VIDEO' || headerType === 'DOCUMENT') && (
                  <p className="mt-2 text-xs text-muted-foreground">You choose the {headerType === 'VIDEO' ? 'video' : 'document'} each time you send.</p>
                )}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label htmlFor="tpl-body" className="text-sm font-semibold text-foreground">Message</label>
                  <Chip className="h-8 px-3" onClick={handleAddVariable}>
                    <Plus className="size-3.5" aria-hidden />
                    {nextVar === 1 ? 'Add a name' : 'Add a detail'}
                  </Chip>
                </div>
                <Textarea id="tpl-body" ref={bodyRef} rows={5} maxLength={1024} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
                <p className="mt-1 text-right text-xs text-muted-foreground">{bodyText.length} / 1024</p>
              </div>

              {bodyVars.length > 0 && (
                <div className="space-y-2 rounded-2xl bg-muted p-3">
                  <p className="text-sm font-semibold text-foreground">Examples for Meta</p>
                  <p className="text-xs text-muted-foreground">Meta checks the message with a real looking example for each blank.</p>
                  {bodyVars.map((v) => (
                    <div key={v}>
                      <label htmlFor={`tpl-sample-${v}`} className="mb-1 block text-xs text-muted-foreground">{variableLabel(v)}</label>
                      <Input id={`tpl-sample-${v}`} value={sampleValues[v] ?? ''} onChange={(e) => setSampleValues({ ...sampleValues, [v]: e.target.value })} />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label htmlFor="tpl-footer" className="mb-1 block text-sm font-semibold text-foreground">Small print (optional)</label>
                <Input id="tpl-footer" maxLength={60} value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Reply STOP to opt out" />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Buttons (optional)</p>
                {buttons.map((b, i) => (
                  <div key={i} className="space-y-2 rounded-2xl border border-border p-3">
                    <div className="flex items-center gap-2">
                      <Input aria-label="Button label" maxLength={25} value={b.text} onChange={(e) => updateButton(i, { text: e.target.value })} />
                      <Button type="button" variant="ghost" size="icon" aria-label="Remove button" onClick={() => setButtons(buttons.filter((_, idx) => idx !== i))}>
                        <Trash2 />
                      </Button>
                    </div>
                    {b.type === 'URL' && (
                      <>
                        <Input aria-label="Web address" type="url" value={b.url ?? ''} onChange={(e) => updateButton(i, { url: e.target.value })} />
                        {b.url?.includes('{{1}}') && (
                          <Input aria-label="Example ending for the web address" value={b.urlSample ?? ''} onChange={(e) => updateButton(i, { urlSample: e.target.value })} />
                        )}
                      </>
                    )}
                    {b.type === 'PHONE_NUMBER' && (
                      <Input aria-label="Phone number" value={b.phone_number ?? ''} onChange={(e) => updateButton(i, { phone_number: e.target.value })} />
                    )}
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Chip disabled={buttons.length >= 10} onClick={() => addButton('QUICK_REPLY')}>Quick reply</Chip>
                  <Chip disabled={buttons.length >= 10} onClick={() => addButton('URL')}>Web link</Chip>
                  <Chip disabled={buttons.length >= 10} onClick={() => addButton('PHONE_NUMBER')}>Call button</Chip>
                  <Chip disabled={buttons.length >= 10} onClick={() => addButton('COPY_CODE')}>Copy code</Chip>
                </div>
              </div>

              {step2Errors.length > 0 && <Alert tone="warning">{step2Errors[0]}</Alert>}
            </div>

            <div className="order-1 lg:sticky lg:top-0 lg:order-2 lg:self-start">
              <WhatsAppMockupPreview components={previewComponents} sampleVariables={sampleValues} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Name</dt><dd className="font-medium text-foreground">{plainName(metaName)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Kind</dt><dd className="font-medium text-foreground">{categoryLabel(category)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Language</dt><dd className="font-medium text-foreground">{META_LANGUAGES.find((l) => l.code === language)?.name}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Buttons</dt><dd className="font-medium text-foreground">{buttons.length}</dd></div>
              </dl>
              <Alert tone="info">
                Meta usually reviews a new template within a day. You can send it to customers once it shows as Approved.
              </Alert>
            </div>
            <WhatsAppMockupPreview components={previewComponents} sampleVariables={sampleValues} />
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

