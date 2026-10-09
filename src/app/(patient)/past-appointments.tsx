<<<<<<< HEAD
import { Redirect } from "expo-router";

export default function PastAppointments() {
  return <Redirect href={{ pathname: "/upcoming-appointments", params: { tab: "past" } }} />;
}
=======
import { Text, View } from "react-native";

export default function Screen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>past-appointments (placeholder)</Text>
    </View>
  );
}
>>>>>>> parent of 1bdecc6 (refactor: structure app around IT screens)
