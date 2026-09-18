"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Button } from "@/src/admin/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/src/admin/components/ui/dropdown-menu";

/**
 * Admin colour scheme: light, dark, or follow the OS. The choice lives in
 * localStorage and is applied as a `dark` class on <html>, which is what
 * the shadcn tokens in globals.css key off. The whole admin — sidebar,
 * content, sheets — switches together.
 */

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "icon-admin-theme";
const THEMES: Theme[] = ["light", "dark", "system"];

function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as string[]).includes(value);
}

function readStored(): Theme {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isTheme(raw) ? raw : "system";
  } catch {
    return "system";
  }
}

// The stored choice as an external store, so React reads it during render
// (server snapshot "system") and re-renders when this or another tab sets it.
const listeners = new Set<() => void>();
function subscribeToStored(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}
function writeStored(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode: the choice just won't persist.
  }
  listeners.forEach((l) => l());
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark());
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

/**
 * Runs before the admin shell paints so the first frame is already the
 * right colour. Same logic as apply(), inlined because it must not wait
 * for React to hydrate.
 */
const BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});var d=t==="dark"||((t!=="light")&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

const noopSubscribe = () => () => undefined;

/**
 * Only emitted in server-rendered HTML. On a client-side navigation into the
 * admin the provider's layout effect does the same job, and React would warn
 * about a script element rendered on the client.
 */
export function AdminThemeScript() {
  const isServerPass = useSyncExternalStore(noopSubscribe, () => false, () => true);
  if (!isServerPass) return null;
  return <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />;
}

type ThemeContextValue = { theme: Theme; setTheme: (theme: Theme) => void };
const ThemeContext = createContext<ThemeContextValue>({ theme: "system", setTheme: () => undefined });

function subscribeToSystem(onChange: () => void) {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  // Server renders "system"; the boot script has already set the class, so
  // the client value only matters for the toggle's checkmark.
  const theme = useSyncExternalStore(subscribeToStored, readStored, () => "system" as Theme);

  // Apply before paint so a client-side navigation into the admin never
  // flashes the wrong scheme; re-run when the OS preference flips.
  const prefersDark = useSyncExternalStore(subscribeToSystem, systemPrefersDark, () => false);
  useLayoutEffect(() => {
    apply(theme);
  }, [theme, prefersDark]);

  // Leaving the admin (client-side navigation to the storefront) must not
  // leave the storefront in dark mode.
  useEffect(() => {
    return () => {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "";
    };
  }, []);

  const setTheme = useCallback((next: Theme) => writeStored(next), []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useAdminTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle() {
  const { theme, setTheme } = useAdminTheme();
  const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[2];
  const Icon = current?.icon ?? Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Change theme" title="Theme" />}>
        <Icon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => isTheme(value) && setTheme(value)}>
          {OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} closeOnClick>
              <option.icon className="size-4" />
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
