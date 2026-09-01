'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  DollarSign,
  Calculator,
  CheckCircle2,
  Zap,
  Globe,
  Info,
} from 'lucide-react';

interface CountryRate {
  code: string;
  name: string;
  currency: string;
  symbol: string;
  exchangeRate: number; // to USD
  marketing: number; // in USD
  utility: number; // in USD
  authentication: number; // in USD
  service: number; // in USD
}

const COUNTRY_RATES: CountryRate[] = [
  {
    code: 'AE',
    name: 'United Arab Emirates (+971)',
    currency: 'AED',
    symbol: 'AED',
    exchangeRate: 3.67,
    marketing: 0.0345,
    utility: 0.0163,
    authentication: 0.0163,
    service: 0.0182,
  },
  {
    code: 'SA',
    name: 'Saudi Arabia (+966)',
    currency: 'SAR',
    symbol: 'SAR',
    exchangeRate: 3.75,
    marketing: 0.0412,
    utility: 0.0195,
    authentication: 0.0195,
    service: 0.0210,
  },
  {
    code: 'US',
    name: 'United States & Canada (+1)',
    currency: 'USD',
    symbol: '$',
    exchangeRate: 1.0,
    marketing: 0.0250,
    utility: 0.0150,
    authentication: 0.0135,
    service: 0.0100,
  },
  {
    code: 'GB',
    name: 'United Kingdom (+44)',
    currency: 'GBP',
    symbol: '£',
    exchangeRate: 0.79,
    marketing: 0.0425,
    utility: 0.0220,
    authentication: 0.0210,
    service: 0.0240,
  },
  {
    code: 'IN',
    name: 'India (+91)',
    currency: 'INR',
    symbol: '₹',
    exchangeRate: 86.5,
    marketing: 0.0099,
    utility: 0.0042,
    authentication: 0.0042,
    service: 0.0048,
  },
  {
    code: 'EG',
    name: 'Egypt (+20)',
    currency: 'EGP',
    symbol: 'EGP',
    exchangeRate: 50.2,
    marketing: 0.0825,
    utility: 0.0180,
    authentication: 0.0180,
    service: 0.0220,
  },
  {
    code: 'DE',
    name: 'Germany & EU (+49)',
    currency: 'EUR',
    symbol: '€',
    exchangeRate: 0.95,
    marketing: 0.0780,
    utility: 0.0390,
    authentication: 0.0380,
    service: 0.0420,
  },
];

