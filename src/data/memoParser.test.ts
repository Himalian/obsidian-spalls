import { describe, it, expect } from 'vitest';
import { parseMemos } from './memoParser';

describe('memoParser', () => {
  it('should parse a simple memo in the new standard format', () => {
    const content = '- 12:30 Hello World';
    const options = {
      processEntriesBelow: '',
    };
    const memos = parseMemos(content, '2023-10-27', options);
    expect(memos).toHaveLength(1);
    expect(memos[0].content).toBe('Hello World');
    expect(memos[0].createdAt).toBe('2023/10/27 12:30:00');
    expect(memos[0].memoType).toBe('JOURNAL');
  });

  it('should parse a task memo in the new standard format', () => {
    const content = '- [ ] 14:00 Buy milk';
    const options = {
      processEntriesBelow: '',
    };
    const memos = parseMemos(content, '2023-10-27', options);
    expect(memos).toHaveLength(1);
    expect(memos[0].content).toBe('Buy milk');
    expect(memos[0].memoType).toBe('TASK-TODO');
  });

  it('should parse a completed task memo in the new standard format', () => {
    const content = '- [x] 14:00 Buy milk';
    const options = {
      processEntriesBelow: '',
    };
    const memos = parseMemos(content, '2023-10-27', options);
    expect(memos).toHaveLength(1);
    expect(memos[0].content).toBe('Buy milk');
    expect(memos[0].memoType).toBe('TASK-x');
  });

  it('should only parse below a specific header if specified', () => {
    const content = `
# Random Header
- 10:00 Ignore me

# Journal
- 12:00 Parse me
    `.trim();
    const options = {
      processEntriesBelow: '# Journal',
    };
    const memos = parseMemos(content, '2023-10-27', options);
    expect(memos).toHaveLength(1);
    expect(memos[0].content).toBe('Parse me');
  });

  it('should parse multi-line memos with correct indentation', () => {
    const content = `
- 15:00 First line
  Second line
  Third line
- 16:00 Another memo
    `.trim();
    const options = {
      processEntriesBelow: '',
    };
    const memos = parseMemos(content, '2023-10-27', options);
    expect(memos).toHaveLength(2);
    expect(memos[0].content).toBe('First line\nSecond line\nThird line');
    expect(memos[1].content).toBe('Another memo');
  });

  it('should parse multi-line memos with tab indentation', () => {
    const content = '- 15:00 First line\n\tSecond line\n\tThird line';
    const options = {
      processEntriesBelow: '',
    };
    const memos = parseMemos(content, '2023-10-27', options);
    expect(memos).toHaveLength(1);
    expect(memos[0].content).toBe('First line\nSecond line\nThird line');
  });

  it('should ignore empty lines between memos', () => {
    const content = `
- 10:00 Memo 1

- 11:00 Memo 2
    `.trim();
    const options = {
      processEntriesBelow: '',
    };
    const memos = parseMemos(content, '2023-10-27', options);
    expect(memos).toHaveLength(2);
    expect(memos[0].content).toBe('Memo 1');
    expect(memos[1].content).toBe('Memo 2');
  });

  it('should gracefully ignore non-matching lines', () => {
    const content = `
Hello World
- [ ] 12:30 A correct memo
Just some random text
- 13:00 Another memo
    `.trim();
    const options = {
      processEntriesBelow: '',
    };
    const memos = parseMemos(content, '2023-10-27', options);
    expect(memos).toHaveLength(2);
    expect(memos[0].content).toBe('A correct memo');
    expect(memos[0].createdAt).toBe('2023/10/27 12:30:00');
    expect(memos[1].content).toBe('Another memo');
    expect(memos[1].createdAt).toBe('2023/10/27 13:00:00');
  });
});
