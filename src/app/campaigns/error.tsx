'use client';

import { useEffect } from 'react';
import { Send, RefreshCw } from 'lucide-react';

export default function CampaignsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Campaigns Error]', error);
  }, [error]);

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center mx-auto">
          <Send className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Campaign Dashboard Error</h2>
        <p className="text-sm text-slate-500">
          We couldn&apos;t load the campaigns page. Your campaign data is preserved.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reload Campaigns</span>
        </button>
      </div>
    </div>
  );
}
