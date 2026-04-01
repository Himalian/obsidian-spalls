/**
 * @file SingleFileParser.test.ts
 * @description Unit tests for the SingleFileParser.
 * Covers basic parsing, metadata extraction, multi-line content, and edge cases.
 */

import { describe, expect, it } from 'vitest';
import { parseSingleFile } from './SingleFileParser';

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

/** A minimal single-memo document. */
const SIMPLE_DOC = `# 2026-03-09
> [!thino] 2026/03/09 17:10:59 %% [id::dcd3c4263f6b7dc3] [thinoType::JOURNAL] %%
> Hello World`;

/** A memo whose callout line has an archived flag. */
const ARCHIVED_DOC = `# 2026-02-28
> [!thino] 2026/02/28 23:41:02 %% [id::b151389d7d18f017] [thinoType::JOURNAL] [archived::true] %%
> Archived content`;

/** A memo with an optional webId field. */
const WEBID_DOC = `# 2026-01-08
> [!thino] 2026/01/08 11:27:21 %% [id::f3ad5d16b56b432e] [thinoType::JOURNAL] [webId::3444186464559042593] %%
> 心肌的异长自身调节`;

/** Multi-line content inside a single callout. */
const MULTILINE_LINES_MEMO = `# 2026-01-18
> [!thino] 2026/01/18 19:59:35 %% [id::9c8b3b50d31ed95f] [thinoType::JOURNAL] %%
> First line
> Second line
> Third line`;

/** Content containing a fenced code block (lines still prefixed with "> "). */
const CODEBLOCK_DOC = `# 2026-03-09
> [!thino] 2026/03/09 17:10:59 %% [id::dcd3c4263f6b7dc3] [thinoType::JOURNAL] %%
> Description text
> \`\`\`sh
> echo hello
> \`\`\`
> After the code block`;

/** Content with an Obsidian internal image link. */
const IMAGE_DOC = `# 2026-01-08
> [!thino] 2026/01/08 11:57:58 %% [id::2a3d86505cdaa266] [thinoType::JOURNAL] [webId::3444194166148435977] %%
> ![[Pasted image 20260108115757.png]]`;

/** Two memos under the same date section, separated by a blank line. */
const TWO_MEMOS_ONE_DATE = `# 2026-03-09
> [!thino] 2026/03/09 17:10:59 %% [id::dcd3c4263f6b7dc3] [thinoType::JOURNAL] %%
> First memo

> [!thino] 2026/03/09 19:32:02 %% [id::07fab90dfd7fb73c] [thinoType::JOURNAL] %%
> Second memo`;

/** Two date sections, each with one memo. */
const TWO_DATE_SECTIONS = `# 2026-03-09
> [!thino] 2026/03/09 17:10:59 %% [id::dcd3c4263f6b7dc3] [thinoType::JOURNAL] %%
> March ninth

# 2026-03-06
> [!thino] 2026/03/06 23:57:36 %% [id::9c83799b82585d11] [thinoType::JOURNAL] %%
> March sixth`;

/** A document with extra blank lines between sections (tolerance test). */
const EXTRA_BLANK_LINES = `# 2026-03-09
> [!thino] 2026/03/09 17:10:59 %% [id::dcd3c4263f6b7dc3] [thinoType::JOURNAL] %%
> First


# 2026-03-06
> [!thino] 2026/03/06 23:57:36 %% [id::9c83799b82585d11] [thinoType::JOURNAL] %%
> Second`;

/** A memo whose content begins with a nested Markdown blockquote. */
const NESTED_QUOTE_DOC = `# 2026-02-17
> [!thino] 2026/02/17 22:04:34 %% [id::35364c15fd8806a5] [thinoType::JOURNAL] %%
> > A database is a large, organized collection of data`;

/** A hashtag inside the content body. */
const HASHTAG_DOC = `# 2026-03-06
> [!thino] 2026/03/06 23:57:50 %% [id::acb30efc10719992] [thinoType::JOURNAL] %%
> Something interesting
> #发癫语录`;

/** A TASK-TODO typed memo. */
const TASK_TODO_DOC = `# 2026-01-19
> [!thino] 2026/01/19 00:28:18 %% [id::20db62ff3e04c1db] [thinoType::TASK-TODO] %%
> - [ ] Edit archwiki`;

/** A document ending with multiple empty lines. */
const TRAILING_EMPTY_LINES = `# 2026-03-09
> [!thino] 2026/03/09 17:10:59 %% [id::dcd3c4263f6b7dc3] [thinoType::JOURNAL] %%
> First memo

`;

/** A document with an empty date heading. */
const EMPTY_DATE_HEADING = `# 2026-03-10

# 2026-03-09
> [!thino] 2026/03/09 17:10:59 %% [id::dcd3c4263f6b7dc3] [thinoType::JOURNAL] %%
> First memo

# 2026-03-08
`;

