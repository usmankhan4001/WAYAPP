'use client';

import React from 'react';
import { MetaTemplateComponent } from '@/lib/whatsapp/types';

interface VariableMapperProps {
  template: any;
  mappings: Record<string, string>;
  headerMediaUrl: string;
  onChangeMapping: (key: string, value: string) => void;
  onChangeHeaderUrl: (url: string) => void;
}

export function VariableMapper({
  template,
  mappings,
  headerMediaUrl,
  onChangeMapping,
  onChangeHeaderUrl,
}: VariableMapperProps) {
  if (!template) return null;

  let components: MetaTemplateComponent[] = [];
  try {
    components = typeof template.components === 'string' ? JSON.parse(template.components) : template.components;
  } catch {
    components = [];
  }

  const headerComp = components.find((c) => c.type === 'HEADER');
  const bodyComp = components.find((c) => c.type === 'BODY');

  // Detect all variables in body like {{1}}, {{2}}, etc.
  const bodyMatches = bodyComp?.text?.match(/\{\{(\d+)\}\}/g) || [];
  const uniqueVarIndices = Array.from(new Set(bodyMatches.map((m) => m.replace(/[^0-9]/g, ''))));

  return (
    <div className="space-y-4">
      {/* Header Media Mapping if template has IMAGE format */}
      {headerComp?.format === 'IMAGE' && (
        <div className="p-4 bg-muted rounded-xl border border-border space-y-2">
          <label className="block text-xs font-bold text-foreground">
            Header Image URL <span className="text-destructive">*</span>
          </label>
          <p className="text-[11px] text-muted-foreground">
            Provide a direct public image link (JPEG/PNG) to attach to the top of this template message.
          </p>
          <input
            type="url"
            required
            placeholder="https://images.unsplash.com/... or https://example.com/promo.jpg"
            value={headerMediaUrl}
            onChange={(e) => onChangeHeaderUrl(e.target.value)}
            className="w-full px-3 py-2 h-9 text-xs rounded-lg border border-input bg-transparent outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {/* Body Variables Mapping */}
      {uniqueVarIndices.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Map Template Variables ({uniqueVarIndices.length} placeholders)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {uniqueVarIndices.map((varIdx) => {
              const currentVal = mappings[varIdx] || '';
              const exampleSample = bodyComp?.example?.body_text?.[0]?.[parseInt(varIdx, 10) - 1] || '';

              return (
                <div key={varIdx} className="p-3 bg-muted rounded-xl border border-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary font-mono">
                      Placeholder {"{{" + varIdx + "}}"}
                    </span>
                    {exampleSample && (
                      <span className="text-[10px] text-muted-foreground">Sample: &ldquo;{exampleSample}&rdquo;</span>
                    )}
                  </div>

                  <select
                    value={currentVal}
                    onChange={(e) => onChangeMapping(varIdx, e.target.value)}
                    className="w-full px-3 py-1.5 h-9 text-xs rounded-lg border border-input bg-transparent outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select contact field...</option>
                    <optgroup label="Standard Contact Fields">
                      <option value="firstName">Contact First Name</option>
                      <option value="lastName">Contact Last Name</option>
                      <option value="fullName">Contact Full Name</option>
                      <option value="phoneNumber">Contact Phone Number</option>
                      <option value="email">Contact Email</option>
                    </optgroup>
                    <optgroup label="Dynamic Custom Attributes">
                      <option value="custom.company">Company Name</option>
                      <option value="custom.city">City / Location</option>
                      <option value="custom.order_id">Order ID</option>
                      <option value="custom.spend">Total Spend Amount</option>
                      <option value="custom.tier">VIP Membership Tier</option>
                    </optgroup>
                  </select>

                  {/* Or allow typing custom static fallback if needed */}
                  {!['firstName', 'lastName', 'fullName', 'phoneNumber', 'email'].includes(currentVal) &&
                    !currentVal.startsWith('custom.') && (
                      <input
                        type="text"
                        placeholder="Or enter static text value..."
                        value={currentVal}
                        onChange={(e) => onChangeMapping(varIdx, e.target.value)}
                        className="w-full px-2.5 py-1 h-9 text-xs rounded-lg border border-input bg-transparent"
                      />
                    )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-muted rounded-xl border border-border text-center text-xs text-muted-foreground">
          This template contains no dynamic body placeholders.
        </div>
      )}
    </div>
  );
}
