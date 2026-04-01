/**
 * @file SingleFileSerializer.ts
 * @description Serializer for the SingleFile thino format.
 * This module handles converting Model.Memo objects back into callout Markdown strings
 * and provides utility functions for inserting and removing these blocks within a single file.
 */

/**
 * Serializes a `Model.Memo` into a thino callout block string.
 *
 * The `archived` flag is encoded in `memoType` as `"<type>-archived"` by the
 * parser; this function reverses that encoding when writing back to disk.
 *
 * Output format (single line for empty content, multiple lines otherwise):
 * ```markdown
 * > [!thino] 2026/03/09 17:10:59 %% [id::…] [thinoType::JOURNAL] %%
 * > First content line
 * > Second content line
 * ```
 */
export function serializeSingleFileMemo(memo: Model.Memo): string {
  // Decode the -archived suffix that the parser attaches
  const isArchived = memo.memoType?.endsWith('-archived') ?? false;
  const rawType = isArchived
    ? (memo.memoType ?? 'JOURNAL').slice(0, -'-archived'.length)
    : (memo.memoType ?? 'JOURNAL');

  // Build the metadata section
  const metaParts = [`[id::${memo.id}]`, `[thinoType::${rawType}]`];
  if (isArchived) metaParts.push('[archived::true]');

  const header = `> [!thino] ${memo.createdAt} %% ${metaParts.join(' ')} %%`;

  // Content: each line prefixed with "> "
  const trimmed = memo.content.trim();
  if (!trimmed) return header;

  const contentBlock = trimmed
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');

  return `${header}\n${contentBlock}`;
}

/**
 * Inserts `memoBlock` (the serialized callout string) into `fileContent` at
 * the **top** of the `# YYYY-MM-DD` section for `dateStr`.
 *
 * Rules:
 * - If the section already exists the new block is placed immediately after
 *   the heading line, before any other blocks.
 * - If the section does not exist a new `# dateStr` heading is prepended to
 *   the document (memos are ordered newest-first by date).
 * - If `fileContent` is empty the document is bootstrapped from scratch.
 */
export function insertMemoIntoSingleFile(fileContent: string, memoBlock: string, dateStr: string): string {
  const heading = `# ${dateStr}`;

  if (!fileContent.trim()) {
    // Bootstrap an empty document
    return `${heading}\n${memoBlock}`;
  }

  const lines = fileContent.split('\n');
  const headingIdx = lines.findIndex((l) => l.trim() === heading);

  if (headingIdx !== -1) {
    // Section exists – insert the new block right after the heading
    lines.splice(headingIdx + 1, 0, memoBlock, '');
    return lines.join('\n');
  }

  // Section does not exist – prepend a new section at the top of the document
  return `${heading}\n${memoBlock}\n\n${fileContent.trimStart()}`;
}

/**
 * Removes `memoBlock` from `fileContent` and cleans up the resulting extra
 * blank lines (collapses runs of 3+ newlines to 2).
 *
 * The function uses a verbatim string search so the `memoBlock` must exactly
 * match what was originally serialized by `serializeSingleFileMemo`.
 */
export function removeMemoFromSingleFile(fileContent: string, memoBlock: string): string {
  const cleaned = fileContent.replace(memoBlock, '').replace(/\n{3,}/g, '\n\n');

  return cleaned;
}