export function MetaBillingSection() {
  const [selectedCountryCode, setSelectedCountryCode] = useState('AE');
  const [useLocalCurrency, setUseLocalCurrency] = useState(true);

  // Cost Calculator State
  const [marketingVolume, setMarketingVolume] = useState(5000);
  const [utilityVolume, setUtilityVolume] = useState(1000);
  const [serviceVolume, setServiceVolume] = useState(800);

  const currentRate = COUNTRY_RATES.find((r) => r.code === selectedCountryCode) || COUNTRY_RATES[0];

  // Billable Service Conversations (first 1,000 free per WABA per month)
  const freeServiceLimit = 1000;
  const billableServiceVolume = Math.max(0, serviceVolume - freeServiceLimit);

  // Cost calculations in USD
  const marketingCostUSD = marketingVolume * currentRate.marketing;
  const utilityCostUSD = utilityVolume * currentRate.utility;
  const serviceCostUSD = billableServiceVolume * currentRate.service;
  const totalCostUSD = marketingCostUSD + utilityCostUSD + serviceCostUSD;

  // Formatter
  const formatCost = (costUSD: number) => {
    if (useLocalCurrency && currentRate.currency !== 'USD') {
      const converted = costUSD * currentRate.exchangeRate;
      return `${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currentRate.symbol}`;
    }
    return `$${costUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  };

  const formatUnitRate = (rateUSD: number) => {
    if (useLocalCurrency && currentRate.currency !== 'USD') {
      const converted = rateUSD * currentRate.exchangeRate;
      return `${converted.toFixed(4)} ${currentRate.symbol}`;
    }
    return `$${rateUSD.toFixed(4)} USD`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Meta Direct Billing Explanation */}
      <div className="card-base p-5 bg-linear-to-r from-primary/90 to-foreground text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/15 text-primary">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Official Meta Cloud API Billing</span>
            </div>
            <h2 className="text-lg font-bold tracking-tight">WhatsApp Conversation-Based Pricing (CBP)</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Meta charges directly to the payment method attached to your WhatsApp Business Account in Meta Business Manager. WAYAPP does not mark up message costs.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://business.facebook.com/settings/whatsapp-business-accounts"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 active:scale-95 text-white font-semibold text-xs inline-flex items-center gap-2 shadow-sm transition-all"
            >
              <span>Meta Payment Settings</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Free Tier Monthly Counter */}
      <div className="card-base p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-subtle text-primary flex items-center justify-center font-bold text-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">1,000 Free Service Conversations Monthly</h3>
              <p className="text-xs text-muted-foreground">Every WhatsApp Business Account receives 1,000 free customer-initiated service chats every calendar month.</p>
            </div>
          </div>
          <span className="text-xs font-bold text-primary bg-brand-subtle px-2.5 py-1 rounded-full border border-transparent">
            Free Tier Active
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Monthly Free Service Conversations</span>
            <span className="font-mono font-bold text-primary">
              {Math.min(serviceVolume, 1000)} / 1,000 used
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (serviceVolume / 1000) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {serviceVolume <= 1000
              ? `You have ${1000 - serviceVolume} free service conversations remaining this month.`
              : `You have exceeded the 1,000 free tier limit by ${serviceVolume - 1000} conversations.`}
          </p>
        </div>
      </div>

      {/* 4 Conversation Categories Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        <div className="card-base p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Marketing</span>
            <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              Broadcasts
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Promotional broadcasts, seasonal offers, and retargeting messages.
          </p>
          <div className="pt-2 border-t border-border">
            <span className="text-[10px] text-muted-foreground block uppercase">Rate per 24h</span>
            <span className="text-sm font-mono font-bold text-foreground">
              {formatUnitRate(currentRate.marketing)}
            </span>
          </div>
        </div>

        <div className="card-base p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Utility</span>
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Transactional
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Order receipts, tracking updates, booking confirmations, and alerts.
          </p>
          <div className="pt-2 border-t border-border">
            <span className="text-[10px] text-muted-foreground block uppercase">Rate per 24h</span>
            <span className="text-sm font-mono font-bold text-foreground">
              {formatUnitRate(currentRate.utility)}
            </span>
          </div>
        </div>

        <div className="card-base p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Authentication</span>
            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              OTPs & Security
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-tight">
            One-time passwords, login verifications, and account security codes.
          </p>
          <div className="pt-2 border-t border-border">
            <span className="text-[10px] text-muted-foreground block uppercase">Rate per 24h</span>
            <span className="text-sm font-mono font-bold text-foreground">
              {formatUnitRate(currentRate.authentication)}
            </span>
          </div>
        </div>

        <div className="card-base p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Service (Support)</span>
            <span className="text-[10px] font-semibold text-primary bg-brand-subtle px-2 py-0.5 rounded-full border border-transparent">
              1,000 Free
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Customer-initiated support conversations and live 2-way inquiries.
          </p>
          <div className="pt-2 border-t border-border">
            <span className="text-[10px] text-muted-foreground block uppercase">Rate beyond 1,000</span>
            <span className="text-sm font-mono font-bold text-foreground">
              {formatUnitRate(currentRate.service)}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Monthly Cost Estimator */}
      <div className="card-base p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand-subtle-foreground flex items-center justify-center font-bold text-xs">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Monthly Meta Cloud API Cost Calculator</h3>
              <p className="text-xs text-muted-foreground">Estimate your monthly WhatsApp billing based on expected recipient volumes.</p>
            </div>
          </div>

          {/* Country & Currency Controls */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCountryCode}
              onChange={(e) => setSelectedCountryCode(e.target.value)}
              className="text-xs font-semibold rounded-xl border border-border bg-muted px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
            >
              {COUNTRY_RATES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setUseLocalCurrency(!useLocalCurrency)}
              className="text-xs font-semibold rounded-xl border border-border bg-card hover:bg-accent px-2.5 py-1.5 text-foreground shadow-2xs transition-all"
            >
              {useLocalCurrency ? currentRate.currency : 'USD'}
            </button>
          </div>
        </div>

        {/* Volume Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-foreground">Marketing Broadcasts</label>
              <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                {marketingVolume.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50000"
              step="500"
              value={marketingVolume}
              onChange={(e) => setMarketingVolume(Number(e.target.value))}
              className="w-full accent-purple-600 h-2 bg-muted rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-muted-foreground">
              Estimated: <span className="font-mono font-semibold text-foreground">{formatCost(marketingCostUSD)}</span>
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-foreground">Utility Notifications</label>
              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                {utilityVolume.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="20000"
              step="200"
              value={utilityVolume}
              onChange={(e) => setUtilityVolume(Number(e.target.value))}
              className="w-full accent-blue-600 h-2 bg-muted rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-muted-foreground">
              Estimated: <span className="font-mono font-semibold text-foreground">{formatCost(utilityCostUSD)}</span>
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-foreground">Customer Support (Service)</label>
              <span className="font-mono font-bold text-primary bg-brand-subtle px-2 py-0.5 rounded-lg border border-transparent">
                {serviceVolume.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10000"
              step="100"
              value={serviceVolume}
              onChange={(e) => setServiceVolume(Number(e.target.value))}
              className="w-full accent-[var(--primary)] h-2 bg-muted rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-muted-foreground">
              {serviceVolume <= 1000 ? (
                <span className="text-primary font-semibold">100% Covered by 1,000 Free Tier</span>
              ) : (
                <span>Billable: <span className="font-mono font-semibold text-foreground">{formatCost(serviceCostUSD)}</span></span>
              )}
            </p>
          </div>
        </div>

        {/* Total Estimate Summary */}
        <div className="p-4 rounded-xl bg-muted border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs text-muted-foreground font-medium block">Estimated Monthly Meta API Bill</span>
            <span className="text-2xl font-bold font-mono text-foreground tracking-tight">
              {formatCost(totalCostUSD)}
            </span>
          </div>

          <div className="text-xs text-muted-foreground max-w-xs sm:text-right">
            <span>Billed directly by Meta Platforms, Inc. on your attached credit card or invoice.</span>
          </div>
        </div>
      </div>

      {/* Troubleshooting: Payment Method Issue (Meta Error 131042) */}
      <div className="card-base p-5 border-l-4 border-l-amber-500 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span>Need Help with Meta Billing or Error 131042?</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          If you receive error code <code className="bg-muted px-1 py-0.5 rounded font-mono text-[11px]">131042 (Business Account Payment Issue)</code>, it means Meta requires a credit card attached to your WhatsApp Business Account before additional outbound messages can be dispatched.
        </p>
        <div className="pt-2">
          <a
            href="https://business.facebook.com/billing_hub"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            <span>Open Meta Business Billing Hub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
