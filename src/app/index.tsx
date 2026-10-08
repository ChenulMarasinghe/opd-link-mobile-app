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