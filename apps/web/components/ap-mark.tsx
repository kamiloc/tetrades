import { useId } from 'react';

// The Athlete Passport shield mark, from the prototype's atoms.jsx.
export function ApMark({ size = 28, onDark = false }: { size?: number; onDark?: boolean }) {
  const gradientId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B85FF" />
          <stop offset="1" stopColor="#1A6BFF" />
        </linearGradient>
      </defs>
      <path
        d="M16 2 L28 6 V14 C28 22 22.5 27 16 30 C9.5 27 4 22 4 14 V6 Z"
        fill={`url(#${gradientId})`}
        stroke={onDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.04)'}
        strokeWidth="1"
      />
      <path
        d="M11.5 21 L14.5 11 L17.5 21 M12.5 18 H16.5"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M19 11 V21 M19 11 H21.5 A2 2 0 0 1 21.5 15 H19"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
