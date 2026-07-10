import { describe, expect, it } from 'vitest';
import { provisionOfficialUrl, provisionPathFromId, provisionType } from './structure';

describe('legislation provision normalization', () => {
  it('normalizes nested official IDs into passage paths', () => {
    expect(provisionPathFromId('schedule-1-paragraph-3')).toBe('/schedule/1/paragraph/3');
    expect(provisionPathFromId('section-6')).toBe('/section/6');
  });

  it('falls back to a stable fragment when a semantic path is unavailable', () => {
    expect(provisionOfficialUrl('https://www.legislation.gov.uk/ukpga/1998/42', 'body-1')).toBe(
      'https://www.legislation.gov.uk/ukpga/1998/42#body-1'
    );
    expect(provisionOfficialUrl('https://www.legislation.gov.uk/ukpga/1998/42', 'section-6-1')).toBe(
      'https://www.legislation.gov.uk/ukpga/1998/42/section/6#section-6-1'
    );
  });

  it('uses the official ID to distinguish semantic provision types', () => {
    expect(provisionType('P1', 'regulation-2')).toBe('Regulation');
    expect(provisionType('P2', 'section-6-subsection-1')).toBe('Nested provision (P2)');
    expect(provisionType('P2', 'schedule-1-paragraph-3')).toBe('Nested provision (P2)');
  });
});
