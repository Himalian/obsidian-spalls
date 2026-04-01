import type { IDataExporter, IDataImporter, IDataSource } from './types';

export class DataManager {
  private static instance: DataManager;
  private dataSources: Map<string, IDataSource> = new Map();
  private defaultDataSourceId: string | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  /** @deprecated Use registerDataSource instead */
  public setDataSource(dataSource: IDataSource) {
    this.registerDataSource('default', dataSource);
    this.setDefaultDataSource('default');
  }

  /** @deprecated Use getDataSource(id) instead */
  public getDataSource(id?: string): IDataSource {
    const targetId = id || this.defaultDataSourceId;
    if (!targetId || !this.dataSources.has(targetId)) {
      throw new Error('Data Source is not initialized or not found.');
    }
    return this.dataSources.get(targetId)!;
  }

  public registerDataSource(id: string, dataSource: IDataSource) {
    this.dataSources.set(id, dataSource);
  }

  public unregisterDataSource(id: string) {
    this.dataSources.delete(id);
  }

  public setDefaultDataSource(id: string) {
    this.defaultDataSourceId = id;
  }

  public async getMemos() {
    const allMemos: Model.Memo[] = [];
    for (const dataSource of this.dataSources.values()) {
      try {
        const { memos } = await dataSource.getMemos();
        allMemos.push(...memos);
      } catch (e) {
        console.error('Failed to get memos from data source:', e);
      }
    }
    // Sort all memos by createdAt ascending or descending? Maybe not strictly required
    // here since memoServices handles additional sorting, but we can return the combined array.
    return { memos: allMemos };
  }

  public async createMemo(content: string, isTask: boolean, date?: any, sourceId?: string) {
    const dataSource = this.getDataSource(sourceId);
    return dataSource.createMemo(content, isTask, date);
  }

  public async updateMemo(memoId: string, content: string) {
    // We try to update the memo in all data sources.
    // The one that succeeds is the owner of the memo.
    for (const dataSource of this.dataSources.values()) {
      try {
        const result = await dataSource.updateMemo(memoId, content);
        if (result) return result;
      } catch (e) {
        // If it throws "not found" or similar, just continue to the next one
        continue;
      }
    }
    throw new Error(`Memo ${memoId} not found in any data source to update.`);
  }

  public async deleteMemo(memoId: string) {
    for (const dataSource of this.dataSources.values()) {
      try {
        const success = await dataSource.deleteMemo(memoId);
        if (success) return true;
      } catch (e) {
        // Ignore errors and try the next one
        continue;
      }
    }
    return false; // Not found in any
  }

  // ============================================
  // 导入与导出功能预留
  // ============================================

  public async exportData(exporter: IDataExporter) {
    return exporter.exportData();
  }

  public async importData(importer: IDataImporter, data: any) {
    return importer.importData(data);
  }
}

export const dataManager = DataManager.getInstance();
