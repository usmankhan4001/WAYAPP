"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role?: string;
  status?: string;
  isActive?: boolean;
  avatarUrl?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppSettings = Record<string, any>;
export interface AppModule {
  id: string;
  isEnabled: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface SessionContextValue {
  user: SessionUser | null;
  authenticated: boolean;
  settings: AppSettings | null;
  modules: AppModule[];
  enabledModules: Record<string, boolean>;
  developerMode: boolean;
  setDeveloperMode: (on: boolean) => Promise<void>;
  loading: boolean;
  refresh: () => Promise<void>;
  setSettings: (s: AppSettings) => void;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

/**
 * Fetches /api/auth/me + /api/settings + /api/modules ONCE and shares them.
 * Replaces the 3x /api/auth/me and 3x /api/settings duplicate fetches that
 * AppShell, Sidebar and Header each did independently.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [authenticated, setAuthenticated] = React.useState(false);
  const [settings, setSettingsState] = React.useState<AppSettings | null>(null);
  const [modules, setModules] = React.useState<AppModule[]>([]);
  const [developerMode, setDeveloperModeState] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const [authRes, settingsRes, modulesRes, prefsRes] = await Promise.allSettled([
        fetch("/api/auth/me"),
        fetch("/api/settings"),
        fetch("/api/modules"),
        fetch("/api/me/preferences"),
      ]);

      if (authRes.status === "fulfilled" && authRes.value.ok) {
        const data = await authRes.value.json();
        setAuthenticated(Boolean(data?.authenticated));
        setUser(data?.authenticated ? data.user : null);
      }
      if (settingsRes.status === "fulfilled" && settingsRes.value.ok) {
        setSettingsState(await settingsRes.value.json());
      }
      if (modulesRes.status === "fulfilled" && modulesRes.value.ok) {
        const data = await modulesRes.value.json();
        if (Array.isArray(data?.modules)) setModules(data.modules);
      }
      if (prefsRes.status === "fulfilled" && prefsRes.value.ok) {
        const data = await prefsRes.value.json();
        setDeveloperModeState(Boolean(data?.developerMode));
      } else if (prefsRes.status === "fulfilled" && prefsRes.value.status === 401) {
        setDeveloperModeState(false);
      }
    } catch (err) {
      console.warn("[SessionProvider] load failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch on navigation (mirrors previous per-route fetching) but deduped.
  React.useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  const enabledModules = React.useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const m of modules) map[m.id] = m.isEnabled;
    return map;
  }, [modules]);

  const setDeveloperMode = React.useCallback(async (on: boolean) => {
    const res = await fetch("/api/me/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ developerMode: on }),
    });
    if (!res.ok) throw new Error("Could not save this preference");
    setDeveloperModeState(on);
  }, []);

  const value: SessionContextValue = {
    user,
    authenticated,
    settings,
    modules,
    enabledModules,
    developerMode,
    setDeveloperMode,
    loading,
    refresh,
    setSettings: setSettingsState,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function useSessionContext(): SessionContextValue {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error("useSession/useSettings must be used within <SessionProvider>");
  return ctx;
}

export function useSession() {
  const { user, authenticated, loading, refresh } = useSessionContext();
  return { user, authenticated, loading, refresh };
}

export function useSettings() {
  const { settings, setSettings, loading, refresh } = useSessionContext();
  return { settings, setSettings, loading, refresh };
}

export function useModules() {
  const { modules, enabledModules, refresh } = useSessionContext();
  return { modules, enabledModules, refresh };
}

/** Developer tools (API keys, webhooks, audit log) are hidden unless this is on. */
export function useDeveloperMode() {
  const { developerMode, setDeveloperMode } = useSessionContext();
  return { developerMode, setDeveloperMode };
}

/** Renders children only when the signed-in user has Developer mode on. */
export function AdvancedOnly({ children }: { children: React.ReactNode }) {
  const { developerMode } = useSessionContext();
  return developerMode ? <>{children}</> : null;
}
