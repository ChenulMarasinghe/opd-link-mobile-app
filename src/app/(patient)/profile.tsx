<<<<<<< HEAD
import { router } from "expo-router";
import ProfileSettingsScreen from "../../screens/patient/ProfileSettingsScreen";

export default function ProfileRoute() {
  return (
    <ProfileSettingsScreen
      onBack={() => router.replace("/dashboard")}
      onOpenClinicStatus={() => router.push("/clinic-status")}
    />
=======
import { Text, View } from "react-native";

export default function Screen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>profile (placeholder)</Text>
    </View>
>>>>>>> parent of 1bdecc6 (refactor: structure app around IT screens)
  );
}
