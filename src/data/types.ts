import { TFile } from 'obsidian';

export interface IDataSource {
  /**
   * 获取所有 Memos 及评论
   */
  getMemos(): Promise<{ memos: Model.Memo[]; commentMemos: Model.Memo[] }>;

  /**
   * 创建 Memo
   */
  createMemo(content: string, isTask: boolean, date?: any): Promise<Model.Memo>;

  /**
   * 更新 Memo
   */
  updateMemo(memoId: string, content: string): Promise<Model.Memo>;

  /**
   * 删除 Memo
   */
  deleteMemo(memoId: string): Promise<boolean>;

  /**
   * 当文件被修改时触发（用于缓存和增量更新）
   */
  onFileModified?(file: TFile): Promise<void>;
}

export interface IDataImporter {
  importData(data: any): Promise<boolean>;
}

export interface IDataExporter {
  exportData(): Promise<any>;
}
