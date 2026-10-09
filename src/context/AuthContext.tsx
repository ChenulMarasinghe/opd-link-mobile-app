import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../services/firebase";
import { getUserProfile, UserProfile } from "../services/auth";

type AuthState = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      setUser(u);
      try {
        setProfile(u ? await getUserProfile(u.uid) : null);
      } catch (error) {
        console.error('Unable to load signed-in user profile.', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const refreshProfile = async () => {
    if (auth.currentUser) setProfile(await getUserProfile(auth.currentUser.uid));
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
