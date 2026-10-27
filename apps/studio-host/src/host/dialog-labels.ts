/**
 * English labels for rhwp-studio dialog text that is still hard-coded in Korean upstream
 * (not yet covered by the rhwp language pack).
 *
 * Only exact, display-only labels are listed. The code that builds these dialogs reads
 * values and indexes, never the label text, so replacing the text is safe.
 * Font names and document style names are intentionally absent: they are real names.
 */
export const DIALOG_LABELS: Readonly<Record<string, string>> = {
  // Formula dialog: function descriptions ("SUM - 합계")
  '합계': 'Sum',
  '평균': 'Average',
  '곱': 'Product',
  '최소값': 'Minimum',
  '최대값': 'Maximum',
  '개수': 'Count',
  '절대값': 'Absolute value',
  '제곱근': 'Square root',
  '반올림': 'Round',
  '올림': 'Round up',
  '내림': 'Round down',
  '절삭': 'Truncate',
  '나머지': 'Remainder',
  '조건': 'Condition',
  '정수': 'Integer',
  '부호': 'Sign',
  'e 거듭제곱': 'Power of e',
  '자연로그': 'Natural log',
  '상용로그': 'Common log',
  '사인': 'Sine',
  '코사인': 'Cosine',
  '탄젠트': 'Tangent',
  // Cell border/fill dialog: diagonal lines
  '단순 역대각선': 'Simple back diagonal',
  '아래쪽 분기 역대각선': 'Bottom-split back diagonal',
  '전체 분기 역대각선': 'Full-split back diagonal',
  '단순 대각선': 'Simple diagonal',
  '아래쪽 분기 대각선': 'Bottom-split diagonal',
  '전체 분기 대각선': 'Full-split diagonal',
  // Table/cell properties dialog
  '위쪽': 'Top',
  '가운데': 'Center',
  '아래쪽': 'Bottom',
  '가로쓰기': 'Horizontal',
  '세로쓰기': 'Vertical',
  '선형': 'Linear',
  '방사형': 'Radial',
  '원뿔형': 'Conical',
  '사각형': 'Square',
  // Page border dialog
  '왼쪽': 'Left',
  '오른쪽': 'Right',
  '모두': 'All',
  '무늬 없음': 'No pattern',
  '가로선': 'Horizontal lines',
  '세로선': 'Vertical lines',
  '대각선': 'Diagonal lines',
  '격자': 'Grid',
  '없음': 'None',
  '실선': 'Solid',
  '파선': 'Dashed',
  '점선': 'Dotted',
  '일점 쇄선': 'Dash-dot',
  '이점 쇄선': 'Dash-dot-dot',
  '긴 파선': 'Long dash',
  '이중선': 'Double',
  '물결선': 'Wavy',
  // Page setup dialog
  '세로': 'Portrait',
  '가로': 'Landscape',
  '한쪽': 'Single-sided',
  '맞쪽': 'Facing pages',
  '위로': 'Top binding',
  '머리말': 'Header',
  '꼬리말': 'Footer',
  '제본': 'Gutter',
  // Other dialogs
  '웹 글꼴': 'Web Fonts',
  '로컬 글꼴': 'Local Fonts',
  '글자처럼 취급': 'Treat as character',
  '글꼴 감지에 실패했습니다. 웹 대체 글꼴로 계속 사용할 수 있습니다.':
    'Font detection failed. You can keep using the web substitute fonts.',
};

/** Returns the English label for a known Korean label, or null when it is not a known label. */
export function translateDialogLabel(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const direct = DIALOG_LABELS[trimmed];
  if (direct) return text.replace(trimmed, direct);
  // "NAME - description" options, e.g. "SUM - 합계"
  const dash = trimmed.lastIndexOf(' - ');
  if (dash > 0) {
    const desc = DIALOG_LABELS[trimmed.slice(dash + 3)];
    if (desc) return text.replace(trimmed, `${trimmed.slice(0, dash)} - ${desc}`);
  }
  return null;
}

const ATTRIBUTES = ['title', 'aria-label', 'label'] as const;

function translateElement(element: Element): void {
  for (const name of ATTRIBUTES) {
    const value = element.getAttribute(name);
    const next = value ? translateDialogLabel(value) : null;
    if (next) element.setAttribute(name, next);
  }
}

function translateTextNode(node: Node): void {
  const next = node.nodeValue ? translateDialogLabel(node.nodeValue) : null;
  if (next) node.nodeValue = next;
}

/** Translates known labels in a subtree that was just added to the page. */
export function translateDialogTree(root: Node): void {
  if (root.nodeType === 3) {
    translateTextNode(root);
    return;
  }
  if (root.nodeType !== 1) return;
  const element = root as Element;
  // Never touch editable content or the document area.
  if (element.closest('textarea, input, [contenteditable="true"], #scroll-container')) return;
  translateElement(element);
  for (const child of element.querySelectorAll('*')) translateElement(child);
  const doc = element.ownerDocument;
  const walker = doc.createTreeWalker(element, 4 /* NodeFilter.SHOW_TEXT */);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) translateTextNode(node);
}

/** Watches for dialogs added to the page and swaps their known Korean labels for English. */
export function installDialogLabelTranslator(doc: Document): MutationObserver {
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) translateDialogTree(node);
    }
  });
  observer.observe(doc.body, { childList: true, subtree: true });
  return observer;
}
