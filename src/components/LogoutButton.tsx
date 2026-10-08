import { Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { logoutUser } from "../services/auth";

export default function LogoutButton() {
  const onLogout = async () => {
    await logoutUser();
    router.replace("/login");
  };

  return (
    <Pressable style={styles.button} onPress={onLogout}>
      <Text style={styles.text}>Log out</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: "#DC2626", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 16 },
  text: { color: "#fff", fontWeight: "600" },
});