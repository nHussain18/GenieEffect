import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  Easing,
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/** Box dimensions */
const INITIAL_SIZE = 100;
const FINAL_SIZE = 200;

/**
 * Number of horizontal slices in the mesh.
 * More rows = smoother the S-curve.
 */
const NUM_ROWS = 40;

/** Total animation duration (ms) */
const ANIM_DURATION = 1_100;

/**
 * Height of the transition band expressed as a fraction of the total shape height.
 * The band sweeps downward through the shape as the animation progresses.
 * Larger value = more rows are in the warp zone simultaneously.
 */
const BAND_HEIGHT = 0.85;

// ─── Worklet helpers ────────────────────────────────────────────────────────

/**
 * Ken Perlin's smootherstep: zero 1st AND 2nd derivatives at both ends.
 * Used for the overall row motion to feel silky.
 */
function smootherstep(t: number): number {
  'worklet';
  const c = Math.min(1, Math.max(0, t));
  return c * c * c * (c * (c * 6 - 15) + 10);
}

/**
 * Spatial width-reduction curve for the genie shape.
 * localV ∈ [0, 1]: top of transition band → bottom.
 * Returns c ∈ [0, 1]: 0 = full destination width, 1 = source (minimum) width.
 *
 * Desired profile (matches user description):
 *   0.00–0.15 → flat 0   (max width, top region)
 *   0.15–0.60 → cubic rise from 0 to 1 (steep at the 40–60% overall height zone)
 *   0.60–1.00 → flat 1   (minimum width, bottom 40%)
 */
function genieCurve(localV: number): number {
  'worklet';
  if (localV < 0.15) return 0;
  if (localV > 0.60) return 1;
  const tt = (localV - 0.15) / 0.45; // normalise 0.15–0.60 → 0–1
  return tt * tt * tt;               // cubic: slow start, fast finish → steep 40–60%
}

// ────────────────────────────────────────────────────────────────────────────

