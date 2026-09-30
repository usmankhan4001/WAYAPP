import { describe, it, expect } from 'vitest';
import { ALLOWED_MIME_TYPES, normalizeMime } from '@/lib/media-types';

describe('upload file types', () => {
  it('drops the codec suffix browsers add to recorded audio', () => {
    expect(normalizeMime('audio/ogg; codecs=opus')).toBe('audio/ogg');
    expect(normalizeMime('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(ALLOWED_MIME_TYPES[normalizeMime('audio/ogg; codecs=opus')]).toBe('.ogg');
  });

  it('is case-insensitive and falls back for an empty type', () => {
    expect(normalizeMime('IMAGE/PNG')).toBe('image/png');
    expect(normalizeMime('')).toBe('application/octet-stream');
    expect(normalizeMime(undefined)).toBe('application/octet-stream');
  });

  it('accepts common Office documents', () => {
    expect(ALLOWED_MIME_TYPES['application/vnd.openxmlformats-officedocument.wordprocessingml.document']).toBe('.docx');
    expect(ALLOWED_MIME_TYPES['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']).toBe('.xlsx');
  });

  it('still rejects anything that could run script when served back', () => {
    for (const bad of ['text/html', 'image/svg+xml', 'application/javascript', 'application/xml']) {
      expect(ALLOWED_MIME_TYPES[normalizeMime(bad)]).toBeUndefined();
    }
  });
});
