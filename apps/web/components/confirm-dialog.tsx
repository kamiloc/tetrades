'use client';

import type { ReactNode } from 'react';

import { useWebLocalization } from '../lib/i18n';

import { Button } from './button';
import { Dialog } from './dialog';
import { InlineAlert } from './inline-alert';

export interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  children: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  pending?: boolean;
  error?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}

// A confirmation step before an action. Closing it never acts.
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  tone = 'danger',
  pending = false,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useWebLocalization();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      width="sm"
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? t('common.working') : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2 text-[13px] text-text">{children}</div>
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
    </Dialog>
  );
}
