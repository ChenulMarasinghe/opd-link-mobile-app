import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="appointments" />
      <Stack.Screen name="queues" />
      <Stack.Screen name="manage" />
      <Stack.Screen name="broadcast" />
    </Stack>
  );
}
