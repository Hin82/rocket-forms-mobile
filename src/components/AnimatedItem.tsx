import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

interface AnimatedItemProps {
  index: number;
  refreshKey?: number;
  children: React.ReactNode;
  delayMultiplier?: number;
  maxDelay?: number;
  duration?: number;
  translateY?: number;
}

export default function AnimatedItem({
  index,
  refreshKey = 0,
  children,
  delayMultiplier = 40,
  maxDelay = 400,
  duration = 250,
  translateY = 15,
}: AnimatedItemProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(translateY)).current;

  useEffect(() => {
    // Reset values on refresh
    fadeAnim.setValue(0);
    slideAnim.setValue(translateY);

    const delay = Math.min(index * delayMultiplier, maxDelay);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration, delay, useNativeDriver: true }),
    ]).start();
  }, [refreshKey, index, delayMultiplier, maxDelay, duration, translateY, fadeAnim, slideAnim]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
}
