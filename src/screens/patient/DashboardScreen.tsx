import { Text, View } from "react-native";
import LogoutButton from "../../components/LogoutButton";

export default function Screen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
      <Text>patient-dashboard (placeholder)</Text>
      <LogoutButton />
    </View>
  );
}