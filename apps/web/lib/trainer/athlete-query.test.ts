import { describe, expect, it } from 'vitest';

import { parseAthleteQuery } from './athlete-query';

describe('parseAthleteQuery', () => {
  it('reads the slug from a full profile URL, from any host', () => {
    expect(parseAthleteQuery('https://athletepassport.co/athlete/mariana-pajon')).toEqual({
      kind: 'slug',
      slug: 'mariana-pajon',
      fallbackName: null,
    });
    expect(parseAthleteQuery('  http://localhost:3000/athlete/mariana-pajon/  ')).toMatchObject({
      kind: 'slug',
      slug: 'mariana-pajon',
    });
  });

  it('reads @slug and a bare slug, with a name fallback', () => {
    expect(parseAthleteQuery('@caterine-ibarguen')).toEqual({
      kind: 'slug',
      slug: 'caterine-ibarguen',
      fallbackName: 'caterine-ibarguen',
    });
    expect(parseAthleteQuery('egan-bernal')).toEqual({
      kind: 'slug',
      slug: 'egan-bernal',
      fallbackName: 'egan-bernal',
    });
  });

  it('treats a name with spaces as a name search', () => {
    expect(parseAthleteQuery('Mariana Pajón')).toEqual({ kind: 'name', query: 'Mariana Pajón' });
  });

  it('treats a 2-character input as a name, and a 1-character input as too short', () => {
    expect(parseAthleteQuery('Ma')).toEqual({ kind: 'name', query: 'Ma' });
    expect(parseAthleteQuery('M')).toEqual({ kind: 'too-short' });
    expect(parseAthleteQuery(' ')).toEqual({ kind: 'empty' });
  });

  it('treats a non-profile URL and an uppercase handle as names', () => {
    expect(parseAthleteQuery('https://example.co/clubs/abc')).toEqual({
      kind: 'name',
      query: 'https://example.co/clubs/abc',
    });
    expect(parseAthleteQuery('Mariana')).toEqual({ kind: 'name', query: 'Mariana' });
  });

  it('flags a query over 100 characters', () => {
    expect(parseAthleteQuery(`Mariana ${'a'.repeat(100)}`)).toEqual({ kind: 'too-long' });
  });
});
