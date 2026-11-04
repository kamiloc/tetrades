import type { ClubPublicOutput } from '@packages/validators';

import { createServerApi, getApiErrorCode } from '../server-api';

import { MY_CLUBS_LIMIT } from './my-clubs-limit';

// The signed-in user's trainer clubs, read server-side (design D1). Up to 50,
// the page maximum. The API re-checks club access on every later call.

export type MyClubs =
  | { status: 'ok'; clubs: ClubPublicOutput[] }
  | { status: 'signed-out' }
  | { status: 'unavailable' };

export async function loadMyTrainerClubs(): Promise<MyClubs> {
  const api = await createServerApi();
  try {
    const page = await api.club.listMyTrainerClubs.query({ take: MY_CLUBS_LIMIT });
    return { status: 'ok', clubs: page.items.map((item) => item.club) };
  } catch (error) {
    return getApiErrorCode(error) === 'UNAUTHORIZED'
      ? { status: 'signed-out' }
      : { status: 'unavailable' };
  }
}
