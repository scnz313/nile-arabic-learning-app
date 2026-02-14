import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { moodleAPI } from "./moodle-api";
import { storage, type UserInfo } from "./storage";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const hasToken = await moodleAPI.init();
      if (hasToken) {
        const userInfo = await storage.getUserInfo();
        if (userInfo) {
          setUser(userInfo);
        } else {
          // Token exists but no user info, try to fetch
          try {
            const siteInfo = await moodleAPI.getSiteInfo();
            const newUserInfo: UserInfo = {
              userId: siteInfo.userid,
              username: siteInfo.username,
              fullName: siteInfo.fullname,
              email: siteInfo.username,
            };
            await storage.setUserInfo(newUserInfo);
            setUser(newUserInfo);
          } catch {
            // Token is invalid, clear it
            await moodleAPI.logout();
          }
        }
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
      await moodleAPI.login(username, password);
      const siteInfo = await moodleAPI.getSiteInfo();
      const userInfo: UserInfo = {
        userId: siteInfo.userid,
        username: siteInfo.username,
        fullName: siteInfo.fullname,
        email: username,
      };
      await storage.setUserInfo(userInfo);
      setUser(userInfo);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await moodleAPI.logout();
      await storage.clearAll();
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
