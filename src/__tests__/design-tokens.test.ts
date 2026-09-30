import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { semantic } from '../../design-tokens/tokens';

const REQUIRED = [
  'background', 'card', 'secondary', 'raised', 'border', 'foreground', 'muted-foreground',
  'primary', 'primary-foreground', 'lime', 'link', 'chart-1', 'chart-2', 'chart-highlight',
  'success', 'warning', 'danger', 'read-tick', 'destructive',
];

const root = path.resolve(__dirname, '../..');
const css = readFileSync(path.join(root, 'src/app/tokens.css'), 'utf8');
const mobile = readFileSync(path.join(root, 'mobile/lib/theme.ts'), 'utf8');

describe('Ink and Lime tokens', () => {
  for (const mode of ['light', 'dark'] as const) {
    it(`defines every required token in ${mode}`, () => {
      for (const name of REQUIRED) expect(semantic[mode][name], `${mode}.${name}`).toBeTruthy();
    });
  }

  it('is emitted into the generated CSS for both themes', () => {
    const light = css.slice(0, css.indexOf('.dark {'));
    const dark = css.slice(css.indexOf('.dark {'));
    for (const name of REQUIRED) {
      expect(light).toContain(`--${name}:`);
      expect(dark).toContain(`--${name}:`);
    }
  });

  it('is emitted into the Expo theme for both themes', () => {
    for (const name of REQUIRED) expect(mobile.match(new RegExp(`"${name}":`, 'g'))?.length).toBeGreaterThanOrEqual(2);
  });

  it('uses the spec palette values', () => {
    expect(semantic.dark.background).toBe('#141414');
    expect(semantic.dark.primary).toBe('#c0f7a6');
    expect(semantic.light.primary).toBe('#1b1b1b');
    expect(semantic.light['chart-1']).toBe('#0f4d3a');
  });
});
