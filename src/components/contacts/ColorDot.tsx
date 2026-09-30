import React from 'react';

/** A small dot in a label's own colour. SVG fill takes the runtime colour without an inline style. */
export function ColorDot({ color, className = 'size-2.5' }: { color?: string | null; className?: string }) {
  return (
    <svg viewBox="0 0 10 10" aria-hidden className={`shrink-0 ${className}`}>
      <circle cx="5" cy="5" r="5" fill={color || 'currentColor'} />
    </svg>
  );
}
