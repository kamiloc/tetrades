// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { installDialogPolyfill } from '../test/dialog-polyfill';

import { ConfirmDialog } from './confirm-dialog';
import { Dialog } from './dialog';

beforeAll(installDialogPolyfill);
afterEach(cleanup);

function Harness({ onConfirm = () => undefined }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <ConfirmDialog
        open={open}
        title="Deactivate club?"
        confirmLabel="Deactivate"
        onConfirm={onConfirm}
        onClose={() => setOpen(false)}
      >
        Trainers lose access.
      </ConfirmDialog>
    </>
  );
}

describe('Dialog', () => {
  it('closes on Escape without acting and returns focus to its opener', () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    fireEvent.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Deactivate club?' });
    expect(dialog.hasAttribute('open')).toBe(true);
    screen.getByRole('button', { name: 'Cancel' }).focus();

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(dialog.hasAttribute('open')).toBe(false);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(opener);
  });

  it('closes from the close button and the Cancel button', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('dialog', { hidden: true }).hasAttribute('open')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog', { hidden: true }).hasAttribute('open')).toBe(false);
  });

  it('labels the dialog with its title and description', () => {
    render(
      <Dialog open onClose={() => undefined} title="Invite a trainer" description="Email only.">
        body
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Invite a trainer' });
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
    expect(screen.getByText('Email only.')).toBeTruthy();
  });
});
