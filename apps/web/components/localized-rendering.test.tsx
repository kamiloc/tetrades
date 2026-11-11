// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatDateTime } from '../lib/format';
import { WebLocalizationProvider } from '../lib/i18n';

import { InviteInstructions } from './invite-instructions';
import { NotAuthorized } from './not-authorized';
import { ErrorState } from './states';
import { StatusChip } from './status-chip';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('../app/auth/actions', () => ({ signOut: async () => undefined }));

afterEach(cleanup);

const spanish = (node: ReactNode) => render(<WebLocalizationProvider locale="es">{node}</WebLocalizationProvider>);

describe('Spanish portal rendering', () => {
  it('renders status chips in Spanish', () => {
    spanish(<StatusChip status="waitingAthlete" />);
    expect(screen.getByText('Esperando al atleta')).toBeTruthy();
  });

  it('renders shared error state defaults in Spanish', () => {
    spanish(<ErrorState onRetry={() => undefined} />);
    expect(screen.getByText('Algo salió mal')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Intentar de nuevo' })).toBeTruthy();
  });

  it('renders the access notice in Spanish with the address emphasized', () => {
    const { container } = spanish(<NotAuthorized email="andres.gomez@example.co" />);
    expect(screen.getByRole('heading', { name: 'Sin autorización' })).toBeTruthy();
    expect(container.querySelector('strong')?.textContent).toBe('andres.gomez@example.co');
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy();
  });

  it('formats the invitation expiry for Spanish', () => {
    const expires = new Date('2026-11-17T15:30:00Z');
    const { container } = spanish(
      <InviteInstructions email="valentina.rios@example.co" expiresAt={expires} appOrigin="https://portal.example.co" />,
    );
    expect(container.textContent).toContain('No se envía ningún correo');
    expect(container.textContent).toContain(formatDateTime('es', expires));
    expect(screen.getByLabelText('Enlace de invitaciones de entrenador')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copiar enlace' })).toBeTruthy();
  });
});
