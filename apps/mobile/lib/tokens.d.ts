// Types for lib/tokens.js (kept as CommonJS for tailwind.config.js).

export declare const colors: {
  readonly ink: string;
  readonly ink2: string;
  readonly paper: string;
  readonly canvas: string;
  readonly line: string;
  readonly text: string;
  readonly muted: string;
  readonly subtle: string;
  readonly onInk: string;
  readonly onInkMuted: string;
  readonly blue: string;
  readonly blueTint: string;
  readonly blueLine: string;
  readonly dash: string;
  readonly danger: string;
  readonly dangerTint: string;
  readonly dangerLine: string;
  readonly segmented: string;
  readonly tag: string;
  readonly pending: string;
  readonly pendingTint: string;
  readonly tabActive: string;
  readonly tabInactive: string;
  readonly tabBarBg: string;
  readonly tabBarBorder: string;
  readonly headerChipBg: string;
  readonly headerChipBorder: string;
  readonly headerHairline: string;
};

export declare const radius: {
  readonly xs: number;
  readonly sm: number;
  readonly md: number;
  readonly lg: number;
  readonly segmented: number;
  readonly xl: number;
  readonly '2xl': number;
  readonly pill: number;
};

export type TextPreset = readonly [
  fontSize: number,
  lineHeight: number | undefined,
  letterSpacing: number,
  fontWeight: string,
];

export declare const textPresets: Readonly<Record<string, TextPreset>>;