export default function Index() {
  const { width, height } = useWindowDimensions();

  // ── Source geometry: bottom-centre, small ──────────────────────────────────
  const srcTop   = height - INITIAL_SIZE; // top-Y of the resting box
  const srcLeft  = (width - INITIAL_SIZE) / 2;
  const srcRight = srcLeft + INITIAL_SIZE;
  const srcBot   = height;

  // ── Destination geometry: top-right corner, large ─────────────────────────
  const dstTop   = 0;
  const dstLeft  = width - FINAL_SIZE;
  const dstRight = width;
  const dstBot   = FINAL_SIZE;

  // ── Animation state ────────────────────────────────────────────────────────

  /** Normalised progress: 0 = at source, 1 = at destination */
  const animProgress = useSharedValue(0);

  /** Prevents new taps while an animation is in flight */
  const [canTap, setCanTap] = useState(true);

  /** Switches which tap-zone is rendered */
  const [isAtDest, setIsAtDest] = useState(false);

  // ── Genie mesh shape ───────────────────────────────────────────────────────

  /**
   * Builds the macOS-style genie polygon on the UI thread (worklet).
   *
   * KEY INSIGHT from the screenshot:
   *   • The RIGHT edge travels straight up — it is the "anchor rail".
   *   • The LEFT edge forms a deep S-curve — wide at top, pinching at bottom.
   *   • The TOP edge is already at full destination width early on.
   *   • The BOTTOM edge stays narrow until very late.
   *
   * We model this with a staggered row system where:
   *   - Each row v ∈ [0,1] (0 = top, 1 = bottom) has its OWN progress p(v, t).
   *   - p is calculated from a time window that starts LATER for rows higher v.
   *   - The right X of each row does a simple lerp → straight right rail.
   *   - The left X uses the same lerp but with a much larger lag → S-curve.
   *
   * Genie-out  (t: 0→1): top leads,    bottom follows.
   * Genie-back (t: 1→0): bottom leads, top follows (mirror).
   *
   * Width profile at any frozen frame (driven by genieCurve):
   *   top 0–15%   : maximum width (flat)
   *   15–40%      : gentle decline
   *   40–60%      : steep drop to minimum  ← the classic genie "neck"
   *   bottom 40%  : minimum width (flat)
   */
  const genieShape = useDerivedValue(() => {
    const anim = animProgress.value;

    /**
     * Sweeping band: top boundary moves DOWNWARD from -BAND_HEIGHT to 1
     * as anim goes 0 → 1, so the top rows transform first.
     *   v < bandTop  → above the band  → W = 1 (already at dest)
     *   v > bandBot  → below the band  → W = 0 (still at source)
     *   v in between → inside the band → W = 1 - genieCurve(localV)
     */
    const bandTop = -BAND_HEIGHT + anim * (1 + BAND_HEIGHT);
    const bandBot = bandTop + BAND_HEIGHT;

    const leftPts:  { x: number; y: number }[] = [];
    const rightPts: { x: number; y: number }[] = [];

    for (let i = 0; i <= NUM_ROWS; i++) {
      const v = i / NUM_ROWS; // 0 = top row, 1 = bottom row

      /**
       * Per-row progress W ∈ [0, 1]:
       *   0 = row is at its SOURCE position/size
       *   1 = row is at its DESTINATION position/size
       *
       * Rows above the band get W=1 (fully transformed).
       * Rows inside the band get W shaped by genieCurve — which produces
       * the specific width profile the user requested.
       */
      let W: number;
      if (v <= bandTop) {
        W = 1; // above band: already at destination
      } else if (v >= bandBot) {
        W = 0; // below band: still at source
      } else {
        const localV = (v - bandTop) / BAND_HEIGHT; // 0 = top of band, 1 = bottom
        W = 1 - genieCurve(localV);
      }

      /** Y: each row slides between its source and destination Y independently. */
      const y = (srcTop + v * INITIAL_SIZE) * (1 - W)
              + (dstTop + v * FINAL_SIZE)   * W;

      /**
       * RIGHT edge: uses linear W → moves at full speed → near-straight vertical rail.
       * LEFT edge:  uses W² → significant lag → the deep S-curve on the left.
       *
       * Because dstLeft > srcLeft and W² ≤ W for W∈[0,1], the left side always
       * lags the right side, and width stays within [INITIAL_SIZE, FINAL_SIZE].
       */
      const xRight = srcRight + W       * (dstRight - srcRight);
      const xLeft  = srcLeft  + (W * W) * (dstLeft  - srcLeft);

      leftPts.push({ x: xLeft,  y });
      rightPts.push({ x: xRight, y });
    }

    // Closed polygon: left edge ↓, bottom →, right edge ↑
    const path = Skia.Path.Make();
    path.moveTo(leftPts[0].x, leftPts[0].y);
    for (let i = 1; i <= NUM_ROWS; i++) {
      path.lineTo(leftPts[i].x, leftPts[i].y);
    }
    path.lineTo(rightPts[NUM_ROWS].x, rightPts[NUM_ROWS].y);
    for (let i = NUM_ROWS - 1; i >= 0; i--) {
      path.lineTo(rightPts[i].x, rightPts[i].y);
    }
    path.close();

    return path;
  }, [animProgress]);

  // ── Tap handlers ───────────────────────────────────────────────────────────

  /** Kick off the genie-out animation (source → destination) */
  const handlePressSource = useCallback(() => {
    if (!canTap) return;
    setCanTap(false);

    animProgress.value = withTiming(
      1,
      { duration: ANIM_DURATION, easing: Easing.out(Easing.ease) },
      () => {
        runOnJS(setCanTap)(true);
        runOnJS(setIsAtDest)(true);
      },
    );
  }, [canTap, animProgress]);

  /** Kick off the genie-back animation (destination → source) */
  const handlePressDest = useCallback(() => {
    if (!canTap) return;
    setCanTap(false);

    animProgress.value = withTiming(
      0,
      { duration: ANIM_DURATION, easing: Easing.out(Easing.ease) },
      () => {
        runOnJS(setCanTap)(true);
        runOnJS(setIsAtDest)(false);
      },
    );
  }, [canTap, animProgress]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <Text>Edit app/index.tsx to edit this screen.</Text>

      {/*
       * Full-screen Skia canvas.
       * It renders only the genie-warped polygon; all pointer events pass through.
       */}
      <Canvas style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Path path={genieShape} color="red" />
      </Canvas>

      {/* Tap zone shown while the box is at the source (bottom-centre) */}
      {!isAtDest && (
        <Pressable
          onPress={handlePressSource}
          style={[
            styles.tapZone,
            {
              bottom: 0,
              left: srcLeft,
              width: INITIAL_SIZE,
              height: INITIAL_SIZE,
            },
          ]}
        />
      )}

      {/* Tap zone shown once the box has arrived at the destination (top-right) */}
      {isAtDest && (
        <Pressable
          onPress={handlePressDest}
          style={[
            styles.tapZone,
            {
              top: dstTop,
              right: 0,
              width: FINAL_SIZE,
              height: FINAL_SIZE,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /** Transparent pressable hit area — the shape is painted by the Canvas above */
  tapZone: {
    position: 'absolute',
  },
});