/** A document with a garbage line between sections. */

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parseSingleFile', () => {
  // ── Basic field mapping ──────────────────────────────────────────────────

  it('should parse a simple JOURNAL memo', () => {
    const memos = parseSingleFile(SIMPLE_DOC);
    expect(memos).toHaveLength(1);
    const m = memos[0];
    expect(m.id).toBe('dcd3c4263f6b7dc3');
    expect(m.memoType).toBe('JOURNAL');
    expect(m.createdAt).toBe('2026/03/09 17:10:59');
    expect(m.content).toBe('Hello World');
    expect(m.deletedAt).toBe('');
  });

  it('should preserve the archived flag in memoType', () => {
    const memos = parseSingleFile(ARCHIVED_DOC);
    expect(memos).toHaveLength(1);
    // archived memos are surfaced so consumers can decide what to do
    expect(memos[0].id).toBe('b151389d7d18f017');
    expect(memos[0].memoType).toBe('JOURNAL-archived');
  });

  it('should parse a memo with an optional webId field (ignored in model)', () => {
    const memos = parseSingleFile(WEBID_DOC);
    expect(memos).toHaveLength(1);
    expect(memos[0].id).toBe('f3ad5d16b56b432e');
    expect(memos[0].content).toBe('心肌的异长自身调节');
  });

  it('should parse a TASK-TODO type memo', () => {
    const memos = parseSingleFile(TASK_TODO_DOC);
    expect(memos).toHaveLength(1);
    expect(memos[0].memoType).toBe('TASK-TODO');
    expect(memos[0].content).toBe('- [ ] Edit archwiki');
  });

  // ── Content parsing ──────────────────────────────────────────────────────

  it('should join multi-line callout content with newlines', () => {
    const memos = parseSingleFile(MULTILINE_LINES_MEMO);
    expect(memos).toHaveLength(1);
    expect(memos[0].content).toBe('First line\nSecond line\nThird line');
  });

  it('should preserve fenced code block content with correct indentation', () => {
    const memos = parseSingleFile(CODEBLOCK_DOC);
    expect(memos).toHaveLength(1);
    expect(memos[0].content).toBe('Description text\n```sh\necho hello\n```\nAfter the code block');
  });

  it('should parse Obsidian internal image links in content', () => {
    const memos = parseSingleFile(IMAGE_DOC);
    expect(memos).toHaveLength(1);
    expect(memos[0].content).toBe('![[Pasted image 20260108115757.png]]');
  });

  it('should handle nested Markdown blockquotes inside content', () => {
    const memos = parseSingleFile(NESTED_QUOTE_DOC);
    expect(memos).toHaveLength(1);
    // The outer "> " is stripped; inner "> " is preserved as content
    expect(memos[0].content).toBe('> A database is a large, organized collection of data');
  });

  it('should parse a hashtag that appears on its own content line', () => {
    const memos = parseSingleFile(HASHTAG_DOC);
    expect(memos).toHaveLength(1);
    expect(memos[0].content).toBe('Something interesting\n#发癫语录');
  });

  // ── Multi-memo / multi-section ───────────────────────────────────────────

  it('should parse two memos under the same date section', () => {
    const memos = parseSingleFile(TWO_MEMOS_ONE_DATE);
    expect(memos).toHaveLength(2);
    expect(memos[0].id).toBe('dcd3c4263f6b7dc3');
    expect(memos[0].content).toBe('First memo');
    expect(memos[1].id).toBe('07fab90dfd7fb73c');
    expect(memos[1].content).toBe('Second memo');
  });

  it('should parse memos from two different date sections', () => {
    const memos = parseSingleFile(TWO_DATE_SECTIONS);
    expect(memos).toHaveLength(2);
    expect(memos[0].content).toBe('March ninth');
    expect(memos[1].content).toBe('March sixth');
  });

  it('should tolerate extra blank lines between sections', () => {
    const memos = parseSingleFile(EXTRA_BLANK_LINES);
    expect(memos).toHaveLength(2);
    expect(memos[0].content).toBe('First');
    expect(memos[1].content).toBe('Second');
  });

  it('should tolerate trailing empty lines', () => {
    const memos = parseSingleFile(TRAILING_EMPTY_LINES);
    expect(memos).toHaveLength(1);
    expect(memos[0].content).toBe('First memo');
  });

  it('should tolerate empty date headings', () => {
    const memos = parseSingleFile(EMPTY_DATE_HEADING);
    expect(memos).toHaveLength(1);
    expect(memos[0].content).toBe('First memo');
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  it('should return an empty array for an empty document', () => {
    expect(parseSingleFile('')).toEqual([]);
    expect(parseSingleFile('\n\n')).toEqual([]);
  });

  it('should return an empty array for a document with no thino callouts', () => {
    expect(parseSingleFile('# 2026-03-09\nSome random text')).toEqual([]);
  });

  it('should parse a memo with empty content (no content lines after header)', () => {
    const doc = `# 2026-03-09\n> [!thino] 2026/03/09 17:10:59 %% [id::abc1234567890abc] [thinoType::JOURNAL] %%`;
    const memos = parseSingleFile(doc);
    expect(memos).toHaveLength(1);
    expect(memos[0].content).toBe('');
  });

  it('should set updatedAt equal to createdAt', () => {
    const memos = parseSingleFile(SIMPLE_DOC);
    expect(memos[0].updatedAt).toBe(memos[0].createdAt);
  });

  it('should set path to empty string (filled in by data source)', () => {
    const memos = parseSingleFile(SIMPLE_DOC);
    expect(memos[0].path).toBe('');
  });
});
