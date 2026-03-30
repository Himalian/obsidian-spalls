export function serializeMemo(memo: Model.Memo): string {
  const createdAt = new Date(memo.createdAt);
  const timeStr = `${createdAt.getHours().toString().padStart(2, '0')}:${createdAt
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  const contentLines = memo.content.split('\n');
  const indentedContent = contentLines
    .map((line, index) => {
      if (index === 0) return line;
      return line.trim().length === 0 ? '' : `  ${line}`;
    })
    .join('\n');

  let formatted = `- ${timeStr} ${indentedContent}`;

  if (memo.memoType?.startsWith('TASK-')) {
    const taskChar = memo.memoType === 'TASK-TODO' ? ' ' : memo.memoType.slice(5);
    formatted = formatted.replace(/^-\s/, `- [${taskChar}] `);
  }

  return formatted;
}

export function insertMemoIntoContent(content: string, memoMarkdown: string, targetHeader: string): string {
  const lines = content.split('\n');
  let targetIndex = -1;

  if (targetHeader) {
    targetIndex = lines.findIndex((line) => line.trim() === targetHeader);
  }

  if (targetIndex === -1) {
    // If target header not found, append to end (or create header if specified)
    if (targetHeader) {
      return content.trim() + '\n\n' + targetHeader + '\n' + memoMarkdown;
    }
    return content.trim() + '\n' + memoMarkdown;
  }

  // Insert after the header line
  lines.splice(targetIndex + 1, 0, memoMarkdown);
  return lines.join('\n');
}
