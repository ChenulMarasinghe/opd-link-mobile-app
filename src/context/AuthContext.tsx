import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../services/firebase";
<<<<<<< HEAD
import { getUserProfile, UserProfile } from "../services/auth";

type AuthState = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
=======
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
>>>>>>> parent of 1bdecc6 (refactor: structure app around IT screens)
};

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
<<<<<<< HEAD
=======
  refreshAuth: async () => {},
  logout: async () => {},
>>>>>>> parent of 1bdecc6 (refactor: structure app around IT screens)
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
<<<<<<< HEAD
  const [user, setUser] = useState<User | null>(null);
=======
  const [user, setUser] = useState<AuthUser | null>(null);
>>>>>>> parent of 1bdecc6 (refactor: structure app around IT screens)
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
<<<<<<< HEAD
  return onAuthStateChanged(auth, async (u) => {
    if (u) {
      setLoading(true);
      const p = await getUserProfile(u.uid);
      setUser(u);
      setProfile(p);
    } else {
      setUser(null);
      setProfile(null);
    }
    setLoading(false);
  });
=======
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
>>>>>>> parent of 1bdecc6 (refactor: structure app around IT screens)
  }, []);

  const refreshProfile = async () => {
    if (auth.currentUser) setProfile(await getUserProfile(auth.currentUser.uid));
  };

<<<<<<< HEAD
  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
=======
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
>>>>>>> parent of 1bdecc6 (refactor: structure app around IT screens)
      {children}
    </AuthContext.Provider>
  );
}