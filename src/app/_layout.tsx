<<<<<<< Updated upstream
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
=======
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider } from '@/context/AuthContext';

SplashScreen.preventAutoHideAsync();
>>>>>>> Stashed changes

export default function RootLayout() {
  return (
    <AuthProvider>
<<<<<<< Updated upstream
      <Stack screenOptions={{ headerShown: false }} />
=======
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
>>>>>>> Stashed changes
    </AuthProvider>
  );
}
