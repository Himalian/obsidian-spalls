export interface ParserOptions {
  processEntriesBelow: string;
}

export function parseMemos(content: string, dateStr: string, options: ParserOptions): Model.Memo[] {
  const lines = content.split('\n');
  const memos: Model.Memo[] = [];
  let isParsingSection = options.processEntriesBelow === '';

  // Strict regex for the new unified format:
  // - 21:57 content
  // - [ ] 21:57 content
  // - [x] 21:57 content
  // Supports both '-' and '*' as bullets just to be safe with standard markdown lists
  const finalPattern = '^\\s*[-*]\\s+(?:\\[(?<task>.)\\]\\s+)?(?<time>\\d{1,2}:\\d{2})\\s+(?<content>.*)$';
  const memoRegex = new RegExp(finalPattern);

  let currentMemo: Model.Memo | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (options.processEntriesBelow && line.trim() === options.processEntriesBelow) {
      isParsingSection = true;
      continue;
    }

    if (!isParsingSection) {
      continue;
    }

    const match = line.match(memoRegex);
    if (match) {
      const groups = match.groups || {};
      const time = groups.time || '00:00';
      const memoContent = groups.content || '';
      const taskTypeChar = groups.task;

      const createdAt = `${dateStr.replace(/-/g, '/')} ${time.length === 4 ? '0' + time : time}:00`;

      currentMemo = {
        id: `${dateStr.replace(/-/g, '')}${time.replace(':', '')}${i}`,
        content: memoContent.trim(),
        createdAt: createdAt,
        updatedAt: createdAt,
        deletedAt: '',
        memoType: taskTypeChar === ' ' ? 'TASK-TODO' : taskTypeChar ? `TASK-${taskTypeChar}` : 'JOURNAL',
      };
      memos.push(currentMemo);
    } else if (currentMemo && (line.startsWith('  ') || line.startsWith('\t'))) {
      // Handle multi-line content indentation
      currentMemo.content += '\n' + line.replace(/^(?: {2}|\t)/, '');
    } else if (currentMemo && line.trim() === '') {
      currentMemo.content += '\n';
    } else {
      currentMemo = null;
    }
  }

  memos.forEach((m) => (m.content = m.content.trim()));

  return memos;
}
