import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="it-dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="it-monitoring" options={{ headerShown: false }} />
    </Stack>
  );
}
