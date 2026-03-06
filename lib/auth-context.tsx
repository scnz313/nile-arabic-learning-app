import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";
import { moodleAPI } from "./moodle-api";
import { storageService } from "./storage";
import { syncService } from "./sync-service";

interface UserInfo {
  username: string;
  fullName: string;
}

interface AuthContextType {
  user: UserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
});

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const AUTO_SYNC_THROTTLE_MS = 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastAutoSyncAttemptRef = useRef(0);

  const maybeAutoSync = useCallback(async (force: boolean = false) => {
    if (!moodleAPI.isAuthenticated()) {
      return;
    }

    try {
      const settings = await storageService.getUserSettings();
      if (!settings.autoSync) {
        return;
      }

      const now = Date.now();
      if (!force && now - lastAutoSyncAttemptRef.current < AUTO_SYNC_THROTTLE_MS) {
        return;
      }

      const lastSync = await storageService.getLastSyncTime();
      if (!force && lastSync && now - lastSync < AUTO_SYNC_THROTTLE_MS) {
        return;
      }

      lastAutoSyncAttemptRef.current = now;
      await syncService.syncAllCourses();
    } catch (error) {
      console.error("Auto-sync failed:", error);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const intervalId = setInterval(() => {
      void maybeAutoSync();
    }, AUTO_SYNC_INTERVAL_MS);

    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void maybeAutoSync();
        return;
      }

      void maybeAutoSync(true);
    });

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          void maybeAutoSync();
          return;
        }

        void maybeAutoSync(true);
      };

      const handleFocus = () => {
        void maybeAutoSync();
      };

      const handlePageHide = () => {
        void maybeAutoSync(true);
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("focus", handleFocus);
      window.addEventListener("pagehide", handlePageHide);

      return () => {
        clearInterval(intervalId);
        appStateSubscription.remove();
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("focus", handleFocus);
        window.removeEventListener("pagehide", handlePageHide);
      };
    }

    return () => {
      clearInterval(intervalId);
      appStateSubscription.remove();
    };
  }, [maybeAutoSync, user]);

  const checkAuth = async () => {
    try {
      const hasCredentials = await moodleAPI.init();
      if (hasCredentials) {
        setUser({
          username: moodleAPI.getUsername(),
          fullName: moodleAPI.getFullName(),
        });
        await maybeAutoSync();
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const result = await moodleAPI.login(username, password);
      setUser({ username, fullName: result.fullName });
      await maybeAutoSync(true);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await moodleAPI.logout();
      await storageService.clearAll();
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
