import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import LaunchScreen from '@/screens/auth/LaunchScreen';

let splashShown = false;

export default function Index() {
  const { user, profile, loading } = useAuth();
  const [minTimePassed, setMinTimePassed] = useState(splashShown);

  useEffect(() => {
    if (splashShown) return;
    const timer = setTimeout(() => {
      splashShown = true;
      setMinTimePassed(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !minTimePassed) return <LaunchScreen />;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (profile?.role === 'patient' && profile.emailVerified === false) {
    return <Redirect href="/(auth)/verify-email" />;
  }
  if (profile?.role === 'it') return <Redirect href="/(it)/it-dashboard" />;
  if (profile?.role === 'admin') return <Redirect href="/(admin)/admin-dashboard" />;
  if (profile?.role === 'patient') return <Redirect href="/(patient)/dashboard" />;
  return <Redirect href="/(auth)/login" />;
}
