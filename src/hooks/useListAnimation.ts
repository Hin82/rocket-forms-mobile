import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

/**
 * Returns an animated style for list items that fade + slide in.
 * Call with the item index for staggered entrance animation.
 */
export function useItemAnimation(index: number, delay = 50) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const staggerDelay = Math.min(index * delay, 500); // Cap at 500ms
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: staggerDelay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: staggerDelay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return {
    opacity: fadeAnim,
    transform: [{ translateY: slideAnim }],
  };
}
