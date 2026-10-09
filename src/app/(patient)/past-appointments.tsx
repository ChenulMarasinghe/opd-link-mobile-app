import { Redirect } from "expo-router";

export default function PastAppointments() {
  return <Redirect href={{ pathname: "/upcoming-appointments", params: { tab: "past" } }} />;
}