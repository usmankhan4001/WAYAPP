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

export const semantic: { light: SemanticColors; dark: SemanticColors } = {
  light: {
    // shadcn/ui core
    background: p.slate[50],
    foreground: p.slate[900],
    card: p.white,
    "card-foreground": p.slate[900],
    popover: p.white,
    "popover-foreground": p.slate[900],
    primary: p.emerald[600],
    "primary-foreground": p.white,
    secondary: p.slate[100],
    "secondary-foreground": p.slate[900],
    muted: p.slate[100],
    "muted-foreground": p.slate[500],
    accent: p.slate[100],
    "accent-foreground": p.slate[900],
    destructive: p.red[600],
    "destructive-foreground": p.white,
    border: p.slate[200],
    input: p.slate[200],
    ring: p.emerald[600],

    // shadcn/ui sidebar block
    sidebar: p.white,
    "sidebar-foreground": p.slate[700],
    "sidebar-primary": p.emerald[600],
    "sidebar-primary-foreground": p.white,
    "sidebar-accent": p.slate[100],
    "sidebar-accent-foreground": p.slate[900],
    "sidebar-border": p.slate[200],
    "sidebar-ring": p.emerald[600],

    // our additions — product brand (alias of primary, kept for intent clarity)
    brand: p.emerald[600],
    "brand-foreground": p.white,
    "brand-subtle": p.emerald[50],
    "brand-subtle-foreground": p.emerald[700],

    // our additions — WhatsApp messaging surfaces (fixed, never themed)
    wa: p.wa.green,
    "wa-foreground": p.white,
    "wa-hover": p.wa.greenHover,
    "wa-bubble-out": p.wa.bubbleOut,
    "wa-bubble-out-foreground": p.slate[900],
    "wa-bubble-in": p.wa.bubbleIn,
    "wa-bubble-in-foreground": p.slate[900],
    "chat-canvas": p.wa.canvas,

    // our additions — status
    success: p.green[600],
    "success-foreground": p.white,
    "success-subtle": p.green[50],
    "success-subtle-foreground": p.green[700],
    warning: p.amber[500],
    "warning-foreground": p.slate[900],
    "warning-subtle": p.amber[50],
    "warning-subtle-foreground": p.amber[700],
    info: p.blue[600],
    "info-foreground": p.white,
    "info-subtle": p.blue[50],
    "info-subtle-foreground": p.blue[700],

    // dataviz — categorical series (distinct hues, AA on card bg)
    "chart-1": p.emerald[500],
    "chart-2": p.blue[500],
    "chart-3": p.amber[500],
    "chart-4": p.purple[500],
    "chart-5": p.rose[500],
    "chart-6": p.sky[500],
  },

  dark: {
    background: p.slate[950],
    foreground: p.slate[100],
    card: p.slate[900],
    "card-foreground": p.slate[100],
    popover: p.slate[900],
    "popover-foreground": p.slate[100],
    primary: p.emerald[500],
    "primary-foreground": p.slate[950],
    secondary: p.slate[800],
    "secondary-foreground": p.slate[100],
    muted: p.slate[800],
    "muted-foreground": p.slate[400],
    accent: p.slate[800],
    "accent-foreground": p.slate[100],
    destructive: p.red[500],
    "destructive-foreground": p.slate[950],
    border: p.slate[800],
    input: p.slate[800],
    ring: p.emerald[500],

    sidebar: p.slate[900],
    "sidebar-foreground": p.slate[300],
    "sidebar-primary": p.emerald[500],
    "sidebar-primary-foreground": p.slate[950],
    "sidebar-accent": p.slate[800],
    "sidebar-accent-foreground": p.slate[100],
    "sidebar-border": p.slate[800],
    "sidebar-ring": p.emerald[500],

    brand: p.emerald[500],
    "brand-foreground": p.slate[950],
    "brand-subtle": "#052e23",
    "brand-subtle-foreground": p.emerald[300],

    wa: p.wa.green,
    "wa-foreground": p.white,
    "wa-hover": p.wa.greenHover,
    "wa-bubble-out": p.wa.bubbleOutDark,
    "wa-bubble-out-foreground": p.slate[100],
    "wa-bubble-in": p.wa.bubbleInDark,
    "wa-bubble-in-foreground": p.slate[100],
    "chat-canvas": p.wa.canvasDark,

    success: p.green[500],
    "success-foreground": p.slate[950],
    "success-subtle": "#04240f",
    "success-subtle-foreground": p.green[400],
    warning: p.amber[400],
    "warning-foreground": p.slate[950],
    "warning-subtle": "#2c1e04",
    "warning-subtle-foreground": p.amber[400],
    info: p.blue[400],
    "info-foreground": p.slate[950],
    "info-subtle": "#0a1f3d",
    "info-subtle-foreground": p.blue[400],

    "chart-1": p.emerald[400],
    "chart-2": p.blue[400],
    "chart-3": p.amber[400],
    "chart-4": p.purple[400],
    "chart-5": p.rose[400],
    "chart-6": p.sky[400],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. COMPONENT TOKENS — theme-independent
// ─────────────────────────────────────────────────────────────────────────────

/** Base corner radius. shadcn derives sm/md/lg/xl from this. */
export const radius = "0.625rem"; // 10px

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
  radius: 10,
  radiusSm: 6,
  radiusMd: 8,
  radiusLg: 10,
  radiusXl: 14,
  headerHeight: 56,
  bottomNavHeight: 64,
};
