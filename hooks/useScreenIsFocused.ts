// Utility hook to check if a component is focused (for screens)
// Uses useIsFocused from react-navigation which is more reliable
import { useIsFocused } from '@react-navigation/native';

export function useScreenIsFocused() {
  // useIsFocused is the recommended hook from react-navigation
  // It properly handles the navigation context
  return useIsFocused();
}
