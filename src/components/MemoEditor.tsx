import '../less/editor.less';
import '../less/memo-editor.less';
import { Notice } from 'obsidian';
import 'react';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { storage } from '../helpers/storage';
import utils from '../helpers/utils';
import useToggle from '../hooks/useToggle';
import { DefaultDataSource } from '../memos';
import { globalStateService, locationService, memoService } from '../services';
import appContext from '../stores/appContext';
import { t } from '../translations/helper';
import NativeEditor, { NativeEditorAPI } from './Editor/NativeEditor';
import { SquarePen } from 'lucide-react';

function getEditorContentCache(): string {
  return storage.get(['editorContentCache']).editorContentCache ?? '';
}

function setEditorContentCache(content: string) {
  storage.set({
    editorContentCache: content,
  });
}

/**
 * @description Brand new Memo Editor component.
 */
export default function MemoEditor() {
  const { globalState } = useContext(appContext);
  const editorRef = useRef<NativeEditorAPI>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isListShown] = useToggle(false);
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string>(DefaultDataSource || 'daily-notes');

  const modifyState = Boolean(globalState.editMemoId);
  const [editStatusState, setEditStatusState] = useState(false);

  const handleSaveBtnClick = useCallback(
    async (content: string) => {
      if (content === '') {
        new Notice(t('Content cannot be empty'));
        return;
      }

      const { editMemoId } = globalStateService.getState();
      content = content.replaceAll('&nbsp;', ' ');

      setEditorContentCache('');
      try {
        if (editMemoId) {
          const prevMemo = memoService.getMemoById(editMemoId);
          if (prevMemo) {
            content = content + (prevMemo.hasId ? ' ^' + prevMemo.hasId : '');
            if (prevMemo.content !== content) {
              const editedMemo = await memoService.updateMemo(
                prevMemo.id,
                prevMemo.content,
                content,
                prevMemo.memoType,
                prevMemo.path,
              );
              editedMemo.updatedAt = utils.getDateTimeString(Date.now());
              memoService.editMemo(editedMemo);
            }
          }
          globalStateService.setEditMemoId('');
        } else {
          const newMemo = await memoService.createMemo(content, isListShown, selectedDataSourceId);
          memoService.pushMemo(newMemo);
          locationService.clearQuery();
        }
        editorRef.current?.setContent('');
      } catch (error: any) {
        new Notice(error.message);
      }
    },
    [isListShown, selectedDataSourceId],
  );

  const handleCancelBtnClick = useCallback(() => {
    globalStateService.setEditMemoId('');
    editorRef.current?.setContent('');
    setEditorContentCache('');
  }, []);

  const [wordCount, setWordCount] = useState(0);
  useEffect(() => {
    if (!editorRef.current) return;
    setWordCount(editorRef.current.getContent().length);
    const unsubscribe = editorRef.current.onChange((content) => setWordCount(content.length));
    return () => {
      unsubscribe();
    };
  }, [modifyState]);

  useEffect(() => {
    if (globalState.editMemoId) {
      const memo = memoService.getMemoById(globalState.editMemoId);
      if (memo) {
        editorRef.current?.setContent(memo.content);
        setWordCount(memo.content.length);
        wrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      editorRef.current?.setContent('');
      setWordCount(0);
    }
  }, [globalState.editMemoId]);

  return (
    <div
      ref={wrapperRef}
      data-purpose="Memo Editor Wrapper"
      className="memo-editor-wrapper
			flex flex-col w-full rounded-lg border border-(--background-primary)
			 p-3 mb-6 bg-(--background-secondary)
			 dark:hover:border-gray-600 transition-colors duration-125"
    >
      <div className="flex flex-col w-full">
        <p
          data-purpose="show if the content is modifying"
          className={`text-xs font-medium text-(--text-faint) mb-2 rounded-none ${modifyState.valueOf() ? '' : 'hidden'}`}
        >
          {t('Modifying...' as any) /* does not have a transelation yet */}
        </p>
        <div>
          <p className="text-(--text-faint) text-xs font-medium">{wordCount} words</p>
        </div>
        <NativeEditor ref={editorRef} />
      </div>
      <div
        data-purpose="toolbar"
        className="flex w-full justify-between items-center mt-3 pt-2 border-t border-(--background-secondary)"
      >
        <button
          popoverTarget="data-source-popup-menu"
          style={{
            positionArea: 'bottom',
            anchorName: '--data-source-popup-menu',
          }}
        >
          <SquarePen></SquarePen>
        </button>
        <div
          data-purpose="data source popover menu"
          id="data-source-popup-menu"
          popover="auto"
          style={{ positionArea: 'bottom' }}
        >
          <p>content1</p>
        </div>

        <select
          className="bg-transparent border-none text-xs text-(--text-muted) cursor-pointer focus:ring-0 p-0"
          value={selectedDataSourceId}
          onChange={(e) => setSelectedDataSourceId(e.target.value)}
        >
          <option value="daily-notes">{t('Daily Notes' as any)}</option>
          <option value="single-file">{t('Single File' as any)}</option>
        </select>
        <div className="flex items-center justify-between">
          {modifyState.valueOf() && (
            <button
              type="button"
              className="w-12 mr-3 text-xs font-medium text-(--text-muted) hover:text-(--text-normal) cursor-pointer"
              onClick={handleCancelBtnClick}
            >
              {t('CANCEL EDIT')}
            </button>
          )}
          <button
            type="button"
            data-purpose="submit button"
            className="submit-button w-12 font-bold text-white px-3 py-1"
            onClick={() => {
              const content = editorRef.current?.getContent();
              if (content) {
                handleSaveBtnClick(content);
              }
            }}
          >
            {modifyState.valueOf() ? t('Save' as any) : 'Note'}
          </button>
        </div>
      </div>
    </div>
  );
}
