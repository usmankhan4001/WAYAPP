'use client';

import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  if (!content) return <>{children}</>;

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-1.5';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-1.5';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-1.5';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-1.5';
    }
  };

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <div
          role="tooltip"
          className={`absolute z-50 px-2 py-1 text-[11px] font-normal leading-normal text-slate-100 bg-slate-900 rounded-md shadow-md whitespace-normal max-w-xs w-max pointer-events-none transition-opacity duration-150 animate-in fade-in-0 zoom-in-95 ${getPositionClasses()}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}

/**
 * Minimal, subtle info help icon with attached tooltip
 */
export function InfoTooltip({
  content,
  size = 13,
  position = 'top',
}: {
  content: string;
  size?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
}) {
  return (
    <Tooltip content={content} position={position}>
      <span className="text-slate-400 hover:text-slate-600 transition-colors cursor-help inline-flex items-center p-0.5">
        <HelpCircle style={{ width: size, height: size }} />
      </span>
    </Tooltip>
  );
}
