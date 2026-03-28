import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';

/**
 * Haptic feedback utilities for common interactions.
 * Use these instead of calling Haptics directly for consistency.
 */
export function useHaptic() {
  const tap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const success = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const warning = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  const error = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, []);

  const selection = useCallback(() => {
    Haptics.selectionAsync();
  }, []);

  const medium = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  return { tap, success, warning, error, selection, medium };
}
