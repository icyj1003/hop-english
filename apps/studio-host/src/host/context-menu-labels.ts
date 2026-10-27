import { ContextMenu } from '@/upstream/ui';

type ContextMenuItems = Parameters<ContextMenu['show']>[2];

/**
 * English labels for context menu items that rhwp-studio builds with hard-coded Korean text.
 * Items without an explicit label already use the translated command label, so only these need mapping.
 * Unknown labels are passed through unchanged.
 */
export const CONTEXT_MENU_LABELS: Readonly<Record<string, string>> = {
  '개체 묶기(G)': 'Group Objects(G)',
  '개체 속성(P)...': 'Object Properties(P)...',
  '개체 풀기(U)': 'Ungroup Objects(U)',
  '계산식(F)...': 'Formula(F)...',
  '글자 모양': 'Character Shape',
  '누름틀 고치기(E)...': 'Edit Field(E)...',
  '누름틀 지우기(J)': 'Delete Field(J)',
  '뒤로': 'Send Backward',
  '맨 뒤로': 'Send to Back',
  '맨 앞으로': 'Bring to Front',
  '문단 모양': 'Paragraph Shape',
  '문단 번호 모양(N)...': 'Paragraph Numbering(N)...',
  '셀 속성...': 'Cell Properties...',
  '셀 테두리/배경 - 각 셀마다 적용(E)...': 'Cell Border/Fill - Apply to Each Cell(E)...',
  '셀 테두리/배경 - 하나의 셀처럼 적용(Z)...': 'Cell Border/Fill - Apply as One Cell(Z)...',
  '앞으로': 'Bring Forward',
  '지우기(D)': 'Delete(D)',
  '차트 데이터 편집...': 'Edit Chart Data...',
  '캡션 넣기(A)': 'Insert Caption(A)',
  '표 나누기': 'Split Table',
  '표 붙이기': 'Merge Tables',
  '표 속성...': 'Table Properties...',
  '하이퍼링크 고치기...': 'Edit Hyperlink...',
  '하이퍼링크 지우기': 'Remove Hyperlink',
};

export function translateContextMenuItems(items: ContextMenuItems): ContextMenuItems {
  return items.map((item) => (
    item.label && CONTEXT_MENU_LABELS[item.label]
      ? { ...item, label: CONTEXT_MENU_LABELS[item.label] }
      : item
  ));
}

/** Upstream ContextMenu that shows English labels for the hard-coded Korean items above. */
export class EnglishContextMenu extends ContextMenu {
  override show(x: number, y: number, items: ContextMenuItems): void {
    super.show(x, y, translateContextMenuItems(items));
  }
}
