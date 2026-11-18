// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatDateTime } from '../lib/format';

import { InviteInstructions } from './invite-instructions';

afterEach(cleanup);

const EXPIRES = new Date('2026-11-17T15:30:00Z');

describe('InviteInstructions', () => {
  it('names the exact address, the link on the given origin and the expiry', () => {
    const { container } = render(
      <InviteInstructions
        email="valentina.rios@example.co"
        expiresAt={EXPIRES}
        appOrigin="https://portal.example.co"
      />,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('No email is sent');
    expect(text).toContain('valentina.rios@example.co');
    expect(text).toContain('https://portal.example.co/trainer/invitations');
    expect(text).toContain(formatDateTime('en', EXPIRES));
    expect(formatDateTime('en', EXPIRES)).toMatch(/Nov 1[67], 2026/);
    expect(screen.getByLabelText('Trainer invitations link')).toHaveProperty(
      'value',
      'https://portal.example.co/trainer/invitations',
    );
  });

  it('copies the link', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(
      <InviteInstructions
        email="a@example.co"
        expiresAt={EXPIRES}
        appOrigin="http://localhost:3000"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(writeText).toHaveBeenCalledWith('http://localhost:3000/trainer/invitations');
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeTruthy();
  });
});
