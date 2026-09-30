/**
 * WAYAPP Design Tokens — framework-agnostic source of truth.
 *
 * Edit values HERE, then run `npm run tokens:build` to regenerate:
 *   - src/app/tokens.css   (web · Tailwind v4 `@theme` consumes these vars)
 *   - mobile/lib/theme.ts  (Expo · NativeWind / RN StyleSheet)
 *
 * Three layers:
 *   1. primitives   — raw scales. NEVER reference these from a component.
 *   2. semantic     — what components use. shadcn/ui var names + our additions.
 *                     Every entry has a light + dark value.
 *   3. component    — radii, dimensions, shadows, motion, z-index.
 *
 * Accent policy:
 *   --primary / --brand  → product UI (CTAs, active nav, links, focus rings).
 *                          Per-tenant overridable. Default = emerald-600.
 *   --wa                 → messaging surfaces ONLY (outbound bubble, send &
 *                          broadcast buttons, delivery/read ticks, 24h window).
 *                          Fixed WhatsApp green #25D366 — never themed.
 *
 * See docs/DESIGN_SYSTEM.md.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

export const primitives = {
  white: "#ffffff",
  black: "#000000",

  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#020617",
  },

  /** Product brand ramp — emerald. `--primary` / `--brand` default. */
  emerald: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
    950: "#022c22",
  },

  /** WhatsApp brand — messaging surfaces only. Never themed. */
  wa: {
    green: "#25d366",
    greenHover: "#20b858",
    darkGreen: "#128c7e",
    deepTeal: "#075e54",
    blue: "#34b7f1",
    bubbleOut: "#d9fdd3",
    bubbleOutDark: "#005c4b",
    bubbleIn: "#ffffff",
    bubbleInDark: "#1f2c33",
    canvas: "#efeae2",
    canvasDark: "#0b141a",
  },

  // Status ramps
  green: { 50: "#f0fdf4", 100: "#dcfce7", 400: "#4ade80", 500: "#22c55e", 600: "#16a34a", 700: "#15803d" },
  amber: { 50: "#fffbeb", 100: "#fef3c7", 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#b45309" },
  red: { 50: "#fef2f2", 100: "#fee2e2", 400: "#f87171", 500: "#ef4444", 600: "#dc2626", 700: "#b91c1c" },
  blue: { 50: "#eff6ff", 100: "#dbeafe", 400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8" },
  sky: { 50: "#f0f9ff", 100: "#e0f2fe", 400: "#38bdf8", 500: "#0ea5e9", 600: "#0284c7", 700: "#0369a1" },
  purple: { 50: "#faf5ff", 100: "#f3e8ff", 400: "#c084fc", 500: "#a855f7", 600: "#9333ea", 700: "#7e22ce" },
  rose: { 50: "#fff1f2", 100: "#ffe4e6", 400: "#fb7185", 500: "#f43f5e", 600: "#e11d48", 700: "#be123c" },
} as const;

const p = primitives;

// ─────────────────────────────────────────────────────────────────────────────
// 2. SEMANTIC — light + dark. Keys become CSS custom properties (`--<key>`).
// ─────────────────────────────────────────────────────────────────────────────

export type SemanticColors = Record<string, string>;

/**
 * "Ink and Lime" (docs/UI_SPEC.md section 2). Ink = near-black neutrals,
 * lime = the accent fill, deep green = links/icons/chart line on light.
 */
export const ink = {
  950: "#141414",
  900: "#1b1b1b",
  800: "#262626",
  700: "#2e2e2e",
  500: "#6b6b6b",
  400: "#a3a3a3",
  200: "#e6e6e6",
  100: "#ededed",
  50: "#f6f6f6",
  lime: "#c0f7a6",
  limeHover: "#adeb90",
  limeBubble: "#d6f8c4",
  limeSubtle: "#e6f9da",
  limeSubtleDark: "#22301c",
  green: "#0f5c3a",
  chartMain: "#0f4d3a",
  chartPrev: "#bfe3d0",
  highlight: "#f5e663",
  success: "#1f9d55",
  warning: "#e6a100",
  danger: "#d64545",
  readTick: "#34b7f1",
} as const;

const k = ink;

export const semantic: { light: SemanticColors; dark: SemanticColors } = {
  light: {
    // shadcn/ui core
    background: k[50],
    foreground: k[900],
    card: p.white,
    "card-foreground": k[900],
    popover: p.white,
    "popover-foreground": k[900],
    primary: k[900],
    "primary-foreground": p.white,
    secondary: k[100],
    "secondary-foreground": k[900],
    muted: k[100],
    "muted-foreground": k[500],
    accent: k[100],
    "accent-foreground": k[900],
    destructive: k.danger,
    "destructive-foreground": p.white,
    border: k[200],
    input: k[200],
    ring: k.green,

    // Ink and Lime additions
    raised: k[100],
    lime: k.lime,
    "lime-foreground": k[900],
    link: k.green,
    "read-tick": k.readTick,

    // shadcn/ui sidebar block
    sidebar: p.white,
    "sidebar-foreground": k[500],
    "sidebar-primary": k[900],
    "sidebar-primary-foreground": p.white,
    "sidebar-accent": k.limeSubtle,
    "sidebar-accent-foreground": k.green,
    "sidebar-border": k[200],
    "sidebar-ring": k.green,

    // product brand = deep green on light (links, active nav, icons)
    brand: k.green,
    "brand-foreground": p.white,
    "brand-subtle": k.limeSubtle,
    "brand-subtle-foreground": k.green,

    // messaging surfaces: send button = lime, bubbles per spec
    wa: k.lime,
    "wa-foreground": k[900],
    "wa-hover": k.limeHover,
    "wa-bubble-out": k.limeBubble,
    "wa-bubble-out-foreground": k[900],
    "wa-bubble-in": p.white,
    "wa-bubble-in-foreground": k[900],
    "chat-canvas": k[50],

    // status
    success: k.success,
    "success-foreground": p.white,
    "success-subtle": p.green[50],
    "success-subtle-foreground": p.green[700],
    warning: k.warning,
    "warning-foreground": k[900],
    "warning-subtle": p.amber[50],
    "warning-subtle-foreground": p.amber[700],
    danger: k.danger,
    "danger-foreground": p.white,
    info: k.readTick,
    "info-foreground": k[900],
    "info-subtle": p.sky[50],
    "info-subtle-foreground": p.sky[700],

    // dataviz
    "chart-1": k.chartMain,
    "chart-2": k.chartPrev,
    "chart-highlight": k.highlight,
    "chart-3": p.amber[500],
    "chart-4": p.purple[500],
    "chart-5": p.rose[500],
    "chart-6": p.sky[500],
  },

  dark: {
    background: k[950],
    foreground: k[50],
    card: k[900],
    "card-foreground": k[50],
    popover: k[800],
    "popover-foreground": k[50],
    primary: k.lime,
    "primary-foreground": k[900],
    secondary: k[800],
    "secondary-foreground": k[50],
    muted: k[800],
    "muted-foreground": k[400],
    accent: k[800],
    "accent-foreground": k[50],
    destructive: k.danger,
    "destructive-foreground": p.white,
    border: k[700],
    input: k[700],
    ring: k.lime,

    raised: k[800],
    lime: k.lime,
    "lime-foreground": k[900],
    link: k.lime,
    "read-tick": k.readTick,

    sidebar: k[900],
    "sidebar-foreground": k[400],
    "sidebar-primary": k.lime,
    "sidebar-primary-foreground": k[900],
    "sidebar-accent": k[800],
    "sidebar-accent-foreground": k[50],
    "sidebar-border": k[700],
    "sidebar-ring": k.lime,

    brand: k.lime,
    "brand-foreground": k[900],
    "brand-subtle": k.limeSubtleDark,
    "brand-subtle-foreground": k.lime,

    wa: k.lime,
    "wa-foreground": k[900],
    "wa-hover": k.limeHover,
    "wa-bubble-out": k.lime,
    "wa-bubble-out-foreground": k[900],
    "wa-bubble-in": k[800],
    "wa-bubble-in-foreground": k[50],
    "chat-canvas": k[950],

    success: k.success,
    "success-foreground": p.white,
    "success-subtle": "#12281b",
    "success-subtle-foreground": p.green[400],
    warning: k.warning,
    "warning-foreground": k[900],
    "warning-subtle": "#2c2208",
    "warning-subtle-foreground": p.amber[400],
    danger: k.danger,
    "danger-foreground": p.white,
    info: k.readTick,
    "info-foreground": k[900],
    "info-subtle": "#0d2530",
    "info-subtle-foreground": k.readTick,

    // on dark the main series is lime (deep green would vanish on ink)
    "chart-1": k.lime,
    "chart-2": "#3f5a49",
    "chart-highlight": k.highlight,
    "chart-3": p.amber[400],
    "chart-4": p.purple[400],
    "chart-5": p.rose[400],
    "chart-6": p.sky[400],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. COMPONENT TOKENS — theme-independent
// ─────────────────────────────────────────────────────────────────────────────

/** Base corner radius (inputs, 14px). lg = this, xl = +4, 2xl = card. */
export const radius = "0.875rem"; // 14px

/** Extra radii exposed as --radius-card / --radius-bubble. */
export const radii: Record<string, string> = {
  "radius-card": "1.25rem", // 20px
  "radius-bubble": "1.125rem", // 18px
  "radius-bubble-tail": "0.375rem", // 6px
};

export const dimensions: Record<string, string> = {
  "header-height": "3.5rem", // 56
  "sidebar-width": "16rem", // 256
  "sidebar-width-collapsed": "4.25rem", // 68
  "bottom-nav-height": "4rem", // 64 (+ safe-area added at use site)
};

export const shadows: Record<string, string> = {
  "shadow-2xs": "0 1px 2px 0 rgb(0 0 0 / 0.04)",
  "shadow-xs": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  "shadow-sm": "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
  "shadow-card": "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
  "shadow-popover": "0 10px 38px -10px rgb(0 0 0 / 0.35), 0 10px 20px -15px rgb(0 0 0 / 0.2)",
};

export const motion: Record<string, string> = {
  "ease-out": "cubic-bezier(0.16, 1, 0.3, 1)",
  "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
  "dur-fast": "120ms",
  "dur-base": "200ms",
  "dur-slow": "320ms",
};

export const zIndex: Record<string, string> = {
  "z-dropdown": "1000",
  "z-sticky": "1100",
  "z-overlay": "1200",
  "z-modal": "1300",
  "z-popover": "1400",
  "z-toast": "1500",
  "z-tooltip": "1600",
};

/** Numeric mirror of `radius` / `dimensions` for the RN theme (px). */
export const nativeScale = {
  radius: 14,
  radiusSm: 10,
  radiusMd: 12,
  radiusLg: 14,
  radiusXl: 18,
  radiusCard: 20,
  radiusInput: 14,
  radiusBubble: 18,
  headerHeight: 56,
  bottomNavHeight: 64,
};

/** Font family name shared by web (next/font Urbanist) and Expo. */
export const fontFamily = "Urbanist";
