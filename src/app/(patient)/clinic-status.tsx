<<<<<<< HEAD
import { router } from "expo-router";
import ClinicStatusScreen from "../../screens/patient/ClinicStatusScreen";

export default function ClinicStatusRoute() {
  return <ClinicStatusScreen onBack={() => router.replace("/dashboard")} />;
=======
import { Text, View } from "react-native";

export default function Screen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>clinic-status (placeholder)</Text>
    </View>
  );
>>>>>>> parent of 1bdecc6 (refactor: structure app around IT screens)
}
