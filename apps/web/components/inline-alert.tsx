import type { ReactNode } from 'react';

import { Icon } from './icon';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

const TONES: Record<AlertTone, string> = {
  info: 'bg-blue-tint border-blue-line text-text',
  success: 'bg-verified-tint border-verified/20 text-text',
  warning: 'bg-pending-tint border-pending/20 text-text',
  error: 'bg-rejected-tint border-rejected/20 text-text',
};

const ICON_TONES: Record<AlertTone, string> = {
  info: 'text-blue',
  success: 'text-verified',
  warning: 'text-pending',
  error: 'text-rejected',
};

export interface InlineAlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}

// Errors and warnings are announced (role="alert"); info and success are polite.
export function InlineAlert({ tone = 'info', title, children, action }: InlineAlertProps) {
  const live = tone === 'error' || tone === 'warning';
  return (
    <div
      role={live ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-[10px] border px-3.5 py-3 text-[13px] ${TONES[tone]}`}
    >
      <Icon
        name={tone === 'success' ? 'check' : 'alert'}
        size={16}
        className={`mt-px shrink-0 ${ICON_TONES[tone]}`}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-muted [&_strong]:text-text">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
