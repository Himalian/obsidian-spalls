import { describe, it, expect } from 'vitest';
import { serializeMemo, insertMemoIntoContent } from './memoSerializer';

describe('memoSerializer', () => {
  it('should serialize a memo to standard markdown list format', () => {
    const memo = {
      content: 'Hello World',
      createdAt: '2023/10/27 12:30:00',
      memoType: 'JOURNAL',
    } as Model.Memo;
    const result = serializeMemo(memo);
    expect(result).toBe('- 12:30 Hello World');
  });

  it('should serialize a task memo to standard format', () => {
    const memo = {
      content: 'Buy milk',
      createdAt: '2023/10/27 14:00:00',
      memoType: 'TASK-TODO',
    } as Model.Memo;
    const result = serializeMemo(memo);
    expect(result).toBe('- [ ] 14:00 Buy milk');
  });

  it('should serialize a completed task memo to standard format', () => {
    const memo = {
      content: 'Buy milk',
      createdAt: '2023/10/27 14:00:00',
      memoType: 'TASK-x',
    } as Model.Memo;
    const result = serializeMemo(memo);
    expect(result).toBe('- [x] 14:00 Buy milk');
  });

  it('should correctly indent multi-line content', () => {
    const memo = {
      content: 'Line 1\nLine 2\nLine 3',
      createdAt: '2023/10/27 15:00:00',
      memoType: 'JOURNAL',
    } as Model.Memo;
    const result = serializeMemo(memo);
    expect(result).toBe('- 15:00 Line 1\n  Line 2\n  Line 3');
  });

  it('should not indent empty lines in multi-line content', () => {
    const memo = {
      content: 'Line 1\n\nLine 3',
      createdAt: '2023/10/27 15:00:00',
      memoType: 'JOURNAL',
    } as Model.Memo;
    const result = serializeMemo(memo);
    expect(result).toBe('- 15:00 Line 1\n\n  Line 3');
  });

  it('should insert a memo into content after a specific header', () => {
    const content = `
# Random Header
Some content

# Journal
- 10:00 Old memo
    `.trim();
    const memoStr = '- 12:00 New memo';
    const targetHeader = '# Journal';

    const result = insertMemoIntoContent(content, memoStr, targetHeader);
    expect(result).toContain('# Journal\n- 12:00 New memo\n- 10:00 Old memo');
  });

  it('should create a header if it does not exist and then insert', () => {
    const content = '# Random Header\nSome content';
    const memoStr = '- 12:00 New memo';
    const targetHeader = '# Journal';

    const result = insertMemoIntoContent(content, memoStr, targetHeader);
    expect(result).toContain('# Journal\n- 12:00 New memo');
  });
});
