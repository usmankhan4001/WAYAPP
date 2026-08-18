'use client';

import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface MediaLightboxProps {
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'document' | 'audio';
  caption?: string;
  onClose: () => void;
}

export function MediaLightbox({ mediaUrl, mediaType, caption, onClose }: MediaLightboxProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
      {/* Top Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between text-white p-2 mb-2">
        <div className="text-xs font-semibold truncate max-w-md">
          {caption || 'Media Preview'}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={mediaUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1.5 text-xs font-medium"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </a>

          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-rose-600 text-white transition-all ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl max-h-[80vh] flex items-center justify-center overflow-hidden rounded-2xl">
        {mediaType === 'image' ? (
          <img
            src={mediaUrl}
            alt={caption || 'Preview'}
            className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
          />
        ) : mediaType === 'video' ? (
          <video
            src={mediaUrl}
            controls
            autoPlay
            className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
          />
        ) : (
          <div className="p-8 bg-slate-900 text-white rounded-2xl border border-slate-800 text-center space-y-4">
            <p className="text-sm font-semibold">Document Preview</p>
            <a
              href={mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold"
            >
              <Download className="w-4 h-4" />
              <span>Download / Open Document</span>
            </a>
          </div>
        )}
      </div>

      {caption && (
        <div className="mt-3 text-center text-xs text-slate-300 max-w-lg">
          {caption}
        </div>
      )}
    </div>
  );
}
