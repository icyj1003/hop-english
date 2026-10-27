import { describe, expect, it } from 'vitest';
import { CONTEXT_MENU_LABELS, translateContextMenuItems } from './context-menu-labels';

describe('context menu labels', () => {
  it('translates hard-coded Korean labels and keeps other items unchanged', () => {
    const items = translateContextMenuItems([
      { type: 'command', commandId: 'edit:cut' },
      { type: 'separator' },
      { type: 'command', commandId: 'table:cell-props', label: '셀 속성...' },
      { type: 'command', commandId: 'custom', label: 'Already English' },
    ]);

    expect(items).toEqual([
      { type: 'command', commandId: 'edit:cut' },
      { type: 'separator' },
      { type: 'command', commandId: 'table:cell-props', label: 'Cell Properties...' },
      { type: 'command', commandId: 'custom', label: 'Already English' },
    ]);
  });

  it('has an English value for every mapped label', () => {
    for (const value of Object.values(CONTEXT_MENU_LABELS)) {
      expect(value).not.toMatch(/[가-힣]/);
    }
  });
});
