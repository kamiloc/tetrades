'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

import { focusRing } from './focus';
import { Icon } from './icon';

// A native <dialog> opened with showModal(): the browser traps focus and makes
// the rest of the page inert. Escape and the close button call onClose; when
// the dialog closes, focus returns to the control that opened it.

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md';
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'md',
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      opener.current?.focus();
      opener.current = null;
    }
  }, [open]);

  // Restore focus if the dialog unmounts while open.
  useEffect(
    () => () => {
      opener.current?.focus();
    },
    [],
  );

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={`m-auto w-full ${width === 'sm' ? 'max-w-[440px]' : 'max-w-[560px]'} overflow-hidden rounded-[16px] bg-paper p-0 text-text shadow-dialog`}
    >
      {open ? (
        <div className="flex flex-col">
          <div className="flex items-start gap-3 border-b border-line px-[22px] py-[18px]">
            <div className="flex-1">
              <h2 id={titleId} className="text-[17px] font-bold tracking-[-0.3px]">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-[3px] text-[12.5px] text-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-line bg-paper text-muted hover:text-text ${focusRing}`}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
          {children ? <div className="flex flex-col gap-4 p-[22px]">{children}</div> : null}
          {footer ? (
            <div className="flex justify-end gap-2 border-t border-line bg-paper2 px-[22px] py-[14px]">
              {footer}
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
