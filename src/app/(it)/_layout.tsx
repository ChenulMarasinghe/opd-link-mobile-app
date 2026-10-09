import { Redirect, Slot } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import LaunchScreen from "@/screens/auth/LaunchScreen";

export default function ITLayout() {
  const { user, profile, loading } = useAuth();

  if (loading) return <LaunchScreen />;
  if (!user || !profile) return <Redirect href="/login" />;
  if (profile.role !== "it") return <Redirect href="/" />;

  return <Slot />;
}
