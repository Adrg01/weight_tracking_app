// Wrapper that adds swipe-to-navigate between tabs

import React, { useRef } from 'react';
import { PanResponder, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';

const TAB_ORDER = ['/(tabs)', '/(tabs)/history', '/(tabs)/insights', '/(tabs)/settings'];

interface SwipeableTabProps {
  currentIndex: number;
  children: React.ReactNode;
}

export default function SwipeableTab({ currentIndex, children }: SwipeableTabProps) {
  const swipeThreshold = 50;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture horizontal swipes (not vertical scrolling)
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -swipeThreshold && currentIndex < TAB_ORDER.length - 1) {
          // Swipe left → next tab
          router.navigate(TAB_ORDER[currentIndex + 1] as any);
        } else if (gestureState.dx > swipeThreshold && currentIndex > 0) {
          // Swipe right → previous tab
          router.navigate(TAB_ORDER[currentIndex - 1] as any);
        }
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
