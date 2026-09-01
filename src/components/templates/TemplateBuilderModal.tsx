'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Globe,
  Image as ImageIcon,
  Video,
  FileText,
  Smartphone,
  Copy,
  ExternalLink,
  PhoneCall,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
import { WhatsAppMockupPreview } from './WhatsAppMockupPreview';
import { InfoTooltip } from '@/components/ui/Tooltip';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

interface TemplateBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const META_LANGUAGES = [
  { code: 'en_US', name: 'English (US)' },
  { code: 'en_GB', name: 'English (UK)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'ur', name: 'Urdu (اردو)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'pt_BR', name: 'Portuguese (Brazil)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'tr', name: 'Turkish (Türkçe)' },
  { code: 'zh_CN', name: 'Chinese (Simplified)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'id', name: 'Indonesian (Bahasa)' },
  { code: 'fa', name: 'Persian (فارسی)' },
];

export function TemplateBuilderModal({ isOpen, onClose, onCreated }: TemplateBuilderModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('MARKETING');
  const [language, setLanguage] = useState('en_US');
  
  // Header State
  const [headerType, setHeaderType] = useState<'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'>('NONE');
  const [headerText, setHeaderText] = useState('');
  const [headerSampleValue, setHeaderSampleValue] = useState('');
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');

  // Body State
  const [bodyText, setBodyText] = useState(
    'Hi {{1}}, your order {{2}} has been confirmed! We will deliver it by {{3}}.'
  );
  const [sampleValues, setSampleValues] = useState<Record<string, string>>({
    '1': 'Usman',
    '2': 'ORD-98241',
    '3': 'Tomorrow, 2:00 PM',
  });

  // Footer State
  const [footerText, setFooterText] = useState('Reply STOP to opt out');

  // Buttons State (Up to 10 Quick Replies or CTAs)
  const [buttons, setButtons] = useState<
    Array<{
      type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
      text: string;
      url?: string;
      urlSample?: string;
      phone_number?: string;
      code?: string;
    }>
  >([
    { type: 'QUICK_REPLY', text: 'Track Order' },
    { type: 'URL', text: 'View Invoice', url: 'https://example.com/orders/{{1}}', urlSample: 'ORD-98241' },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract variables from body text in real-time
  const detectedBodyVars = useMemo(() => {
    const matches = bodyText.match(/{{\d+}}/g) || [];
    return Array.from(new Set(matches)).map((m) => m.replace(/[{}]/g, ''));
  }, [bodyText]);

  // Extract variables from header text
  const detectedHeaderVars = useMemo(() => {
    const matches = headerText.match(/{{\d+}}/g) || [];
    return Array.from(new Set(matches)).map((m) => m.replace(/[{}]/g, ''));
  }, [headerText]);

  // Insert variable into Body
  const handleInsertBodyVar = () => {
    const nextNum = detectedBodyVars.length + 1;
    setBodyText((prev) => `${prev} {{${nextNum}}}`);
    setSampleValues((prev) => ({ ...prev, [String(nextNum)]: `Sample ${nextNum}` }));
  };

  // Add button
  const handleAddButton = (type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE') => {
    if (buttons.length >= 10) return;
    if (type === 'QUICK_REPLY') {
      setButtons([...buttons, { type: 'QUICK_REPLY', text: 'Reply Option' }]);
    } else if (type === 'URL') {
      setButtons([...buttons, { type: 'URL', text: 'Visit Website', url: 'https://example.com' }]);
    } else if (type === 'PHONE_NUMBER') {
      setButtons([...buttons, { type: 'PHONE_NUMBER', text: 'Call Us', phone_number: '+971501234567' }]);
    } else if (type === 'COPY_CODE') {
      setButtons([...buttons, { type: 'COPY_CODE', text: 'Copy Code', code: 'WAYAPP2026' }]);
    }
  };

  const handleRemoveButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  // Build Preview Components with Samples Replaced
  const previewComponents: any[] = [];
  
  if (headerType === 'TEXT' && headerText) {
    let replacedHeader = headerText;
    detectedHeaderVars.forEach((v) => {
      replacedHeader = replacedHeader.replace(new RegExp(`{{${v}}}`, 'g'), headerSampleValue || `[Sample ${v}]`);
    });
    previewComponents.push({ type: 'HEADER', format: 'TEXT', text: replacedHeader });
  } else if (headerType === 'IMAGE') {
    previewComponents.push({
      type: 'HEADER',
      format: 'IMAGE',
      example: { header_handle: [headerMediaUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80'] },
    });
  } else if (headerType === 'VIDEO') {
    previewComponents.push({ type: 'HEADER', format: 'VIDEO' });
  } else if (headerType === 'DOCUMENT') {
    previewComponents.push({ type: 'HEADER', format: 'DOCUMENT' });
  }

  let replacedBody = bodyText;
  detectedBodyVars.forEach((v) => {
    replacedBody = replacedBody.replace(new RegExp(`{{${v}}}`, 'g'), sampleValues[v] || `[Sample ${v}]`);
  });
  previewComponents.push({ type: 'BODY', text: replacedBody });

  if (footerText) previewComponents.push({ type: 'FOOTER', text: footerText });
  if (buttons.length > 0) previewComponents.push({ type: 'BUTTONS', buttons });

  // Pre-flight compliance validator
  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (!name.trim()) errs.push('Template Name is required.');
    else if (!/^[a-z0-9_]+$/.test(name)) errs.push('Template Name must be lower snake_case (e.g. order_update_2026).');

    if (!bodyText.trim()) errs.push('Body text cannot be empty.');
    if (bodyText.length > 1024) errs.push('Body text exceeds 1024 character limit.');

    // Check adjacent variables
    if (/{{(\d+)}}\s*{{(\d+)}}/.test(bodyText)) {
      errs.push('Meta does not allow adjacent variables (e.g. {{1}}{{2}}) without text in between.');
    }

    // Check missing samples
    for (const v of detectedBodyVars) {
      if (!sampleValues[v] || !sampleValues[v].trim()) {
        errs.push(`Please provide a realistic sample value for variable {{${v}}}.`);
      }
    }

    return errs;
  }, [name, bodyText, detectedBodyVars, sampleValues]);

  // Early return AFTER all hooks so hook order stays consistent across renders
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Format components strictly to Meta Graph API requirements
    const components: any[] = [];

    if (headerType === 'TEXT' && headerText) {
      const hObj: any = { type: 'HEADER', format: 'TEXT', text: headerText.trim() };
      if (detectedHeaderVars.length > 0) {
        hObj.example = { header_text: [headerSampleValue || 'Sample Header'] };
      }
      components.push(hObj);
    } else if (headerType === 'IMAGE' || headerType === 'VIDEO' || headerType === 'DOCUMENT') {
      components.push({
        type: 'HEADER',
        format: headerType,
        example: {
          header_handle: [headerMediaUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80'],
        },
      });
    }

    // Body with 2D sample array
    const bodyObj: any = {
      type: 'BODY',
      text: bodyText.trim(),
    };

    if (detectedBodyVars.length > 0) {
      bodyObj.example = {
        body_text: [detectedBodyVars.map((v) => sampleValues[v]?.trim() || `Sample_${v}`)],
      };
    }
    components.push(bodyObj);

    if (footerText.trim()) {
      components.push({ type: 'FOOTER', text: footerText.trim() });
    }

    if (buttons.length > 0) {
      const validButtons = buttons.map((b) => {
        const btn: any = { type: b.type, text: b.text.trim() };
        if (b.type === 'URL') {
          btn.url = b.url?.trim() || 'https://example.com';
          if (btn.url.includes('{{1}}')) {
            btn.example = [b.urlSample || 'sample_slug'];
          }
        } else if (b.type === 'PHONE_NUMBER') {
          btn.phone_number = b.phone_number?.trim() || '+971501234567';
        }
        return btn;
      });
      components.push({ type: 'BUTTONS', buttons: validButtons });
    }

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim().toLowerCase(),
          category,
          language,
          components,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit template to Meta');
      }

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={(o) => !o && onClose()}
      size="xl"
      contentClassName="max-h-[80vh]"
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          Meta WhatsApp template creator
        </span>
      }
      description="Design a template and submit it to Meta for approval"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="template-builder-form" disabled={isSubmitting || validationErrors.length > 0}>
            {isSubmitting ? 'Submitting to Meta…' : 'Submit for approval'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Form: 7 cols */}
        <form id="template-builder-form" onSubmit={handleSubmit} className="space-y-5 lg:col-span-7">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-2.5 text-xs text-destructive">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Submission Rejected</p>
                  <p className="mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Template Identity */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Template Name (lower_snake_case) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. order_confirmed_notification"
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  className="input-base font-mono text-xs"
                  required
                />
                <span className="text-2xs text-muted-foreground">Only lowercase letters, numbers, and underscores.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="input-base text-xs font-medium"
                  >
                    <option value="MARKETING">Marketing (Promotional / Sales)</option>
                    <option value="UTILITY">Utility (Order Updates / Alerts)</option>
                    <option value="AUTHENTICATION">Authentication (OTP Verification)</option>
                  </select>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Language *</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="input-base text-xs font-medium"
                  >
                    {META_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name} ({lang.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Header Configuration */}
            <div className="p-4 bg-muted rounded-xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Header (Optional)
                </label>
                <div className="flex items-center gap-1">
                  {(['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setHeaderType(type)}
                      className={`px-2 py-1 rounded-md text-2xs font-bold transition-all ${
                        headerType === type
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-white text-muted-foreground border border-border hover:bg-muted'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {headerType === 'TEXT' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="e.g. Order #{{1}} Update"
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                    className="input-base text-xs"
                  />
                  {detectedHeaderVars.length > 0 && (
                    <input
                      type="text"
                      placeholder="Sample value for Header {{1}} (e.g. 98214)"
                      value={headerSampleValue}
                      onChange={(e) => setHeaderSampleValue(e.target.value)}
                      className="input-base text-xs font-mono bg-card"
                    />
                  )}
                </div>
              )}

              {headerType === 'IMAGE' && (
                <input
                  type="text"
                  placeholder="Sample Image URL (e.g. https://images.unsplash.com/...)"
                  value={headerMediaUrl}
                  onChange={(e) => setHeaderMediaUrl(e.target.value)}
                  className="input-base text-xs font-mono"
                />
              )}
            </div>

            {/* Body Text & Variable Matrix */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Body Text *
                </label>
                <button
                  type="button"
                  onClick={handleInsertBodyVar}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-brand-subtle px-2.5 py-1 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Variable &#123;&#123;{detectedBodyVars.length + 1}&#125;&#125;</span>
                </button>
              </div>

              <textarea
                rows={4}
                maxLength={1024}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Type your message body here. Use {{1}}, {{2}} for dynamic customer tags."
                className="input-base text-xs resize-none"
                required
              />

              <div className="flex justify-between text-2xs text-muted-foreground">
                <span>Variables: &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125;</span>
                <span>{bodyText.length} / 1024 chars</span>
              </div>

              {/* Explicit Realistic Sample Variable Inputs */}
              {detectedBodyVars.length > 0 && (
                <div className="p-3 bg-warning-subtle border border-warning/20 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-warning-subtle-foreground">
                    <Sparkles className="w-3.5 h-3.5 text-warning" />
                    <span>Provide Realistic Sample Values (Required by Meta for Approval)</span>
                  </div>
                  <p className="text-2xs text-warning-subtle-foreground">
                    Meta AI requires realistic sample text for every variable to verify policy compliance.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {detectedBodyVars.map((v) => (
                      <div key={v} className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-warning-subtle-foreground bg-warning/20 px-2 py-1 rounded">
                          &#123;&#123;{v}&#125;&#125;
                        </span>
                        <input
                          type="text"
                          value={sampleValues[v] || ''}
                          onChange={(e) => setSampleValues({ ...sampleValues, [v]: e.target.value })}
                          placeholder={`Realistic sample for {{${v}}}`}
                          className="input-base text-xs bg-card flex-1"
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Footer Text (Optional)</label>
              <input
                type="text"
                maxLength={60}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="e.g. Reply STOP to opt out"
                className="input-base text-xs"
              />
            </div>

            {/* Interactive Buttons */}
            <div className="p-4 bg-muted rounded-xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Interactive Buttons (Up to 10)
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleAddButton('QUICK_REPLY')}
                    disabled={buttons.length >= 10}
                    className="px-2 py-1 bg-card hover:bg-muted border border-border rounded text-2xs font-bold text-foreground"
                  >
                    + Quick Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddButton('URL')}
                    disabled={buttons.length >= 10}
                    className="px-2 py-1 bg-card hover:bg-muted border border-border rounded text-2xs font-bold text-foreground"
                  >
                    + URL Link
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddButton('PHONE_NUMBER')}
                    disabled={buttons.length >= 10}
                    className="px-2 py-1 bg-card hover:bg-muted border border-border rounded text-2xs font-bold text-foreground"
                  >
                    + Phone Call
                  </button>
                </div>
              </div>

              {buttons.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No buttons attached.</p>
              ) : (
                <div className="space-y-2">
                  {buttons.map((btn, idx) => (
                    <div key={idx} className="p-2.5 bg-card rounded-lg border border-border space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-2xs font-bold uppercase tracking-wider text-primary bg-brand-subtle px-1.5 py-0.5 rounded">
                          {btn.type.replace('_', ' ')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveButton(idx)}
                          className="p-1 text-muted-foreground hover:text-destructive rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        maxLength={25}
                        placeholder="Button Label Text (max 25 chars)"
                        value={btn.text}
                        onChange={(e) => {
                          const copy = [...buttons];
                          copy[idx].text = e.target.value;
                          setButtons(copy);
                        }}
                        className="input-base text-xs"
                        required
                      />

                      {btn.type === 'URL' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="url"
                            placeholder="https://example.com/orders/{{1}}"
                            value={btn.url || ''}
                            onChange={(e) => {
                              const copy = [...buttons];
                              copy[idx].url = e.target.value;
                              setButtons(copy);
                            }}
                            className="input-base text-xs font-mono"
                            required
                          />
                          {btn.url?.includes('{{1}}') && (
                            <input
                              type="text"
                              placeholder="Sample slug (e.g. ORD-9812)"
                              value={btn.urlSample || ''}
                              onChange={(e) => {
                                const copy = [...buttons];
                                copy[idx].urlSample = e.target.value;
                                setButtons(copy);
                              }}
                              className="input-base text-xs font-mono"
                              required
                            />
                          )}
                        </div>
                      )}

                      {btn.type === 'PHONE_NUMBER' && (
                        <input
                          type="text"
                          placeholder="+971501234567"
                          value={btn.phone_number || ''}
                          onChange={(e) => {
                            const copy = [...buttons];
                            copy[idx].phone_number = e.target.value;
                            setButtons(copy);
                          }}
                          className="input-base text-xs font-mono"
                          required
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

        </form>

        {/* Right Live WhatsApp Mockup: 5 cols */}
        <div className="flex flex-col items-center lg:col-span-5">
          <div className="sticky top-0 w-full space-y-2">
            <div className="flex items-center justify-between px-1 text-xs font-bold text-foreground">
              <span>Real-time WhatsApp handset preview</span>
              <span className="text-2xs font-semibold text-primary">Live rendering</span>
            </div>
            <WhatsAppMockupPreview components={previewComponents} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
