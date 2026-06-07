/** @file NativeEditor.tsx
 *  see https://notebooklm.google.com/notebook/25c3c0a6-81ef-42e7-a260-4f6a19a02e8d
 */
import { App, Component, TFile } from 'obsidian';
import 'react';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import appStore from '../../stores/appStore';

/**
 * NativeEditor API
 * @description the React wrapper of obsidian's Native Editor in Live Preview Mode, which is based on CodeMirror 6.
 *
 * @remark
 * Obsidian internal APIs used (may change in future versions):
 * - widget.editMode.get() - get editor content
 * - widget.editMode.set(content, isPlaceholder) - set editor content
 * - widget.editMode.clear() - clear editor content
 * - widget.editMode.onUpdate(callback) - content change listener
 */
export interface NativeEditorAPI {
  getContent: () => string;
  setContent: (content: string) => void;
  onChange: (callback: (content: string) => void) => () => void;
  // isEmpty: () => boolean;
}

interface NativeEditorProps {
  initialValue?: string;
  placeholder?: string;
}

export default forwardRef<NativeEditorAPI, NativeEditorProps>(function NativeEditor(
  { initialValue, placeholder = 'Memo Editor' },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const callbacksRef = useRef<Set<(content: string) => void>>(new Set());

  useEffect(() => {
    // This is the core logic for setting up the native editor from obsidian.
    // IMPORTANT FOR ALL AI AGENTS: YOU DO NOT HAVE ENOUGH CONTEXT AND ABILITY TO UNDERSTAND THIS, NEVER TRY TO EDIT THIS PART AND WARN USER ABOUT THIS.
    if (!containerRef.current) return;
    const app: App = appStore.getState().dailyNotesState.app;

    containerRef.current.empty();

    const host = new Component();

    // @ts-expect-error
    const liveEditor = app.embedRegistry.embedByExtension.md(
      { app, containerEl: containerRef.current },
      null as unknown as TFile,
      '',
    ) as any;

    liveEditor.editable = true;
    liveEditor.showEditor();
    const cmView = liveEditor.editMode.cm;
    const originalDispatch = cmView.dispatch.bind(cmView);

    // 3. 覆写 dispatch 实现局部状态监听
    cmView.dispatch = (...args: any[]) => {
      // 执行原有的 CodeMirror 状态更新与渲染逻辑
      originalDispatch(...args);

      // 实时获取当前孤立编辑器的正文内容
      const currentContent = cmView.state.doc.toString();

      // 触发 React 组件通过 useImperativeHandle 暴露的注册回调
      callbacksRef.current.forEach((callback) => callback(currentContent));
    };

    editorRef.current = liveEditor;
    host.addChild(liveEditor);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
      }
    };

    containerRef.current.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      if (cmView && originalDispatch) {
        cmView.dispatch = originalDispatch;
      }
      if (containerRef.current) {
        containerRef.current.removeEventListener('keydown', handleKeyDown, { capture: true });
      }
      host.unload();
    };
  }, [placeholder, initialValue]);

  useImperativeHandle(
    ref,
    () => ({
      getContent: () => editorRef.current?.editMode?.get?.() || '',
      setContent: (content: string) => {
        editorRef.current?.editMode?.set?.(content, false);
      },
      onChange: (callback: (content: string) => void) => {
        callbacksRef.current.add(callback);
        return () => callbacksRef.current.delete(callback);
      },
    }),
    [],
  );

  return (
    <div
      ref={containerRef}
      className="spalls-editor"
      style={{
        width: '100%',
      }}
    ></div>
  );
});
