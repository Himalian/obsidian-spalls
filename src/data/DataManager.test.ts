import { beforeEach, describe, expect, test } from 'vitest';
import { DataManager } from './DataManager';
import type { IDataSource } from './types';

// Mock DataSource
class MockDataSource implements IDataSource {
  private prefix: string;
  private memos: Model.Memo[];

  constructor(prefix: string, memos: Model.Memo[] = []) {
    this.prefix = prefix;
    this.memos = memos;
  }

  async getMemos(): Promise<{ memos: Model.Memo[] }> {
    return { memos: this.memos };
  }

  async createMemo(content: string, _isTask: boolean, _date?: any): Promise<Model.Memo> {
    const newMemo: Model.Memo = {
      id: `${this.prefix}-mock-id`,
      content: `${this.prefix}:${content}`,
      createdAt: '2023-01-01 00:00:00',
      updatedAt: '2023-01-01 00:00:00',
    };
    this.memos.push(newMemo);
    return newMemo;
  }

  async updateMemo(memoId: string, content: string): Promise<Model.Memo> {
    const memo = this.memos.find((m) => m.id === memoId);
    if (!memo) throw new Error('Not found');
    memo.content = `${this.prefix}:${content}`;
    memo.updatedAt = '2023-01-02 00:00:00';
    return memo;
  }

  async deleteMemo(memoId: string): Promise<boolean> {
    const idx = this.memos.findIndex((m) => m.id === memoId);
    if (idx < 0) return false;
    this.memos.splice(idx, 1);
    return true;
  }
}

describe('DataManager Multi-Source Tests', () => {
  let dataManager: DataManager;
  let dataSource1: MockDataSource;
  let dataSource2: MockDataSource;

  beforeEach(() => {
    // We instantiate a fresh DataManager instance, wait, DataManager is a singleton.
    // For testing, we might need a way to reset it.
    // Assuming getInstance() returns a singleton, but since we are refactoring, we can just reset it inside.
    dataManager = (DataManager as any).instance = new (DataManager as any)();
    // dataManager = DataManager.getInstance()
    dataSource1 = new MockDataSource('ds1', [
      { id: 'ds1-1', content: 'ds1 content', createdAt: '', updatedAt: '', deletedAt: '' },
    ]);
    dataSource2 = new MockDataSource('ds2', [
      { id: 'ds2-1', content: 'ds2 content', createdAt: '', updatedAt: '', deletedAt: '' },
    ]);

    dataManager.registerDataSource('ds1', dataSource1);
    dataManager.registerDataSource('ds2', dataSource2);
    dataManager.setDefaultDataSource('ds1');
  });

  test('should gather memos from all sources', async () => {
    const { memos } = await dataManager.getMemos();
    expect(memos).toHaveLength(2);
    expect(memos.find((m) => m.id === 'ds1-1')).toBeDefined();
    expect(memos.find((m) => m.id === 'ds2-1')).toBeDefined();
  });

  test('should create memo in specified source', async () => {
    const result = await dataManager.createMemo('hello', false, undefined, 'ds2');
    expect(result.id).toBe('ds2-mock-id');
    expect(result.content).toBe('ds2:hello');
  });

  test('should create memo in default source if none specified', async () => {
    const result = await dataManager.createMemo('hello', false);
    expect(result.id).toBe('ds1-mock-id');
    expect(result.content).toBe('ds1:hello');
  });

  test('should update memo in the correct source', async () => {
    const result = await dataManager.updateMemo('ds2-1', 'updated');
    expect(result.content).toBe('ds2:updated');

    // Check if correctly updated in ds2
    const { memos: ds2Memos } = await dataSource2.getMemos();
    expect(ds2Memos.find((m) => m.id === 'ds2-1')?.content).toBe('ds2:updated');

    // Ensure ds1 is untouched
    const { memos: ds1Memos } = await dataSource1.getMemos();
    expect(ds1Memos.find((m) => m.id === 'ds1-1')?.content).toBe('ds1 content');
  });

  test('should delete memo in the correct source', async () => {
    const res = await dataManager.deleteMemo('ds1-1');
    expect(res).toBe(true);

    const { memos: ds1Memos } = await dataSource1.getMemos();
    expect(ds1Memos).toHaveLength(0);

    const { memos: ds2Memos } = await dataSource2.getMemos();
    expect(ds2Memos).toHaveLength(1);
  });

  test('unregistering a source should remove it from getMemos', async () => {
    dataManager.unregisterDataSource('ds1');
    const { memos } = await dataManager.getMemos();
    expect(memos).toHaveLength(1);
    expect(memos[0].id).toBe('ds2-1');
  });
});
