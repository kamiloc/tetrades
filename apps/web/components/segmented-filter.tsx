'use client';

import { useRef } from 'react';

import { focusRing } from './focus';

// A single-choice filter (radio group semantics), like the prototype's Segmented.
// Arrow keys move between options.

export interface SegmentedFilterProps<Value extends string> {
  label: string;
  options: { value: Value; label: string }[];
  value: Value;
  onChange: (value: Value) => void;
}

export function SegmentedFilter<Value extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedFilterProps<Value>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (from: number, delta: number) => {
    const index = (from + delta + options.length) % options.length;
    const option = options[index];
    if (option === undefined) return;
    onChange(option.value);
    refs.current[index]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-[10px] bg-segmented p-[3px]"
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                move(index, 1);
              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                move(index, -1);
              }
            }}
            className={`rounded-[8px] px-3 py-[5px] text-[12.5px] font-semibold ${selected ? 'bg-paper text-text shadow-sm' : 'text-muted hover:text-text'} ${focusRing}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
