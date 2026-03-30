import type { IDataExporter, IDataImporter, IDataSource } from './types';

export class DataManager {
  private static instance: DataManager;
  private currentDataSource: IDataSource | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  public setDataSource(dataSource: IDataSource) {
    this.currentDataSource = dataSource;
  }

  public getDataSource(): IDataSource {
    if (!this.currentDataSource) {
      throw new Error('Data Source is not initialized.');
    }
    return this.currentDataSource;
  }

  // ============================================
  // 数据源 Facade 接口
  // ============================================

  public async getMemos() {
    return this.getDataSource().getMemos();
  }

  public async createMemo(content: string, isTask: boolean, date?: any) {
    return this.getDataSource().createMemo(content, isTask, date);
  }

  public async updateMemo(memoId: string, content: string) {
    return this.getDataSource().updateMemo(memoId, content);
  }

  public async deleteMemo(memoId: string) {
    return this.getDataSource().deleteMemo(memoId);
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
