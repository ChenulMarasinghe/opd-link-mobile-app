import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const HIDDEN = [
  "past-appointments",
  "appointment-details",
  "queue-status",
  "book-appointment",
  "select-date-time",
  "clinic-status",
];

export default function PatientLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#6366F1",
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: { height: 64, paddingTop: 8, backgroundColor: "#EEF4FF", borderTopWidth: 0 },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ tabBarIcon: ({ color }) => <Ionicons name="home" size={28} color={color} /> }} />
      <Tabs.Screen name="upcoming-appointments" options={{ tabBarIcon: ({ color }) => <Ionicons name="calendar" size={28} color={color} /> }} />
      <Tabs.Screen name="notifications" options={{ tabBarIcon: ({ color }) => <Ionicons name="notifications-outline" size={28} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={28} color={color} /> }} />
      {HIDDEN.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}