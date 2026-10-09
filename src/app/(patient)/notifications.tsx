<<<<<<< HEAD
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
=======
import { Text, View } from "react-native";

export default function Screen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>notifications (placeholder)</Text>
    </View>
>>>>>>> parent of 1bdecc6 (refactor: structure app around IT screens)
  );
}
