/** Worklet-compatible vertex warping utilities for the genie minimize animation. */

/**
 * Compute the warped position of a single mesh vertex.
 * Uses a cascading flow model where bottom rows converge to the dock first,
 * with smoothstep interpolation for the characteristic curved silhouette.
 */
export function computeWarpedVertex(
  u: number,
  v: number,
  progress: number,
  cardX: number,
  cardY: number,
  cardW: number,
  cardH: number,
  dockX: number,
  dockY: number,
): { x: number; y: number } {
  'worklet';

  const origY = cardY + v * cardH;
  const centerX = cardX + cardW / 2;

  // Cascading flow
  // Each row has a unique time-window that shapes the cascade.
  // Bottom rows (v≈1) start immediately; top rows (v≈0) start later.
  // A power-curve stagger creates a more organic, non-linear cascade.
  const stagger = Math.pow(1 - v, 1.6);
  const startP = stagger * 0.40;
  const endP = 0.50 + stagger * 0.50;
  const raw = (progress - startP) / (endP - startP);
  const t = Math.max(0, Math.min(1, raw));

  // Smootherstep easing (Perlin, C² continuous – zero 1st AND 2nd derivatives at 0/1)
  const flow = t * t * t * (t * (t * 6 - 15) + 10);

  // Width compression (non-linear)
  // Bottom rows pinch much more aggressively via a power curve on flow.
  // The exponent grows with v: top rows (v≈0) → exponent ≈1.0 (gentle),
  // bottom rows (v≈1) → exponent ≈3.5 (very steep pinch).
  const pinchExp = 1.0 + v * 2.5;
  const widthScale = Math.pow(Math.max(1 - flow, 0), pinchExp);

  // Horizontal centre shift toward dock
  const centerShift = flow * flow;
  const newCenterX = centerX + (dockX - centerX) * centerShift;

  let newX = newCenterX + (u - 0.5) * cardW * widthScale;

  // Multi-harmonic wave distortion
  const waveEnvelope = 6 * Math.sqrt(Math.max(progress * (1 - progress), 0));
  const phase = progress * Math.PI * 2.5;
  const wave1 = Math.sin(v * Math.PI * 3.5 - phase) * waveEnvelope;
  const wave2 = Math.sin(v * Math.PI * 7.0 + phase * 0.7) * waveEnvelope * 0.3;
  newX += (wave1 + wave2) * widthScale;

  // Vertical position — bottom rows rush toward dock via power curve on flow
  const verticalFlow = Math.pow(flow, 1.0 + v * 0.8);
  const newY = origY + (dockY - origY) * verticalFlow;

  return { x: newX, y: newY };
}

/** Generate triangle indices for a cols × rows mesh grid. */
export function generateMeshIndices(cols: number, rows: number): number[] {
  const indices: number[] = [];
  const stride = cols + 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tl = row * stride + col;
      const tr = tl + 1;
      const bl = tl + stride;
      const br = bl + 1;

      indices.push(tl, bl, tr);
      indices.push(tr, bl, br);
    }
  }

  return indices;
}

/** Generate texture coordinates mapping grid vertices to source image positions. */
export function generateTextureCoords(
  cols: number,
  rows: number,
  width: number,
  height: number,
): { x: number; y: number }[] {
  const coords: { x: number; y: number }[] = [];

  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= cols; col++) {
      coords.push({
        x: (col / cols) * width,
        y: (row / rows) * height,
      });
    }
  }

  return coords;
}
