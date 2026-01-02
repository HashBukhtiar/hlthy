// Utility hook to check if a component is focused (for screens)
import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';

export function useScreenIsFocused() {
  const navigation = useNavigation();
  const [isFocused, setIsFocused] = useState(true);

  useEffect(() => {
    const onFocus = () => setIsFocused(true);
    const onBlur = () => setIsFocused(false);
    const unsubscribeFocus = navigation.addListener('focus', onFocus);
    const unsubscribeBlur = navigation.addListener('blur', onBlur);
    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  return isFocused;
}
