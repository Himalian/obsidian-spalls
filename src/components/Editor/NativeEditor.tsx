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

    editorRef.current = liveEditor;
    host.addChild(liveEditor);

    return () => {
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
