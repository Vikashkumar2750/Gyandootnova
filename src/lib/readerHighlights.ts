/**
 * Offset-based highlight persistence for the HTML chapter reader.
 *
 * Highlights are stored as (paragraph_index, start_offset, end_offset) where the
 * offsets are character positions inside the block element's plain text. This
 * lets us re-apply saved highlights on every visit, on top of sanitized HTML.
 */

export const BLOCK_SELECTOR = "p, li, blockquote, h1, h2, h3, h4, h5, h6";

export interface StoredHighlight {
  id: string;
  selected_text: string;
  paragraph_index: number;
  start_offset: number;
  end_offset: number;
  color: string;
}

export const getBlocks = (root: HTMLElement | null): HTMLElement[] => {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)).filter(
    (el) => (el.textContent ?? "").trim().length > 0
  );
};

const textNodesOf = (block: HTMLElement): Text[] => {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let n = walker.nextNode();
  while (n) {
    nodes.push(n as Text);
    n = walker.nextNode();
  }
  return nodes;
};

/** Absolute character offset of (node, offset) inside the block's text. */
const offsetInBlock = (block: HTMLElement, node: Node, offset: number): number => {
  let total = 0;
  for (const t of textNodesOf(block)) {
    if (t === node) return total + offset;
    total += t.data.length;
  }
  // Selection anchored on an element node — approximate with its text length.
  return total;
};

export interface SelectionCapture {
  text: string;
  paraIdx: number;
  start: number;
  end: number;
  rect: DOMRect;
}

/** Read the current window selection relative to the reader root. */
export const captureSelection = (root: HTMLElement | null): SelectionCapture | null => {
  const sel = window.getSelection();
  if (!root || !sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const text = sel.toString();
  if (!text.trim()) return null;

  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;

  const blocks = getBlocks(root);
  const paraIdx = blocks.findIndex((b) => b.contains(range.startContainer));
  if (paraIdx < 0) return null;

  const block = blocks[paraIdx];
  const start = offsetInBlock(block, range.startContainer, range.startOffset);
  const endNodeInBlock = block.contains(range.endContainer);
  const end = endNodeInBlock
    ? offsetInBlock(block, range.endContainer, range.endOffset)
    : start + text.length;

  if (end <= start) return null;
  return { text, paraIdx, start, end, rect: range.getBoundingClientRect() };
};

/** Remove every previously injected <mark data-hl-id>. */
export const clearHighlights = (root: HTMLElement | null) => {
  if (!root) return;
  root.querySelectorAll<HTMLElement>("mark[data-hl-id]").forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  });
};

const wrapRange = (
  block: HTMLElement,
  start: number,
  end: number,
  className: string,
  id: string
) => {
  const nodes = textNodesOf(block);
  let pos = 0;
  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;

  for (const t of nodes) {
    const len = t.data.length;
    if (!startNode && start < pos + len) {
      startNode = t;
      startOffset = start - pos;
    }
    if (!endNode && end <= pos + len) {
      endNode = t;
      endOffset = end - pos;
      break;
    }
    pos += len;
  }
  if (!startNode || !endNode) return;

  const range = document.createRange();
  try {
    range.setStart(startNode, Math.max(0, startOffset));
    range.setEnd(endNode, Math.max(0, endOffset));
  } catch {
    return;
  }
  if (range.collapsed) return;

  const mark = document.createElement("mark");
  mark.setAttribute("data-hl-id", id);
  mark.className = `${className} rounded px-0.5 cursor-pointer`;
  mark.title = "Click to remove highlight";
  try {
    range.surroundContents(mark);
  } catch {
    // Range crosses element boundaries — fall back to extracting the contents.
    try {
      mark.appendChild(range.extractContents());
      range.insertNode(mark);
    } catch {
      /* ignore un-wrappable range */
    }
  }
};

/**
 * Re-apply all saved highlights onto the rendered chapter HTML.
 * Falls back to a plain-text search when stored offsets no longer match
 * (e.g. the chapter content was edited after the highlight was made).
 */
export const applyHighlights = (
  root: HTMLElement | null,
  highlights: StoredHighlight[],
  colorClass: (color: string) => string
) => {
  if (!root) return;
  clearHighlights(root);
  const blocks = getBlocks(root);
  if (!blocks.length) return;

  // Later offsets first so earlier ones stay valid while the DOM mutates.
  const sorted = [...highlights].sort((a, b) => {
    if (a.paragraph_index !== b.paragraph_index) return b.paragraph_index - a.paragraph_index;
    return b.start_offset - a.start_offset;
  });

  for (const h of sorted) {
    let block = blocks[h.paragraph_index];
    let start = h.start_offset;
    let end = h.end_offset;

    const matchesStoredText =
      block && (block.textContent ?? "").slice(start, end) === h.selected_text;

    if (!matchesStoredText) {
      // Content shifted — locate the snippet anywhere in the chapter.
      const needle = h.selected_text.trim();
      const found = needle
        ? blocks.find((b) => (b.textContent ?? "").includes(needle))
        : undefined;
      if (!found) continue;
      block = found;
      start = (block.textContent ?? "").indexOf(needle);
      end = start + needle.length;
    }

    if (!block || start < 0 || end <= start) continue;
    wrapRange(block, start, end, colorClass(h.color), h.id);
  }
};
