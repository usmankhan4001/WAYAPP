import { describe, it, expect } from 'vitest';
import { getVisibleNav, getPrimaryNav } from '@/lib/navigation';

describe('navigation developer mode', () => {
  it('hides developer-only items by default', () => {
    expect(getVisibleNav({}).some((i) => i.id === 'developer')).toBe(false);
    expect(getVisibleNav({}, false).some((i) => i.href === '/settings/developer')).toBe(false);
  });
  it('shows them when developer mode is on', () => {
    expect(getVisibleNav({}, true).some((i) => i.href === '/settings/developer')).toBe(true);
  });
  it('never puts developer items in the mobile tab bar', () => {
    expect(getPrimaryNav({}, true).every((i) => !i.developerOnly)).toBe(true);
  });
});
