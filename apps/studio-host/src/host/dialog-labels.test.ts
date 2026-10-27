import { describe, expect, it } from 'vitest';
import { DIALOG_LABELS, translateDialogLabel } from './dialog-labels';

describe('dialog labels', () => {
  it('translates exact known labels and keeps surrounding whitespace', () => {
    expect(translateDialogLabel('실선')).toBe('Solid');
    expect(translateDialogLabel('  세로  ')).toBe('  Portrait  ');
  });

  it('translates the description part of "NAME - description" options', () => {
    expect(translateDialogLabel('SUM - 합계')).toBe('SUM - Sum');
    expect(translateDialogLabel('LOG10 - 상용로그')).toBe('LOG10 - Common log');
  });

  it('leaves unknown text, font names, and partial matches alone', () => {
    expect(translateDialogLabel('함초롬바탕')).toBeNull();
    expect(translateDialogLabel('실선 두께')).toBeNull();
    expect(translateDialogLabel('Already English')).toBeNull();
    expect(translateDialogLabel('   ')).toBeNull();
  });

  it('has an English value for every mapped label', () => {
    for (const value of Object.values(DIALOG_LABELS)) {
      expect(value).not.toMatch(/[가-힣]/);
    }
  });
});
