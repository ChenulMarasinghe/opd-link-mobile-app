import { router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import NotificationsScreen from "../../screens/patient/NotificationsScreen";

export default function NotificationsRoute() {
  const { user } = useAuth();

  return (
    <NotificationsScreen
      patientId={user?.uid}
      onBack={() => router.replace("/dashboard")}
    />
  );
}
