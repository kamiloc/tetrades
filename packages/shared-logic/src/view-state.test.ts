import { describe, expect, it } from 'vitest';

import {
  TAB_STATES,
  clubsSubtitle,
  connectionsSubtitle,
  performanceSubtitle,
  selectViewState,
} from './view-state.js';

describe('selectViewState', () => {
  it('loading wins over everything', () => {
    expect(selectViewState({ isLoading: true, isError: true, isEmpty: true })).toBe('loading');
  });

  it('shows loading while retrying after an error', () => {
    expect(selectViewState({ isLoading: false, isError: true, isEmpty: true, isFetching: true })).toBe('loading');
  });

  it('a background fetch without an error keeps the loaded state', () => {
    expect(selectViewState({ isLoading: false, isError: false, isEmpty: false, isFetching: true })).toBe('loaded');
  });

  it('error wins over empty', () => {
    expect(selectViewState({ isLoading: false, isError: true, isEmpty: true })).toBe('error');
  });

  it('empty when loaded with no data', () => {
    expect(selectViewState({ isLoading: false, isError: false, isEmpty: true })).toBe('empty');
  });

  it('loaded otherwise', () => {
    expect(selectViewState({ isLoading: false, isError: false, isEmpty: false })).toBe('loaded');
  });
});

describe('TAB_STATES copy', () => {
  it('keeps the handoff copy verbatim', () => {
    expect(TAB_STATES.profile.error.title).toBe("Couldn't load your profile");
    expect(TAB_STATES.profile.error.secondary).toBe('Sign out');
    expect(TAB_STATES.connections.empty.primary).toBe('Find athletes');
    expect(TAB_STATES.performance.empty.title).toBe('No performance data yet');
    expect(TAB_STATES.clubs.error.title).toBe("You're offline");
  });

  it('has empty and error copy for every tab', () => {
    for (const tab of Object.values(TAB_STATES)) {
      expect(tab.empty.title).not.toBe('');
      expect(tab.error.primary).toBe('Try again');
    }
  });
});

describe('loaded subtitles', () => {
  it('counts athletes', () => {
    expect(connectionsSubtitle(1)).toBe('1 athlete');
    expect(connectionsSubtitle(247)).toBe('247 athletes');
  });

  it('counts clubs and invitations', () => {
    expect(clubsSubtitle(1, 2)).toBe('1 active club · 2 invitations');
    expect(clubsSubtitle(2, 1)).toBe('2 active clubs · 1 invitation');
    expect(clubsSubtitle(3, 0)).toBe('3 active clubs');
  });

  it('joins sport and position', () => {
    expect(performanceSubtitle('Soccer', 'Midfielder')).toBe('Soccer · Midfielder');
    expect(performanceSubtitle('Soccer', null)).toBe('Soccer');
    expect(performanceSubtitle(null, '  ')).toBe(TAB_STATES.performance.sub.empty);
  });
});
