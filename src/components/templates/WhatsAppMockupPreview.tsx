'use client';

import React from 'react';
import { ExternalLink, Phone, Reply, CheckCheck, Clock } from 'lucide-react';
import { MetaTemplateComponent } from '@/lib/whatsapp/types';

interface WhatsAppMockupProps {
  templateName?: string;
  category?: string;
  components?: MetaTemplateComponent[] | string;
  sampleVariables?: Record<string, string>;
  headerMediaUrl?: string;
  businessName?: string;
}

export function WhatsAppMockupPreview({
  templateName = 'Template Preview',
  category = 'MARKETING',
  components = [],
  sampleVariables = {},
  headerMediaUrl,
  businessName = 'Apex WhatsApp Business',
}: WhatsAppMockupProps) {
  let parsedComponents: MetaTemplateComponent[] = [];

  if (typeof components === 'string') {
    try {
      parsedComponents = JSON.parse(components);
    } catch {
      parsedComponents = [];
    }
  } else if (Array.isArray(components)) {
    parsedComponents = components;
  }

  const headerComp = parsedComponents.find((c) => c.type === 'HEADER');
  const bodyComp = parsedComponents.find((c) => c.type === 'BODY');
  const footerComp = parsedComponents.find((c) => c.type === 'FOOTER');
  const buttonsComp = parsedComponents.find((c) => c.type === 'BUTTONS');

  // Interpolate body variables like {{1}}, {{2}}
  let renderedBody = bodyComp?.text || 'Hello {{1}}, welcome to our WhatsApp service!';
  Object.keys(sampleVariables).forEach((key) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    renderedBody = renderedBody.replace(regex, sampleVariables[key] || `{{${key}}}`);
  });

  return (
    <div className="w-full max-w-[340px] mx-auto bg-slate-900 rounded-[38px] p-3 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-700/50">
      {/* Smartphone Notch & Speaker */}
      <div className="flex justify-center mb-2">
        <div className="w-24 h-4 bg-slate-800 rounded-full flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-700" />
          <div className="w-8 h-1 bg-slate-700 rounded-full" />
        </div>
      </div>

      {/* Screen Area */}
      <div className="rounded-[28px] overflow-hidden flex flex-col bg-whatsapp-chatBgDark h-[520px] shadow-inner border border-slate-800/80 relative">
        {/* WhatsApp Header Bar */}
        <div className="bg-[#1f2c34] px-3.5 py-2.5 flex items-center gap-2.5 text-white shadow-sm shrink-0">
          <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-2xs font-bold">
            WA
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-slate-100 truncate">{businessName}</h4>
            <p className="text-2xs text-emerald-400 leading-none">Official Business Account</p>
          </div>
        </div>

        {/* Chat Background & Bubble */}
        <div className="flex-1 p-3 whatsapp-bg overflow-y-auto flex flex-col justify-end">
          <div className="max-w-[92%] self-start bg-white rounded-2xl rounded-tl-sm p-2.5 shadow-sm border border-slate-200/70 text-slate-800 text-xs">
            {/* Header */}
            {headerComp && (
              <div className="mb-2">
                {headerComp.format === 'IMAGE' ? (
                  <div className="w-full h-32 rounded-lg bg-slate-200 overflow-hidden relative mb-1.5 flex items-center justify-center">
                    {headerMediaUrl || headerComp.example?.header_handle?.[0] ? (
                      <img
                        src={headerMediaUrl || headerComp.example?.header_handle?.[0]}
                        alt="Header"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xs text-slate-500 font-medium">[ Header Image ]</span>
                    )}
                  </div>
                ) : (
                  <div className="font-bold text-slate-900 text-xs pb-1">
                    {headerComp.text}
                  </div>
                )}
              </div>
            )}

            {/* Body */}
            <div className="whitespace-pre-wrap leading-relaxed text-slate-800 text-[11.5px]">
              {renderedBody}
            </div>

            {/* Footer */}
            {footerComp?.text && (
              <div className="mt-1.5 text-2xs text-slate-600">
                {footerComp.text}
              </div>
            )}

            {/* Timestamp & Double Blue Ticks */}
            <div className="flex items-center justify-end gap-1 mt-1 text-2xs text-slate-400">
              <span>12:45 PM</span>
              <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
            </div>
          </div>

          {/* Action Buttons */}
          {buttonsComp?.buttons && buttonsComp.buttons.length > 0 && (
            <div className="mt-1.5 space-y-1 max-w-[92%] self-start w-full">
              {buttonsComp.buttons.map((btn, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-full py-1.5 px-3 bg-white/95 hover:bg-white rounded-xl text-center text-xs font-semibold text-[#00a884] shadow-sm border border-slate-200/80 flex items-center justify-center gap-1.5 transition-all"
                >
                  {btn.type === 'URL' && <ExternalLink className="w-3 h-3" />}
                  {btn.type === 'PHONE_NUMBER' && <Phone className="w-3 h-3" />}
                  {btn.type === 'QUICK_REPLY' && <Reply className="w-3 h-3" />}
                  <span className="truncate">{btn.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Fake Input Bottom Bar */}
        <div className="bg-[#1f2c34] p-2 flex items-center gap-2">
          <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 text-2xs text-slate-400">
            Type a message...
          </div>
          <div className="w-7 h-7 rounded-full bg-[#00a884] flex items-center justify-center text-white">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
