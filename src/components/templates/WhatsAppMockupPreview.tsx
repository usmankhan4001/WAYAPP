'use client';

import React from 'react';
import { ExternalLink, Phone, Reply, CheckCheck, Copy } from 'lucide-react';

import { fillSamples, parseComponents } from '@/lib/templates/present';

interface WhatsAppMockupProps {
  templateName?: string;
  category?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components?: any[] | string;
  sampleVariables?: Record<string, string>;
  headerMediaUrl?: string;
  businessName?: string;
}

/** A WhatsApp-style message bubble. Semantic tokens only, so it reads in light and dark. */
export function WhatsAppMockupPreview({
  components = [],
  sampleVariables = {},
  headerMediaUrl,
  businessName = 'Your business',
}: WhatsAppMockupProps) {
  const parts = parseComponents(components);
  const header = parts.find((c) => c.type === 'HEADER');
  const body = parts.find((c) => c.type === 'BODY');
  const footer = parts.find((c) => c.type === 'FOOTER');
  const buttons: Array<{ type: string; text: string }> = parts.find((c) => c.type === 'BUTTONS')?.buttons ?? [];

  const bodyText = fillSamples(body?.text || 'Your message will appear here.', sampleVariables);
  const headerText = header?.text ? fillSamples(header.text, sampleVariables) : '';
  const mediaUrl = headerMediaUrl || header?.example?.header_handle?.[0];

  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-muted">
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {businessName.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{businessName}</p>
          <p className="text-xs text-muted-foreground">Business account</p>
        </div>
      </div>

      <div className="space-y-1.5 p-4">
        <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-border bg-card p-3 text-sm text-foreground shadow-sm">
          {header && header.format && header.format !== 'TEXT' && (
            <div className="mb-2 flex h-28 items-center justify-center overflow-hidden rounded-lg bg-muted text-xs text-muted-foreground">
              {header.format === 'IMAGE' && mediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl} alt="" className="size-full object-cover" />
              ) : (
                <span>{header.format === 'IMAGE' ? 'Picture' : header.format === 'VIDEO' ? 'Video' : 'Document'}</span>
              )}
            </div>
          )}
          {headerText && <p className="mb-1 font-semibold">{headerText}</p>}
          <p className="whitespace-pre-wrap leading-relaxed">{bodyText}</p>
          {footer?.text && <p className="mt-1.5 text-xs text-muted-foreground">{footer.text}</p>}
          <div className="mt-1 flex items-center justify-end gap-1 text-xs text-muted-foreground">
            <span>12:45</span>
            <CheckCheck className="size-3.5 text-info" aria-hidden />
          </div>
        </div>

        {buttons.length > 0 && (
          <div className="max-w-[92%] space-y-1.5">
            {buttons.map((btn, i) => (
              <div
                key={i}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-primary shadow-sm"
              >
                {btn.type === 'URL' && <ExternalLink className="size-3.5" aria-hidden />}
                {btn.type === 'PHONE_NUMBER' && <Phone className="size-3.5" aria-hidden />}
                {btn.type === 'QUICK_REPLY' && <Reply className="size-3.5" aria-hidden />}
                {btn.type === 'COPY_CODE' && <Copy className="size-3.5" aria-hidden />}
                <span className="truncate">{btn.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
