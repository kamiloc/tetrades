import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { focusRing } from './focus';
import { Icon, type IconName } from './icon';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'link';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-blue text-on-ink border-blue shadow-cta hover:bg-blue2 hover:border-blue2',
  secondary: 'bg-paper text-text border-line hover:bg-paper2',
  danger: 'bg-paper text-rejected border-line hover:bg-rejected-tint',
  link: 'bg-transparent text-blue border-transparent hover:text-blue2 hover:underline',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  icon?: IconName;
  children: ReactNode;
}

export function buttonClasses(variant: ButtonVariant = 'secondary', size: 'md' | 'sm' = 'md') {
  const sizing =
    size === 'sm'
      ? 'px-[11px] py-[5px] rounded-[8px] text-[11.5px]'
      : 'px-[13px] py-[7px] rounded-[10px] text-[12.5px]';
  return `inline-flex items-center justify-center gap-1.5 whitespace-nowrap border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${VARIANTS[variant]} ${focusRing}`;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  type = 'button',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={`${buttonClasses(variant, size)} ${className}`} {...rest}>
      {icon ? <Icon name={icon} size={size === 'sm' ? 12 : 13} strokeWidth={2} /> : null}
      {children}
    </button>
  );
}
