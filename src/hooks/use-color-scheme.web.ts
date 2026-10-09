import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * To support static rendering, default to light until the native color scheme resolves on web.
 */
export function useColorScheme() {
  const colorScheme = useRNColorScheme();
  return colorScheme ?? 'light';
}
