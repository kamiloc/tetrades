// Point math for the mobile metric chart (SpeedChart). Pure, so the 0-, 1-,
// and many-point cases are unit-tested without a device.

export interface ChartPoint2D {
  x: number;
  y: number;
}

export interface ChartGeometry {
  points: ChartPoint2D[];
  // SVG path for the line ('' when fewer than 2 points).
  line: string;
  // SVG path for the filled area under the line ('' when fewer than 2 points).
  area: string;
}

// Maps values (oldest first) onto a width × height box with vertical padding.
// One point sits centered; identical values draw a flat line mid-height.
export function chartGeometry(values: readonly number[], width: number, height: number, pad = 8): ChartGeometry {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0 || width <= 0 || height <= 0) return { points: [], line: '', area: '' };

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min;
  const usable = Math.max(0, height - pad * 2);

  const points = finite.map((value, index) => ({
    x: finite.length < 2 ? width / 2 : (index * width) / (finite.length - 1),
    y: span === 0 ? height / 2 : pad + usable * (1 - (value - min) / span),
  }));

  if (points.length < 2) return { points, line: '', area: '' };
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  return { points, line, area: `${line} L${width},${height} L0,${height} Z` };
}
