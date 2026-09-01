import {
  LayoutDashboard,
  MessageSquare,
  Send,
  Zap,
  FileText,
  Users,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  /** shorter label for the mobile tab bar */
  shortLabel?: string;
  href: string;
  icon: LucideIcon;
  /** show in the mobile bottom tab bar (max 5) */
  primary?: boolean;
  /** show an unread badge (inbox) */
  badge?: "unread";
  /** hidden unless at least one of these modules is enabled */
  moduleIds?: string[];
}

/**
 * THE nav config. Consumed by the desktop sidebar, the mobile tab bar, the
 * mobile "More" sheet, and (via the token build) the Expo tab bar. One source,
 * one taxonomy — replaces the 3 divergent nav lists (sidebar 8 / BottomNav 5 /
 * Expo 4).
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: "dashboard", label: "Dashboard", shortLabel: "Home", href: "/", icon: LayoutDashboard, primary: true },
  { id: "inbox", label: "Live Inbox", shortLabel: "Chats", href: "/inbox", icon: MessageSquare, primary: true, badge: "unread" },
  { id: "campaigns", label: "Campaigns", shortLabel: "Broadcasts", href: "/campaigns", icon: Send, primary: true, moduleIds: ["campaigns"] },
  { id: "contacts", label: "Contacts & CRM", shortLabel: "Contacts", href: "/contacts", icon: Users, primary: true },
  { id: "automations", label: "Automations", shortLabel: "Automations", href: "/automations", icon: Zap, moduleIds: ["flows", "ai_bots"] },
  { id: "templates", label: "Templates", shortLabel: "Templates", href: "/templates", icon: FileText },
  { id: "analytics", label: "Analytics & Funnel", shortLabel: "Analytics", href: "/analytics", icon: BarChart3 },
  { id: "settings", label: "Settings & Modules", shortLabel: "Settings", href: "/settings", icon: Settings, primary: true },
] as const;

/** True if a nav item should be visible given the enabled-modules map. */
export function isNavItemVisible(item: NavItem, enabledModules: Record<string, boolean>): boolean {
  if (!item.moduleIds) return true;
  return item.moduleIds.some((id) => enabledModules[id] !== false);
}

export function getVisibleNav(enabledModules: Record<string, boolean>): NavItem[] {
  return NAV_ITEMS.filter((item) => isNavItemVisible(item, enabledModules));
}

/** Primary items for the mobile tab bar (capped at 5; last slot is "More"). */
export function getPrimaryNav(enabledModules: Record<string, boolean>): NavItem[] {
  return getVisibleNav(enabledModules).filter((i) => i.primary).slice(0, 5);
}

export function isActiveHref(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
