# WAYAPP Design System

Single source of truth for how WAYAPP's UI is built. Pair this with the live
gallery at **`/design`** (dev only) — every primitive rendered in light + dark.

---

## 1. Foundations

| Layer | Where | Notes |
|---|---|---|
| **Tailwind** | `v4` (`@import 'tailwindcss'` in `src/app/globals.css`), `@tailwindcss/postcss` | No `tailwind.config.ts` — theme is CSS-first. |
| **Tokens (source of truth)** | `design-tokens/tokens.ts` | Primitives → semantic (light + dark) → component tokens. |
| **Token build** | `npm run tokens:build` (runs on `prebuild`) | Emits `src/app/tokens.css` (`:root` + `.dark`) and `mobile/lib/theme.ts`. **Never hand-edit those two files.** |
| **Theme wiring** | `globals.css` `@theme inline` | Maps tokens → Tailwind namespaces so `bg-card`, `text-muted-foreground`, `rounded-lg`, `shadow-card` resolve and follow light/dark. |
| **Dark mode** | `.dark` class on `<html>` (`next-themes`), `@custom-variant dark` | `<ThemeProvider>` in `layout.tsx`; `<ThemeToggle>` in the header. |
| **UI primitives** | shadcn/ui `base-nova` style → **Base UI** (`@base-ui/react`), **not Radix** | Code owned in `src/components/ui/`. |

### Editing a colour / spacing value

1. Edit `design-tokens/tokens.ts`.
2. `npm run tokens:build`.
3. Commit `tokens.ts` **and** the regenerated `src/app/tokens.css` + `mobile/lib/theme.ts`.

---

## 2. Colour — `--primary` / `--brand` vs `--wa`

Two distinct accents. **Do not mix them up.**

| Token | Value | Use for |
|---|---|---|
| `--primary` / `--brand` | emerald-600 (light) / emerald-500 (dark). **Per-tenant overridable.** | Product UI: primary CTAs, active nav, links, focus rings, selected states. |
| `--wa` | `#25D366` — fixed WhatsApp green, **never themed** | Messaging surfaces only: outbound bubble (`--wa-bubble-out`), send / "start chat" / broadcast buttons (`<Button variant="wa">`), delivery/read ticks, the 24-hour-window indicator. |

Everything else is neutral: `background` `foreground` `card` `popover` `muted`
`accent` `border` `input` `secondary`, plus status (`success` `warning` `info`
`destructive`, each with a `-subtle` / `-subtle-foreground` pair) and
`chart-1..6` for data-viz.

Class examples: `bg-card text-card-foreground`, `text-muted-foreground`,
`border-border`, `bg-primary text-primary-foreground`, `bg-wa-bubble-out`,
`bg-success-subtle text-success-subtle-foreground`, `ring-1 ring-foreground/10`.

---

## 3. Type scale

Use Tailwind's scale: `text-xs` (12) · `text-sm` (14, body) · `text-base` (16) ·
`text-lg` (18) · `text-xl` (20) · `text-2xl` (24) · `text-3xl` (30).

`text-2xs` (`0.6875rem` / 11px) is the **only** sanctioned smaller size — badges,
timestamps, dense metadata. **No `text-[9px]` / `text-[10px]` / arbitrary px.**

---

## 4. Components — `src/components/ui/`

| Component | API sketch | Replaces |
|---|---|---|
| `<Button>` | `variant`: `default` `wa` `secondary` `outline` `ghost` `destructive` `link`; `size`: `xs` `sm` `md`(default) `lg` `icon` `icon-sm`; `render={<Link/>}` for links | `.btn-*` |
| `<Badge>` / `<StatusBadge tone>` | `variant` / `tone`: `brand` `success` `warning` `info` `accent` `destructive` `neutral` | `.badge-*`, ad-hoc `bg-*-100 text-*-800` |
| `<Input>` / `<Card>` | thin base-nova wrappers | `.input-base` / `.card-base` |
| `<Modal>` | `open` `onOpenChange` `title` `description` `footer` `size` `contentClassName` — **Dialog ≥768px, bottom Drawer <768px** | every hand-rolled `fixed inset-0` |
| `useConfirm()` / `<ConfirmDialog>` | `await confirm({ title, description?, destructive?, confirmLabel? })` | native `confirm()` |
| `useToast()` / `toast` (sonner) | `toast.success(title, msg?)` / `.error` / `.warning` / `.info` | native `alert()`, old `Toast.tsx` |
| `<Tooltip>` / `<InfoTooltip>` | `content` `position`; InfoTooltip `size`: `xs` `sm` `md` | custom tooltip |
| `<PageHeader>` | `title` `description?` `actions?` `icon?` | copy-pasted `<h1>/<p>` header block |
| `<FilterTabs>` / `<SegmentedControl>` | `options` (`{value,label,count?}`) `value` `onValueChange` | 3 divergent filter-pill styles |
| `<DataTable>` | `columns` `rows` `getRowId` `loading?` `renderMobileCard?` — desktop `<table>` + mobile cards | hand-rolled table/card splits |
| `<Stat>` / `<StatGrid>` | `label` `value` `hint?` `icon?` `delta?` `deltaTone?` | dashboard KPI cards |
| `<EmptyState>` / `<Skeleton>` | existing APIs, token-styled | — |
| `<ErrorState>` | `icon?` `title?` `description?` `error?` `onRetry?` | the 4 duplicate `error.tsx` bodies |

Raw base-nova re-exports also live in `src/components/ui/` (dialog, sheet,
drawer, dropdown-menu, popover, tabs, table, select, checkbox, switch,
radio-group, accordion, command, alert-dialog, progress, avatar, separator,
scroll-area, textarea, label).

---

## 5. Navigation

`src/lib/navigation.ts` — **one** `NAV_ITEMS` list. `getVisibleNav()` (module
gating), `getPrimaryNav()` (≤5, mobile tab bar), `isActiveHref()`. Consumed by
`Sidebar` (desktop), `MobileTabBar`, and — via the token build — the Expo tabs.

## 6. Providers (mounted in `layout.tsx`)

`ThemeProvider` → `SessionProvider` (`useSession` / `useSettings` / `useModules`
— fetch once, **never raw-`fetch` these**) → `TooltipProvider` → `ConfirmProvider`
→ `ToastProvider`.

---

## 7. Do / Don't

**Do** — use tokens (`bg-card`, `text-muted-foreground`); use the primitives;
`useConfirm()` / `toast`; `<Modal>`; `text-2xs` for the smallest text;
`ring-1 ring-foreground/10` for card edges.

**Don't** — `style={{}}` (only `Skeleton` for runtime dimensions);
`text-[10px]` / arbitrary px; raw hex in `className`; native `confirm()` /
`alert()`; `bg-white` / `text-slate-*` (won't dark-mode); import `@base-ui/*`
outside `src/components/ui/`; use `--wa*` for anything that isn't a messaging
surface.

The grep gate in `scripts/check-design-system.mjs` (`npm run lint:design`)
enforces the "Don't" list.

---

## 8. Deliberate exceptions (single-look, not theme-adaptive)

- **Auth pages** (`login` / `register` / `setup`) — committed dark `slate-950`
  scaffold; only the emerald accent is tokenised.
- **Flow editor** (`flows/[id]`) — the xyflow canvas + side panel are a
  deliberately dark node editor.
- **`MediaLightbox`** — fullscreen media viewer.
- **`WhatsAppMockupPreview`** — always renders the WhatsApp handset look.
