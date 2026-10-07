import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../services/firebase";
import {
  getDemoSession,
  getUserProfile,
  logoutUser,
  UserProfile,
} from "../services/auth";

type AuthUser = User | { uid: string; email: string };

type AuthState = {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  refreshAuth: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        const p = await getUserProfile(u.uid);
        setUser(u);
        setProfile(p);
      } else {
        const demoSession = await getDemoSession();
        setUser(demoSession?.user ?? null);
        setProfile(demoSession?.profile ?? null);
      }
      setLoading(false);
    });
  }, []);

  const refreshProfile = async () => {
    if (auth.currentUser) setProfile(await getUserProfile(auth.currentUser.uid));
  };

  const refreshAuth = async () => {
    if (auth.currentUser) {
      setUser(auth.currentUser);
      setProfile(await getUserProfile(auth.currentUser.uid));
      return;
    }

    const demoSession = await getDemoSession();
    setUser(demoSession?.user ?? null);
    setProfile(demoSession?.profile ?? null);
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, refreshAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}