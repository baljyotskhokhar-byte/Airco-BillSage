import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/feedback";
import { authService } from "@/mocks/services/authService";
import { settingsService } from "@/mocks/services/settingsService";
import type { UserPreferences, UserProfile } from "@/types";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
    },
  },
});

interface AppContextValue {
  user: UserProfile | null;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  preferences: UserPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
  logout: () => void;
}

const AppContext = React.createContext<AppContextValue | undefined>(undefined);

export function useAppContext(): AppContextValue {
  const ctx = React.useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used inside AppProviders");
  }
  return ctx;
}

function applyThemeClass(theme: UserPreferences["theme"]) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  }
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserProfile | null>(() => authService.getCurrentUser());
  const [preferences, setPreferences] = React.useState<UserPreferences>(() =>
    settingsService.getPreferences()
  );

  React.useEffect(() => {
    applyThemeClass(preferences.theme);
  }, [preferences.theme]);

  const logout = React.useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider value={{ user, setUser, preferences, setPreferences, logout }}>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-default)",
                fontSize: "13px",
              },
            }}
          />
        </TooltipProvider>
      </AppContext.Provider>
    </QueryClientProvider>
  );
}
