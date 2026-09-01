#!/usr/bin/env node
/**
 * Design-system grep gate. Fails (exit 1) on regressions of the rules in
 * docs/DESIGN_SYSTEM.md §7. Run: `npm run lint:design` (wire into CI).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

/** files that are allowed a given violation (deliberate single-look surfaces, etc.) */
const ALLOW = {
  inlineStyle: [
    'components/ui/Skeleton.tsx', // runtime width/height
    'components/analytics/ConversionFunnelChart.tsx', // data-driven bar colour/width
    'components/analytics/VolumeTrendsChart.tsx', // data-driven bar height
    'components/campaigns/VariableMapper.tsx',
    'app/design/page.tsx', // token swatches
    'app/contacts/page.tsx', // user-picked group/tag hex dots
    'components/contacts/GroupTagModal.tsx',
    'components/contacts/CsvImportModal.tsx',
    'components/inbox/ChatWindow.tsx', // bulk assign group/tag hex dots
    'app/flows/[id]/page.tsx', // xyflow node styling
    'components/settings/MetaBillingSection.tsx', // data-driven usage-meter width
    'components/campaigns/LiveProgressCard.tsx',
    'app/page.tsx',
  ],
  rawHex: [
    'app/login/page.tsx', // Facebook brand blue
    'app/register/page.tsx',
    'app/setup/page.tsx',
    'app/flows/[id]/page.tsx',
    'components/inbox/MediaLightbox.tsx',
    'components/inbox/VoiceNoteRecorder.tsx',
    'components/inbox/AudioVoicePlayer.tsx',
    'components/inbox/ChatWindow.tsx',
    'components/templates/WhatsAppMockupPreview.tsx',
    'components/common/DevicePermissionsModal.tsx',
    'components/common/InitialSetupGatekeeper.tsx', // Facebook brand blue button
  ],
};

const RULES = [
  {
    id: 'inline-style',
    re: /style=\{\{/,
    msg: 'inline style={{}} — use tokens/classes (Skeleton is the only exception)',
    allow: ALLOW.inlineStyle,
  },
  {
    id: 'arbitrary-text-px',
    re: /text-\[\d+px\]/,
    msg: 'arbitrary text-[Npx] — use the type scale (text-2xs / text-xs / …)',
    allow: [],
    ext: /\.tsx?$/,
  },
  {
    id: 'raw-hex-classname',
    re: /(className|class)=("[^"]*(?:bg|text|border|ring|from|via|to|fill|stroke)-\[#[0-9a-fA-F]{3,8}\][^"]*"|\{`[^`]*(?:bg|text|border|ring)-\[#[0-9a-fA-F]{3,8}\][^`]*`\})/,
    msg: 'raw hex colour utility in className — use a token',
    allow: ALLOW.rawHex,
    ext: /\.tsx?$/,
  },
  {
    // native forms take a string literal directly; useConfirm's is `confirm({`
    id: 'native-confirm-alert',
    re: /(?<![.\w])(window\.)?(confirm|alert)\(\s*['"`]/,
    msg: 'native confirm()/alert() — use useConfirm() / toast',
    allow: [],
    ext: /\.tsx?$/,
  },
  {
    id: 'base-ui-import-outside-ui',
    re: /from ['"]@base-ui\/react/,
    msg: '@base-ui/* imported outside src/components/ui/ — wrap it in a primitive',
    allow: [],
    only: (rel) => !rel.startsWith('components/ui/'),
  },
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|css)$/.test(name)) out.push(p);
  }
  return out;
}

let failures = 0;
for (const file of walk(SRC)) {
  const rel = relative(SRC, file).replace(/\\/g, '/');
  const lines = readFileSync(file, 'utf8').split('\n');
  for (const rule of RULES) {
    if (rule.allow.includes(rel)) continue;
    if (rule.only && !rule.only(rel)) continue;
    if (rule.ext && !rule.ext.test(file)) continue;
    lines.forEach((line, i) => {
      if (line.includes('design-system-ignore')) return;
      if (rule.re.test(line)) {
        console.error(`✗ [${rule.id}] ${rel}:${i + 1}  ${rule.msg}`);
        console.error(`    ${line.trim().slice(0, 120)}`);
        failures++;
      }
    });
  }
}

if (failures) {
  console.error(`\n${failures} design-system violation(s). See docs/DESIGN_SYSTEM.md §7.`);
  process.exit(1);
}
console.log('✓ design-system checks passed');
