import { router } from "expo-router";
import ClinicStatusScreen from "../../screens/patient/ClinicStatusScreen";

export default function ClinicStatusRoute() {
  return <ClinicStatusScreen onBack={() => router.replace("/(patient)/dashboard")} />;
}
