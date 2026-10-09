import { router } from "expo-router";
import ProfileSettingsScreen from "../../screens/patient/ProfileSettingsScreen";

export default function ProfileRoute() {
  return (
    <ProfileSettingsScreen
      onBack={() => router.replace("/(patient)/dashboard")}
      onOpenClinicStatus={() => router.push("/clinic-status")}
    />
  );
}
