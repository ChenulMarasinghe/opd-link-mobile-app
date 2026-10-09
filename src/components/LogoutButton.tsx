<<<<<<< HEAD
import { Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { logoutUser } from "../services/auth";

export default function LogoutButton() {
  const onLogout = async () => {
<<<<<<< HEAD
    await logoutUser();
=======
    await logout();
<<<<<<< HEAD
>>>>>>> parent of a5adae6 (remove login)
=======
>>>>>>> parent of a5adae6 (remove login)
=======
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function LogoutButton({
  variant = "default",
}: {
  variant?: "default" | "dashboard";
}) {
  const { logout } = useAuth();

  const onLogout = async () => {
    await logout();
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> parent of 1bdecc6 (refactor: structure app around IT screens)
=======
>>>>>>> parent of a5adae6 (remove login)
=======
>>>>>>> parent of a5adae6 (remove login)
=======
>>>>>>> parent of a5adae6 (remove login)
    router.replace("/login");
  };

  return (
<<<<<<< HEAD
    <Pressable style={styles.button} onPress={onLogout}>
      <Text style={styles.text}>Log out</Text>
=======
    <Pressable
      style={[
        styles.button,
        variant === "dashboard" && styles.dashboardButton,
      ]}
      onPress={onLogout}
    >
      {variant === "dashboard" && (
        <SymbolView
          name={{
            ios: "rectangle.portrait.and.arrow.right",
            android: "logout",
            web: "logout",
          }}
          size={18}
          tintColor="#DC2626"
        />
      )}

      <Text
        style={[
          styles.text,
          variant === "dashboard" && styles.dashboardText,
        ]}
      >
        Log out
      </Text>
>>>>>>> parent of 1bdecc6 (refactor: structure app around IT screens)
    </Pressable>
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
  button: { backgroundColor: "#DC2626", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 16 },
  text: { color: "#fff", fontWeight: "600" },
=======
  button: {
    backgroundColor: "#DC2626",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },

  dashboardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 6,

    borderWidth: 1.2,
    borderColor: "#EF3340",

    backgroundColor: "#FFF",

    borderRadius: 12,

    paddingHorizontal: 12,
    paddingVertical: 8,

    marginTop: 0,

    alignSelf: "flex-start",
  },

  text: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },

  dashboardText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "700",
  },
>>>>>>> parent of 1bdecc6 (refactor: structure app around IT screens)
});