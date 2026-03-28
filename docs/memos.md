# Thino Memo 读取与保存技术细节分析

本文档详细记录了 Thino (Obsidian Memos) 插件在处理数据时的核心函数调用链及逻辑。

## 1. 数据读取流程 (Reading Process)

Thino 的数据加载由 `src/obComponents/obGetMemos.ts` 驱动。

### 关键函数分析：
1.  **`getMemos()`**: 
    - 顶级入口函数。
    - 调用 `getDailyNotePath()` 获取日记存放路径。
    - 遍历 `getAllDailyNotes()` 返回的所有文件，对每个文件调用 `getMemosFromDailyNote()`。
2.  **`getRemainingMemos(note: TFile)`**: 
    - 性能预检函数。
    - 使用基于 `DefaultMemoComposition` 构造的简化正则快速扫描文件内容。
3.  **`getMemosFromDailyNote(dailyNote, allMemos, ...)`**: 
    - 核心解析循环。
    - 逐行读取文件，维护 `processHeaderFound` 状态。
    - 依赖 `lineContainsParseBelowToken()` 判断是否进入了用户指定的解析区域。
4.  **`lineContainsTime(line: string)`**: 
    - **核心匹配逻辑**。
    - 动态构造正则表达式，验证当前行是否为有效记录。
5.  **`extractTextFromTodoLine(line: string)`**: 
    - 使用正则表达式的捕获组（通常是 `index [8]`）提取 Memo 的正文内容。
6.  **`extractHourFromBulletLine()` / `extractMinFromBulletLine()`**: 
    - 分别提取小时和分钟，用于构造 Memo 的 `createdAt` 时间戳。

---

## 2. 数据保存流程 (Saving Process)

写入逻辑主要位于 `src/obComponents/obCreateMemo.ts`。

### 关键函数分析：
1.  **`waitForInsert(MemoContent, isTASK, ...)`**: 
    - 写入操作的入口。
    - 负责将 `DefaultMemoComposition` 中的 `{TIME}` 和 `{CONTENT}` 替换为实际值。
    - 调用 `utils.createDailyNoteCheck()` 确保目标日记文件存在。
2.  **`insertAfterHandler(targetString, formatted, fileContent)`**: 
    - 确定插入位置的关键算法。
    - 增加了 `^` 和 `$` 锚点，确保精确匹配用户在设置中定义的 `InsertAfter` 标题（如 `# Journal`）。
3.  **`insertTextAfterPositionInBody(text, body, pos, ...)`**: 
    - 执行最终的字符串拼接，将新格式化的 Memo 插入到文件内容的指定行。
4.  **`vault.modify(file, newContent)`**: 
    - 调用 Obsidian 内置 API 完成物理磁盘写入。

---

## 3. 状态同步与 UI 刷新

### 关键函数分析：
1.  **`memoService.pushMemo(memo)`**: 
    - 位于 `src/services/memoService.ts`。
    - 写入文件前/后立即更新 Redux Store (`appStore.dispatch`)，实现**乐观 UI**，让用户感觉到瞬间保存。
2.  **`Memos.onFileModified(file: TFile)`**: 
    - 位于 `src/memos.ts`。
    - 使用 `debounce` 机制（默认 2000ms）监听文件变动。
    - 当检测到文件被修改且不是由插件自身引起（或达到同步周期）时，调用 `memoService.fetchAllMemos()`。
3.  **`memoService.fetchAllMemos()`**: 
    - 重新触发全量扫描。
    - **逻辑风险点**：如果 `lineContainsTime()` 因为正则转义问题匹配失败，此处返回的列表将为空，导致乐观 UI 插入的内容在 2 秒后消失。本次修复已通过增强 `lineContainsTime` 的健壮性解决了此问题。
