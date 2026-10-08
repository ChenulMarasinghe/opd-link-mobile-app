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
    router.replace("/");
  };

  return (
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
});