/** DockIcon – draggable dock icon that serves as the genie animation target. */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const DOCK_SIZE = 60;
const DOCK_HALF = DOCK_SIZE / 2;

export interface DockIconProps {
  /** Shared X position (centre of the dock icon) – written by the gesture */
  dockX: SharedValue<number>;
  /** Shared Y position (centre of the dock icon) – written by the gesture */
  dockY: SharedValue<number>;
  /** Whether the genie animation is currently minimised */
  isMinimized: SharedValue<boolean>;
  /** Fired on a tap (no significant drag). Used to restore the window. */
  onTap: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function DockIcon({
  dockX,
  dockY,
  isMinimized,
  onTap,
}: DockIconProps) {
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const scale = useSharedValue(1);

  const pan = Gesture.Pan()
    .minDistance(5)
    .onBegin(() => {
      'worklet';
      startX.value = dockX.value;
      startY.value = dockY.value;
      scale.value = withSpring(1.12, { damping: 12 });
    })
    .onUpdate((e) => {
      'worklet';
      dockX.value = startX.value + e.translationX;
      dockY.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 12 });
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 12 });
    });

  const tap = Gesture.Tap().onEnd(() => {
    'worklet';
    runOnJS(onTap)();
  });

  const composed = Gesture.Race(tap, pan);


  const animatedStyle = useAnimatedStyle(() => ({
    left: dockX.value - DOCK_HALF,
    top: dockY.value - DOCK_HALF,
    transform: [{ scale: scale.value }],
    borderColor: isMinimized.value
      ? 'rgba(99,102,241,1)'
      : 'rgba(255,255,255,0.4)',
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.dock, animatedStyle]}>
        <View style={styles.innerIcon}>
          <Text style={styles.glyph}>✨</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    width: DOCK_SIZE,
    height: DOCK_SIZE,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 30, 46, 0.95)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    shadowOpacity: 0.5,
  },
  innerIcon: {
    width: 36,
    height: 36,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 24,
    color: '#fff',
    marginTop: -2,
  },
});
