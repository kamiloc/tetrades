'use client';

import type { ReactNode } from 'react';

import { useWebLocalization } from '../lib/i18n';

import { Button } from './button';
import { Icon, type IconName } from './icon';

// Loading, empty and error states shared by every portal page. Copy is
// user-facing only: never ids, stack traces or server messages.

export function LoadingState({ label }: { label?: string }) {
  const { t } = useWebLocalization();
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2.5 py-12 text-[13px] text-muted"
    >
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-blue"
      />
      {label ?? t('common.loading')}
    </div>
  );
}

export function EmptyState({
  icon = 'flag',
  title,
  children,
  action,
}: {
  icon?: IconName;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-dashed border-dash text-subtle">
        <Icon name={icon} size={18} />
      </span>
      <p className="text-[14px] font-semibold text-text">{title}</p>
      {children ? <div className="max-w-[420px] text-[13px] text-muted">{children}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title,
  children,
  onRetry,
}: {
  title?: ReactNode;
  children?: ReactNode;
  onRetry: () => void;
}) {
  const { t } = useWebLocalization();
  return (
    <div role="alert" className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-rejected-tint text-rejected">
        <Icon name="alert" size={18} />
      </span>
      <p className="text-[14px] font-semibold text-text">{title ?? t('common.somethingWrong')}</p>
      <div className="max-w-[420px] text-[13px] text-muted">{children ?? t('common.loadFailedBody')}</div>
      <div className="mt-2">
        <Button onClick={onRetry}>{t('common.tryAgain')}</Button>
      </div>
    </div>
  );
}
