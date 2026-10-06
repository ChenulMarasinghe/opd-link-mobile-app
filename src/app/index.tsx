import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";

export default function Index() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!user || !profile) return <Redirect href="/login" />;
  if (profile.role === "patient" && profile.emailVerified === false) return <Redirect href="/verify-email" />;
  if (profile.role === "admin") return <Redirect href="/admin-dashboard" />;
  if (profile.role === "it") return <Redirect href="/it-dashboard" />;
  return <Redirect href="/dashboard" />;
}