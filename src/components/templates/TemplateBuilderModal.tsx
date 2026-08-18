'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, Sparkles, AlertCircle } from 'lucide-react';
import { WhatsAppMockupPreview } from './WhatsAppMockupPreview';
import { InfoTooltip } from '@/components/ui/Tooltip';

interface TemplateBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function TemplateBuilderModal({ isOpen, onClose, onCreated }: TemplateBuilderModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('MARKETING');
  const [language, setLanguage] = useState('en_US');
  const [headerType, setHeaderType] = useState<'NONE' | 'TEXT' | 'IMAGE'>('NONE');
  const [headerText, setHeaderText] = useState('');
  const [headerImageUrl, setHeaderImageUrl] = useState('');
  const [bodyText, setBodyText] = useState(
    'Hi {{1}}, thank you for contacting us! We have an update regarding {{2}}.'
  );
  const [footerText, setFooterText] = useState('Reply STOP to unsubscribe');
  const [buttons, setButtons] = useState<
    Array<{ type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'; text: string; url?: string; phone_number?: string }>
  >([
    { type: 'QUICK_REPLY', text: 'Talk to Representative' },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const previewComponents: any[] = [];
  if (headerType === 'TEXT' && headerText) {
    previewComponents.push({ type: 'HEADER', format: 'TEXT', text: headerText });
  } else if (headerType === 'IMAGE') {
    previewComponents.push({
      type: 'HEADER',
      format: 'IMAGE',
      example: { header_handle: [headerImageUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80'] },
    });
  }

  previewComponents.push({ type: 'BODY', text: bodyText });
  if (footerText) previewComponents.push({ type: 'FOOTER', text: footerText });
  if (buttons.length > 0) previewComponents.push({ type: 'BUTTONS', buttons });

  const handleAddButton = () => {
    if (buttons.length >= 3) return;
    setButtons([...buttons, { type: 'QUICK_REPLY', text: 'Quick Action' }]);
  };

  const handleRemoveButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          language,
          components: previewComponents,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to create template');
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Create Meta WhatsApp Template</h3>
            <p className="text-xs text-slate-500">Design and submit a new message template for Meta approval</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Left Side */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Template Name & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <InfoTooltip content="Unique identifier for Meta. Must be lowercase letters, numbers, and underscores only." />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. order_update_v1"
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-xs font-bold text-slate-700">Category</label>
                  <InfoTooltip content="Marketing for promotional broadcasts, Utility for transactional/order updates, Authentication for OTP codes." />
                </div>
                <select
                  value={category}
                  onChange={(e: any) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="MARKETING">Marketing (Promotions, Offers)</option>
                  <option value="UTILITY">Utility (Orders, Invoices, Alerts)</option>
                  <option value="AUTHENTICATION">Authentication (OTPs, Security)</option>
                </select>
              </div>
            </div>

            {/* Header Component */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-1">
                <label className="text-xs font-bold text-slate-800">Header Media / Text</label>
                <InfoTooltip content="Optional top element. You can attach a high-resolution promotional image or bold headline text." />
              </div>
              <div className="flex gap-4 text-xs font-medium text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="headerType"
                    checked={headerType === 'NONE'}
                    onChange={() => setHeaderType('NONE')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>None</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="headerType"
                    checked={headerType === 'TEXT'}
                    onChange={() => setHeaderType('TEXT')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Text Headline</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="headerType"
                    checked={headerType === 'IMAGE'}
                    onChange={() => setHeaderType('IMAGE')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Image Banner</span>
                </label>
              </div>

              {headerType === 'TEXT' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-slate-400">Max 60 characters</span>
                    <span className={`text-[10px] font-mono ${headerText.length > 55 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                      {headerText.length}/60
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="Header text e.g. Exclusive VIP Announcement"
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              )}

              {headerType === 'IMAGE' && (
                <input
                  type="url"
                  placeholder="Sample Image URL e.g. https://images.unsplash.com/..."
                  value={headerImageUrl}
                  onChange={(e) => setHeaderImageUrl(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                />
              )}
            </div>

            {/* Body */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <label className="text-xs font-bold text-slate-700">
                    Message Body <span className="text-red-500">*</span>
                  </label>
                  <InfoTooltip content="The main text message. Insert {{1}}, {{2}} to dynamically personalize with customer names, order IDs, or promo codes." />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">Insert:</span>
                    <button
                      type="button"
                      onClick={() => setBodyText((prev) => prev + ' {{1}}')}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      +{"{{1}}"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBodyText((prev) => prev + ' {{2}}')}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      +{"{{2}}"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBodyText((prev) => prev + ' {{3}}')}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      +{"{{3}}"}
                    </button>
                  </div>
                  <span className={`text-[10px] font-mono ${bodyText.length > 950 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                    {bodyText.length}/1024
                  </span>
                </div>
              </div>
              <textarea
                rows={4}
                required
                maxLength={1024}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Type message text..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
              />
            </div>

            {/* Footer */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <label className="text-xs font-bold text-slate-700">Footer Text</label>
                  <InfoTooltip content="Light grey text displayed at the bottom of the WhatsApp bubble. Commonly used for unsubscribe instructions." />
                </div>
                <span className={`text-[10px] font-mono ${footerText.length > 55 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                  {footerText.length}/60
                </span>
              </div>
              <input
                type="text"
                maxLength={60}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="e.g. Reply STOP to opt out"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Buttons */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <label className="text-xs font-bold text-slate-800">Call-to-Action Buttons (Max 3)</label>
                  <InfoTooltip content="Interactive buttons placed below the message. Quick Replies trigger customer responses, URLs open websites." />
                </div>
                {buttons.length < 3 && (
                  <button
                    type="button"
                    onClick={handleAddButton}
                    className="text-xs text-emerald-700 hover:underline font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Button</span>
                  </button>
                )}
              </div>

              {buttons.map((btn, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={btn.type}
                    onChange={(e: any) => {
                      const updated = [...buttons];
                      updated[index].type = e.target.value;
                      setButtons(updated);
                    }}
                    className="px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="QUICK_REPLY">Quick Reply</option>
                    <option value="URL">Visit Website</option>
                    <option value="PHONE_NUMBER">Call Phone</option>
                  </select>
                  <input
                    type="text"
                    maxLength={25}
                    placeholder="Label (max 25)"
                    value={btn.text}
                    onChange={(e) => {
                      const updated = [...buttons];
                      updated[index].text = e.target.value;
                      setButtons(updated);
                    }}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                  {btn.type === 'URL' && (
                    <input
                      type="url"
                      placeholder="https://..."
                      value={btn.url || ''}
                      onChange={(e) => {
                        const updated = [...buttons];
                        updated[index].url = e.target.value;
                        setButtons(updated);
                      }}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveButton(index)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting to Meta...' : 'Save & Submit Template'}
              </button>
            </div>
          </form>

          {/* Live Preview Right Side */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
              Real-time WhatsApp Preview
            </h4>
            <WhatsAppMockupPreview
              templateName={name || 'Template Preview'}
              category={category}
              components={previewComponents}
              headerMediaUrl={headerImageUrl}
              sampleVariables={{ '1': 'Customer', '2': 'Apex Store', '3': 'PROMO20' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
