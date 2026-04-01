/**
 * @file SingleFileSerializer.test.ts
 * @description Unit tests for the SingleFileSerializer.
 * Covers memo serialization to callout strings, document insertion, and memo removal.
 */

import { describe, expect, it } from 'vitest';
import { insertMemoIntoSingleFile, removeMemoFromSingleFile, serializeSingleFileMemo } from './SingleFileSerializer';

// ---------------------------------------------------------------------------
// serializeSingleFileMemo
// ---------------------------------------------------------------------------

describe('serializeSingleFileMemo', () => {
  it('should serialize a simple JOURNAL memo to callout format', () => {
    const memo: Model.Memo = {
      id: 'dcd3c4263f6b7dc3',
      content: 'Hello World',
      createdAt: '2026/03/09 17:10:59',
      updatedAt: '2026/03/09 17:10:59',
      deletedAt: '',
      memoType: 'JOURNAL',
      path: 'Thino/base.thino',
    };
    const result = serializeSingleFileMemo(memo);
    expect(result).toBe(
      '> [!thino] 2026/03/09 17:10:59 %% [id::dcd3c4263f6b7dc3] [thinoType::JOURNAL] %%\n> Hello World',
    );
  });

  it('should serialize a TASK-TODO memo', () => {
    const memo: Model.Memo = {
      id: 'abc1234567890def',
      content: '- [ ] Buy milk',
      createdAt: '2026/01/19 00:28:18',
      updatedAt: '2026/01/19 00:28:18',
      deletedAt: '',
      memoType: 'TASK-TODO',
      path: '',
    };
    const result = serializeSingleFileMemo(memo);
    expect(result).toContain('[thinoType::TASK-TODO]');
    expect(result).toContain('> - [ ] Buy milk');
  });

  it('should serialize a multi-line content memo', () => {
    const memo: Model.Memo = {
      id: '9c8b3b50d31ed95f',
      content: 'First line\nSecond line\nThird line',
      createdAt: '2026/01/18 19:59:35',
      updatedAt: '2026/01/18 19:59:35',
      deletedAt: '',
      memoType: 'JOURNAL',
      path: '',
    };
    const result = serializeSingleFileMemo(memo);
    expect(result).toBe(
      '> [!thino] 2026/01/18 19:59:35 %% [id::9c8b3b50d31ed95f] [thinoType::JOURNAL] %%\n' +
        '> First line\n' +
        '> Second line\n' +
        '> Third line',
    );
  });

  it('should serialize an archived memo with the archived flag', () => {
    const memo: Model.Memo = {
      id: 'b151389d7d18f017',
      content: 'Archived content',
      createdAt: '2026/02/28 23:41:02',
      updatedAt: '2026/02/28 23:41:02',
      deletedAt: '',
      memoType: 'JOURNAL-archived',
      path: '',
    };
    const result = serializeSingleFileMemo(memo);
    expect(result).toContain('[thinoType::JOURNAL]');
    expect(result).toContain('[archived::true]');
  });

  it('should produce an empty-content memo (no content lines) when content is empty', () => {
    const memo: Model.Memo = {
      id: 'abc1234567890abc',
      content: '',
      createdAt: '2026/03/09 17:10:59',
      updatedAt: '2026/03/09 17:10:59',
      deletedAt: '',
      memoType: 'JOURNAL',
      path: '',
    };
    const result = serializeSingleFileMemo(memo);
    // Only one line: the header
    expect(result.split('\n')).toHaveLength(1);
    expect(result).toMatch(/^> \[!thino\]/);
  });
});

// ---------------------------------------------------------------------------
// insertMemoIntoSingleFile
// ---------------------------------------------------------------------------

describe('insertMemoIntoSingleFile', () => {
  const memoBlock = '> [!thino] 2026/03/09 20:00:00 %% [id::new00000000001] [thinoType::JOURNAL] %%\n> Inserted memo';

  it('should insert a new memo at the top of an existing date section', () => {
    const existing = `# 2026-03-09
> [!thino] 2026/03/09 17:10:59 %% [id::dcd3c4263f6b7dc3] [thinoType::JOURNAL] %%
> Existing memo`;

    const result = insertMemoIntoSingleFile(existing, memoBlock, '2026-03-09');

    // New block should appear before the existing one
    const newIdx = result.indexOf('new00000000001');
    const oldIdx = result.indexOf('dcd3c4263f6b7dc3');
    expect(newIdx).toBeLessThan(oldIdx);
    // Section heading preserved
    expect(result).toContain('# 2026-03-09');
  });

  it('should create a new date section when the date does not exist', () => {
    const existing = `# 2026-03-06
> [!thino] 2026/03/06 23:57:36 %% [id::9c83799b82585d11] [thinoType::JOURNAL] %%
> Old memo`;

    const result = insertMemoIntoSingleFile(existing, memoBlock, '2026-03-09');

    // New section heading should be added
    expect(result).toContain('# 2026-03-09');
    // And the new block should be in it
    expect(result).toContain('new00000000001');
    // Old section still present
    expect(result).toContain('# 2026-03-06');
  });

  it('should handle insertion into an empty document', () => {
    const result = insertMemoIntoSingleFile('', memoBlock, '2026-03-09');
    expect(result).toContain('# 2026-03-09');
    expect(result).toContain('new00000000001');
  });
});

// ---------------------------------------------------------------------------
// removeMemoFromSingleFile
// ---------------------------------------------------------------------------

describe('removeMemoFromSingleFile', () => {
  it('should remove a memo block and clean up extra blank lines', () => {
    const memoBlock = '> [!thino] 2026/03/09 17:10:59 %% [id::dcd3c4263f6b7dc3] [thinoType::JOURNAL] %%\n> Hello World';

    const doc = `# 2026-03-09
${memoBlock}

> [!thino] 2026/03/09 19:32:02 %% [id::07fab90dfd7fb73c] [thinoType::JOURNAL] %%
> Second memo`;

    const result = removeMemoFromSingleFile(doc, memoBlock);

    expect(result).not.toContain('dcd3c4263f6b7dc3');
    expect(result).toContain('07fab90dfd7fb73c');
    // Should not have triple (or more) blank lines
    expect(result).not.toMatch(/\n{3,}/);
  });
});
