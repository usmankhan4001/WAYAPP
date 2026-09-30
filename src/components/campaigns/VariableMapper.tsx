'use client';

import React from 'react';

import { FIELD_LABELS, templateInfo } from '@/lib/campaigns/present';

interface VariableMapperProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  template: any;
  mappings: Record<string, string>;
  headerMediaUrl: string;
  onChangeMapping: (key: string, value: string) => void;
  onChangeHeaderUrl: (url: string) => void;
}

const FIELD_CLASS =
  'h-11 w-full rounded-[14px] border border-input bg-background px-3 text-base text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

const PERSON_FIELDS = ['firstName', 'lastName', 'fullName', 'phoneNumber', 'email'];
const EXTRA_FIELDS = ['custom.company', 'custom.city', 'custom.order_id', 'custom.spend', 'custom.tier'];

/** Fills each blank in the message from a contact detail, using plain labels. */
export function VariableMapper({ template, mappings, headerMediaUrl, onChangeMapping, onChangeHeaderUrl }: VariableMapperProps) {
  if (!template) return null;
  const { vars, needsHeaderImage, examples } = templateInfo(template);

  return (
    <div className="space-y-4">
      {needsHeaderImage && (
        <div className="space-y-1.5 rounded-2xl bg-muted p-4">
          <label htmlFor="header-image" className="block text-sm font-semibold text-foreground">
            Picture link
          </label>
          <p className="text-sm text-muted-foreground">This message shows a picture at the top. Paste a link to the image.</p>
          <input
            id="header-image"
            type="url"
            placeholder="https://example.com/offer.jpg"
            value={headerMediaUrl}
            onChange={(e) => onChangeHeaderUrl(e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
      )}

      {vars.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Each person gets their own details in the blanks of this message. Choose what goes in each one.
          </p>
          {vars.map((v, i) => {
            const current = mappings[v] || '';
            const isField = PERSON_FIELDS.includes(current) || current.startsWith('custom.');
            const example = examples[parseInt(v, 10) - 1];
            return (
              <div key={v} className="space-y-1.5 rounded-2xl bg-muted p-4">
                <label htmlFor={`var-${v}`} className="block text-sm font-semibold text-foreground">
                  Blank {i + 1}
                  {example ? <span className="font-normal text-muted-foreground"> (for example {example})</span> : null}
                </label>
                <select
                  id={`var-${v}`}
                  value={isField ? current : current ? '__text' : ''}
                  onChange={(e) => onChangeMapping(v, e.target.value === '__text' ? ' ' : e.target.value)}
                  className={FIELD_CLASS}
                >
                  <option value="">Choose a detail</option>
                  <optgroup label="About the person">
                    {PERSON_FIELDS.map((f) => (
                      <option key={f} value={f}>{FIELD_LABELS[f]}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Other details">
                    {EXTRA_FIELDS.map((f) => (
                      <option key={f} value={f}>{FIELD_LABELS[f]}</option>
                    ))}
                  </optgroup>
                  <option value="__text">Same text for everyone</option>
                </select>
                {!isField && current !== '' && (
                  <input
                    type="text"
                    aria-label={`Text for blank ${i + 1}`}
                    placeholder="Type the text everyone will see"
                    value={current.trim() === '' ? '' : current}
                    onChange={(e) => onChangeMapping(v, e.target.value === '' ? ' ' : e.target.value)}
                    className={FIELD_CLASS}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-2xl bg-muted p-4 text-center text-sm text-muted-foreground">
          This message has no blanks to fill in. Everyone gets the same words.
        </p>
      )}
    </div>
  );
}
