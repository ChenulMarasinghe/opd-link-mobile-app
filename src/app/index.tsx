<<<<<<< Updated upstream
import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import LaunchScreen from "../screens/auth/LaunchScreen";

let splashShown = false;

export default function Index() {
  const { user, profile, loading } = useAuth();
  const [minTimePassed, setMinTimePassed] = useState(splashShown);

  useEffect(() => {
    if (splashShown) return;
    const t = setTimeout(() => {
      splashShown = true;
      setMinTimePassed(true);
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  if (loading || !minTimePassed) return <LaunchScreen />;

  if (!user || !profile) return <Redirect href="/login" />;
  if (profile.role === "patient" && profile.emailVerified === false)
    return <Redirect href="/verify-email" />;
  if (profile.role === "admin") return <Redirect href="/admin-dashboard" />;
  if (profile.role === "it") return <Redirect href="/it-dashboard" />;
  return <Redirect href="/dashboard" />;
}
=======
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';

export default function Index() {
  const { user, profile, loading } = useAuth();

  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  if (!user) return <Redirect href="/login" />;
  if (profile?.role === 'it') return <Redirect href="/(it)/it-dashboard" />;
  if (profile?.role === 'admin') return <Redirect href="/login" />;
  if (profile?.role === 'patient') return <Redirect href="/(patient)/dashboard" />;
  return <Redirect href="/login" />;
}
>>>>>>> Stashed changes
