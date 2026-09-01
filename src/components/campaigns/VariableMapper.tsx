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
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            Header Image URL <span className="text-red-500">*</span>
          </label>
          <p className="text-[11px] text-slate-500">
            Provide a direct public image link (JPEG/PNG) to attach to the top of this template message.
          </p>
          <input
            type="url"
            required
            placeholder="https://images.unsplash.com/... or https://example.com/promo.jpg"
            value={headerMediaUrl}
            onChange={(e) => onChangeHeaderUrl(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      )}

      {/* Body Variables Mapping */}
      {uniqueVarIndices.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Map Template Variables ({uniqueVarIndices.length} placeholders)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {uniqueVarIndices.map((varIdx) => {
              const currentVal = mappings[varIdx] || '';
              const exampleSample = bodyComp?.example?.body_text?.[0]?.[parseInt(varIdx, 10) - 1] || '';

              return (
                <div key={varIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 font-mono">
                      Placeholder {"{{" + varIdx + "}}"}
                    </span>
                    {exampleSample && (
                      <span className="text-[10px] text-slate-400">Sample: &ldquo;{exampleSample}&rdquo;</span>
                    )}
                  </div>

                  <select
                    value={currentVal}
                    onChange={(e) => onChangeMapping(varIdx, e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
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
                        className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white"
                      />
                    )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
          This template contains no dynamic body placeholders.
        </div>
      )}
    </div>
  );
}
