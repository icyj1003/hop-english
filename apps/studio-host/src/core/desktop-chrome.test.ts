import { describe, expect, it } from 'vitest';
import { normalizeDesktopChromeTitle } from './desktop-chrome';
import { normalizeShortcutLabel } from './platform';

describe('desktop-chrome', () => {
  it('normalizes macOS shortcut labels', () => {
    expect(normalizeShortcutLabel('Ctrl+Shift+S', 'macos')).toBe('⌘⇧S');
    expect(normalizeDesktopChromeTitle('Find (Ctrl+F)', 'macos')).toBe('Find (⌘F)');
  });

  it('does not rewrite non-shortcut tooltips', () => {
    expect(normalizeDesktopChromeTitle('Increase line spacing (+5%)', 'macos')).toBe('Increase line spacing (+5%)');
    expect(normalizeDesktopChromeTitle('File Name + Page Number', 'macos')).toBe('File Name + Page Number');
  });
});
