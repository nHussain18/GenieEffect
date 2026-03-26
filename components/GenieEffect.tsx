/**
 * GenieEffect – Skia mesh component for macOS-style genie minimise animation.
 * At rest the source view is interactive; during animation the warped canvas shows.
 */

import {
  Canvas,
  ImageShader,
  makeImageFromView,
  Vertices,
  type SkImage,
} from '@shopify/react-native-skia';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import type { CardRect } from '@/hooks/useGenieMesh';
import { useGenieMesh } from '@/hooks/useGenieMesh';


export interface GenieControls {
  minimize: () => void;
  restore: () => void;
  toggle: () => void;
  isMinimized: SharedValue<boolean>;
}

export interface GenieEffectProps {
  /** Width of the card (pt) */
  width: number;
  /** Height of the card (pt) */
  height: number;
  /** Full canvas width – usually the screen width */
  canvasWidth: number;
  /** Full canvas height – usually the screen height */
  canvasHeight: number;
  /** Top-left X of the card (default: centred horizontally) */
  cardX?: number;
  /** Top-left Y of the card (default: 80) */
  cardY?: number;
  /** Dynamic dock X (SharedValue) */
  dockX: SharedValue<number>;
  /** Dynamic dock Y (SharedValue) */
  dockY: SharedValue<number>;
  /** Mesh columns (default 16) */
  cols?: number;
  /** Mesh rows (default 24) */
  rows?: number;
  /** Animation duration in ms (default 700) */
  duration?: number;
  /** Called once mesh is ready, with imperative controls */
  onReady?: (controls: GenieControls) => void;
  /** Child content rendered inside the card */
  children: React.ReactNode;
}


export default function GenieEffect({
  width,
  height,
  canvasWidth,
  canvasHeight,
  cardX,
  cardY,
  dockX,
  dockY,
  cols = 16,
  rows = 24,
  duration = 700,
  onReady,
  children,
}: GenieEffectProps) {
  const viewRef = useRef<View>(null);
  const [image, setImage] = useState<SkImage | null>(null);

  const resolvedCardX = cardX ?? (canvasWidth - width) / 2;
  const resolvedCardY = cardY ?? 80;

  const cardRect: CardRect = {
    x: resolvedCardX,
    y: resolvedCardY,
    width,
    height,
  };

  // Mesh + animation hook
  const {
    vertices,
    textures,
    indices,
    opacity,
    progress,
    isMinimized,
    minimize,
    restore,
    toggle,
  } = useGenieMesh({ cardRect, dockX, dockY, cols, rows, duration });

  const captureView = useCallback(async () => {
    if (!viewRef.current) return;
    const snapshot = await makeImageFromView(viewRef);
    if (snapshot) setImage(snapshot);
  }, []);

  useEffect(() => {
    const id = setTimeout(captureView, 250);
    return () => clearTimeout(id);
  }, [captureView]);

  useEffect(() => {
    if (image) onReady?.({ minimize, restore, toggle, isMinimized });
  }, [image, onReady, minimize, restore, toggle, isMinimized]);

  const sourceAnimatedStyle = useAnimatedStyle(() => ({
    opacity: Math.abs(progress.value) < 0.01 ? 1 : 0,
  }));

  const canvasAnimatedStyle = useAnimatedStyle(() => ({
    opacity: Math.abs(progress.value) < 0.01 ? 0 : opacity.value,
  }));

  return (
    <View style={styles.root} pointerEvents="box-none">
      {image && (
        <Animated.View
          style={[styles.canvasWrapper, canvasAnimatedStyle]}
          pointerEvents="none"
        >
          <Canvas
            style={{ width: canvasWidth, height: canvasHeight }}
            pointerEvents="none"
          >
            <Vertices
              vertices={vertices}
              textures={textures}
              indices={indices}
            >
              <ImageShader
                image={image}
                fit="fill"
                rect={{ x: 0, y: 0, width, height }}
              />
            </Vertices>
          </Canvas>
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.sourceView,
          { width, height, left: resolvedCardX, top: resolvedCardY },
          sourceAnimatedStyle,
        ]}
      >
        <View ref={viewRef} collapsable={false} style={styles.snapshotTarget}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  sourceView: {
    position: 'absolute',
    zIndex: 2,
  },
  snapshotTarget: {
    flex: 1,
  },
  canvasWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
});
