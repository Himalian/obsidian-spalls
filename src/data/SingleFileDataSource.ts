import { moment, TFile } from 'obsidian';
import type MemosPlugin from '../index';
import { parseSingleFile } from './SingleFileParser';
import { insertMemoIntoSingleFile, removeMemoFromSingleFile, serializeSingleFileMemo } from './SingleFileSerializer';
import type { IDataSource } from './types';
import type { Vault } from 'obsidian';

/**
 * @description
 * Default vault-relative path for the single-file thino store.
 * Can be overridden via `plugin.settings.SingleFilePath`.
 */
const DEFAULT_SINGLE_FILE_PATH = 'Thino/base.thino.md';

/**
 * @description
 * A data source that stores all memos in a single Markdown file using the
 * thino callout format (`> [!thino] … %% meta %%`).
 *
 * File layout:
 * ```markdown
 * # YYYY-MM-DD
 * > [!thino] YYYY/MM/DD HH:mm:ss %% [id::…] [thinoType::JOURNAL] %%
 * > Content line
 * ```
 *
 * New memos are inserted at the **top** of their date section (newest first).
 * The target file is read from `plugin.settings.SingleFilePath` with a
 * fallback of `Thino/base.thino`.
 */
export class SingleFileDataSource implements IDataSource {
  private plugin: MemosPlugin;
  private vault: Vault;

  constructor(plugin: MemosPlugin) {
    this.plugin = plugin;
    this.vault = plugin.app.vault;
  }

  /**
   * @description Get vault-relative path to the single thino file.
   * @returns string */

  private get filePath(): string {
    return this.plugin.settings.SingleFilePath?.trim() || DEFAULT_SINGLE_FILE_PATH;
  }

  /**
   * @description Reads the target file from the vault.
   * @returns the raw content string, or an empty string if the file doesn't
   * exist yet (it will be created on the first write).
   * @example
   *
   */
  private async readFile(): Promise<{ content: string; file: TFile | null }> {
    const abstractFile = this.plugin.app.vault.getAbstractFileByPath(this.filePath);

    if (abstractFile instanceof TFile) {
      const content = await this.plugin.app.vault.read(abstractFile);
      return { content, file: abstractFile };
    }

    // File doesn't exist yet
    return { content: '', file: null };
  }

  /**
   * Writes `content` to the target file, creating the file (and any missing
   * parent folders) if it doesn't exist.
   */
  private async writeFile(content: string, existingFile: TFile | null): Promise<TFile> {
    if (existingFile) {
      await this.plugin.app.vault.modify(existingFile, content);
      return existingFile;
    }

    // Ensure parent directories exist
    const pathParts = this.filePath.split('/');
    if (pathParts.length > 1) {
      const dir = pathParts.slice(0, -1).join('/');
      if (!this.plugin.app.vault.getAbstractFileByPath(dir)) {
        await this.plugin.app.vault.createFolder(dir);
      }
    }

    return this.plugin.app.vault.create(this.filePath, content);
  }

  // ── IDataSource implementation ────────────────────────────────────────────

  async getMemos(): Promise<{ memos: Model.Memo[] }> {
    const { content, file } = await this.readFile();
    const memos = parseSingleFile(content);

    // Annotate each memo with the actual file path
    if (file) {
      memos.forEach((m) => (m.path = file.path));
    }

    return { memos };
  }

  async createMemo(content: string, isTask: boolean, date?: string): Promise<Model.Memo> {
    const memoDate = date ? moment(date) : moment();

    const memo: Model.Memo = {
      // Generate a 16-char hex ID similar to the native thino format
      id: Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
      content,
      createdAt: memoDate.format('YYYY/MM/DD HH:mm:ss'),
      updatedAt: memoDate.format('YYYY/MM/DD HH:mm:ss'),
      deletedAt: '',
      memoType: isTask ? 'TASK-TODO' : 'JOURNAL',
    };

    const { content: fileContent, file } = await this.readFile();
    const dateStr = memoDate.format('YYYY-MM-DD');
    const memoMarkdown = serializeSingleFileMemo(memo);
    const newContent = insertMemoIntoSingleFile(fileContent, memoMarkdown, dateStr);

    const savedFile = await this.writeFile(newContent, file);
    memo.path = savedFile.path;

    return memo;
  }

  async updateMemo(memoId: string, content: string): Promise<Model.Memo> {
    const { memos } = await this.getMemos();
    const memo = memos.find((m) => m.id === memoId);
    if (!memo) throw new Error(`SingleFileDataSource: memo "${memoId}" not found`);

    const { content: fileContent, file } = await this.readFile();
    const oldMarkdown = serializeSingleFileMemo(memo);

    memo.content = content;
    memo.updatedAt = moment().format('YYYY/MM/DD HH:mm:ss');
    const newMarkdown = serializeSingleFileMemo(memo);

    const newFileContent = fileContent.replace(oldMarkdown, newMarkdown);
    if (!file) throw new Error('SingleFileDataSource: file disappeared during update');

    await this.plugin.app.vault.modify(file, newFileContent);
    return memo;
  }

  async deleteMemo(memoId: string): Promise<boolean> {
    const { memos } = await this.getMemos();
    const memo = memos.find((m) => m.id === memoId);
    if (!memo) return false;

    const { content: fileContent, file } = await this.readFile();
    if (!file) return false;

    const memoMarkdown = serializeSingleFileMemo(memo);
    const newFileContent = removeMemoFromSingleFile(fileContent, memoMarkdown);

    await this.plugin.app.vault.modify(file, newFileContent);
    return true;
  }

  /**
   * Called by the plugin when the vault file is modified externally (e.g. by
   * direct editing).  We don't cache anything, so there's nothing to
   * invalidate – but the hook is here for future optimisation.
   */
  async onFileModified(file: TFile): Promise<void> {
    if (file.path !== this.filePath) return;
    // No-op: getMemos() always reads fresh from disk
  }
}
