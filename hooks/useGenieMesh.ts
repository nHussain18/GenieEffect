/**
 * useGenieMesh – produces animated mesh data for a macOS-style genie effect.
 * Dock position tracked via SharedValues for real-time UI-thread updates.
 */

import {
  computeWarpedVertex,
  generateMeshIndices,
  generateTextureCoords,
} from '@/utils/genieWarp';
import { useCallback, useMemo } from 'react';
import {
  Easing,
  type SharedValue,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/** Rectangle in screen coordinates */
export interface CardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UseGenieMeshOptions {
  /** Bounding rectangle of the card / window */
  cardRect: CardRect;
  /** Dynamic dock X (SharedValue – tracks draggable icon) */
  dockX: SharedValue<number>;
  /** Dynamic dock Y (SharedValue – tracks draggable icon) */
  dockY: SharedValue<number>;
  /** Horizontal mesh subdivisions (default 16) */
  cols?: number;
  /** Vertical mesh subdivisions (default 24) */
  rows?: number;
  /** Animation duration in ms (default 700) */
  duration?: number;
}

export function useGenieMesh({
  cardRect,
  dockX,
  dockY,
  cols = 16,
  rows = 24,
  duration = 700,
}: UseGenieMeshOptions) {
  const progress = useSharedValue(0);
  const isMinimized = useSharedValue(false);

  const { indices, textures } = useMemo(() => {
    return {
      indices: generateMeshIndices(cols, rows),
      textures: generateTextureCoords(
        cols,
        rows,
        cardRect.width,
        cardRect.height,
      ),
    };
  }, [cols, rows, cardRect.width, cardRect.height]);

  const cx = cardRect.x;
  const cy = cardRect.y;
  const cw = cardRect.width;
  const ch = cardRect.height;

  const vertices = useDerivedValue(() => {
    const p = progress.value;
    const dx = dockX.value;
    const dy = dockY.value;
    const verts: { x: number; y: number }[] = [];

    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const u = c / cols;
        const v = r / rows;
        verts.push(computeWarpedVertex(u, v, p, cx, cy, cw, ch, dx, dy));
      }
    }

    return verts;
  });

  const opacity = useDerivedValue(() => {
    const p = progress.value;
    return p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
  });

  const minimize = useCallback(() => {
    isMinimized.value = true;
    // Slight overshoot (bounce) at the end: animate to 1.06 then settle to 1
    progress.value = withSequence(
      withTiming(1.06, {
        duration: duration * 0.8,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
      withTiming(1, {
        duration: duration * 0.2,
        easing: Easing.bezier(0.0, 0, 0.2, 1),
      }),
    );
  }, [isMinimized, progress, duration]);

  const restore = useCallback(() => {
    isMinimized.value = false;
    progress.value = withTiming(0, {
      duration,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [isMinimized, progress, duration]);

  const toggle = useCallback(() => {
    if (isMinimized.value) {
      restore();
    } else {
      minimize();
    }
  }, [isMinimized, minimize, restore]);

  return {
    vertices,
    textures,
    indices,
    opacity,
    progress,
    isMinimized,
    minimize,
    restore,
    toggle,
  } as const;
}
