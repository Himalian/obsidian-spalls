import { moment, TFile } from 'obsidian';
import { createDailyNote, getAllDailyNotes, getDailyNote, getDateFromFile } from 'obsidian-daily-notes-interface';
import type MemosPlugin from '../index';
import { parseMemos } from './memoParser';
import { insertMemoIntoContent, serializeMemo } from './memoSerializer';
import type { IDataSource } from './types';

export class DailyNoteDataSource implements IDataSource {
  private plugin: MemosPlugin; // Memos plugin instance

  constructor(plugin: MemosPlugin) {
    this.plugin = plugin;
  }

  private getOptions() {
    return {
      processEntriesBelow: this.plugin.settings.ProcessEntriesBelow || '',
    };
  }

  async getMemos(): Promise<{ memos: Model.Memo[] }> {
    const dailyNotes = getAllDailyNotes();
    const allMemos: Model.Memo[] = [];

    const options = this.getOptions();

    for (const notePath in dailyNotes) {
      const note = dailyNotes[notePath];
      const content = await this.plugin.app.vault.read(note);
      const date = getDateFromFile(note, 'day');
      if (!date) continue;

      const dateStr = date.format('YYYY-MM-DD');
      const memos = parseMemos(content, dateStr, options);

      memos.forEach((m) => {
        m.path = note.path;
        allMemos.push(m);
      });
    }

    return { memos: allMemos };
  }

  async createMemo(content: string, isTask: boolean, date?: any): Promise<Model.Memo> {
    const memoDate = date || moment();
    const dailyNotes = getAllDailyNotes();
    let note = getDailyNote(memoDate, dailyNotes);

    if (!note) {
      // Create if it doesn't exist
      note = await createDailyNote(memoDate);
    }

    const fileContent = await this.plugin.app.vault.read(note);

    const memo: Model.Memo = {
      id: memoDate.format('YYYYMMDDHHmmss'),
      content,
      createdAt: memoDate.format('YYYY/MM/DD HH:mm:ss'),
      updatedAt: memoDate.format('YYYY/MM/DD HH:mm:ss'),
      deletedAt: '',
      memoType: isTask ? 'TASK-TODO' : 'JOURNAL',
      path: note.path,
    };

    const memoMarkdown = serializeMemo(memo);
    const newContent = insertMemoIntoContent(fileContent, memoMarkdown, this.plugin.settings.InsertAfter);

    await this.plugin.app.vault.modify(note, newContent);

    return memo;
  }

  async updateMemo(memoId: string, content: string): Promise<Model.Memo> {
    const memos = await this.getMemos();
    const memo = memos.memos.find((m) => m.id === memoId);
    if (!memo) throw new Error('Memo not found');

    const file = this.plugin.app.vault.getAbstractFileByPath(memo.path);
    if (!(file instanceof TFile)) throw new Error('File not found');

    const fileContent = await this.plugin.app.vault.read(file);

    const oldMarkdown = serializeMemo(memo);
    memo.content = content;
    memo.updatedAt = moment().format('YYYY/MM/DD HH:mm:ss');
    const newMarkdown = serializeMemo(memo);

    const newFileContent = fileContent.replace(oldMarkdown, newMarkdown);
    await this.plugin.app.vault.modify(file, newFileContent);

    return memo;
  }

  async deleteMemo(memoId: string): Promise<boolean> {
    const memos = await this.getMemos();
    const memo = memos.memos.find((m) => m.id === memoId);
    if (!memo) return false;

    const file = this.plugin.app.vault.getAbstractFileByPath(memo.path);
    if (!(file instanceof TFile)) return false;

    const fileContent = await this.plugin.app.vault.read(file);
    const memoMarkdown = serializeMemo(memo);

    const newFileContent = fileContent.replace(memoMarkdown, '').replace(/\n\n\n/g, '\n\n');
    await this.plugin.app.vault.modify(file, newFileContent);

    return true;
  }
}
