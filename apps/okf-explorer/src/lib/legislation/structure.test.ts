import { describe, expect, it } from 'vitest';
import { officialDocumentUrl, provisionOfficialUrl, provisionPathFromId, provisionType } from './structure';

describe('legislation provision normalisation', () => {
  it('normalises nested official IDs into passage paths', () => {
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

  it('puts dated versions after the selected provision and keeps enacted or made versions', () => {
    expect(provisionOfficialUrl('https://www.legislation.gov.uk/ukpga/1992/4/2026-04-29', 'section-70')).toBe('https://www.legislation.gov.uk/ukpga/1992/4/section/70/2026-04-29');
    expect(provisionOfficialUrl('https://www.legislation.gov.uk/ukpga/1992/4/enacted', 'section-70-subsection-1')).toBe('https://www.legislation.gov.uk/ukpga/1992/4/section/70/enacted#section-70-subsection-1');
    expect(provisionOfficialUrl('https://www.legislation.gov.uk/uksi/2020/1/made', 'regulation-2')).toBe('https://www.legislation.gov.uk/uksi/2020/1/regulation/2/made');
    expect(provisionOfficialUrl('https://www.legislation.gov.uk/ukpga/1992/4/section/70/2026-04-29', 'section-70')).toBe('https://www.legislation.gov.uk/ukpga/1992/4/section/70/2026-04-29');
  });

  it('rejects hostile official links before display', () => {
    expect(officialDocumentUrl('javascript:alert(1)')).toBe('');
    expect(officialDocumentUrl('https://www.legislation.gov.uk.evil.test/ukpga/1992/4')).toBe('');
    expect(officialDocumentUrl('https://user@www.legislation.gov.uk/ukpga/1992/4')).toBe('');
    expect(provisionOfficialUrl('javascript:alert(1)', 'section-70')).toBe('');
  });

  it('uses the official ID to distinguish semantic provision types', () => {
    expect(provisionType('P1', 'regulation-2')).toBe('Regulation');
    expect(provisionType('P2', 'section-6-subsection-1')).toBe('Nested provision (P2)');
    expect(provisionType('P2', 'schedule-1-paragraph-3')).toBe('Nested provision (P2)');
  });
});
