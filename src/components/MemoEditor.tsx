import '../less/editor.less';
import '../less/memo-editor.less';
import { Notice } from 'obsidian';
import 'react';
import { useCallback, useContext, useRef, useState } from 'react';
import { storage } from '../helpers/storage';
import utils from '../helpers/utils';
import useToggle from '../hooks/useToggle';
import { DefaultDataSource } from '../memos';
import { globalStateService, locationService, memoService } from '../services';
import appContext from '../stores/appContext';
import { t } from '../translations/helper';
import NativeEditor, { NativeEditorAPI } from './Editor/NativeEditor';

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
  const [isListShown] = useToggle(false);
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string>(DefaultDataSource || 'daily-notes');

  const showEditStatus = Boolean(globalState.editMemoId);

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
            content = content + (prevMemo.hasId === '' ? '' : ' ^' + prevMemo.hasId);
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

  return (
    <div
      data-purpose="Memo Editor Warpper"
      className="memo-editor-wrapper flex flex-col w-full rounded-xl border-4 border-(--background-secondary) p-3 mb-6 bg-(--background-primary) shadow-sm"
    >
      <div className="flex flex-col w-full">
        <p
          data-purpose="show if the content is modifying"
          className={`text-xs font-medium text-(--text-faint) mb-2 rounded-none ${showEditStatus ? '' : 'hidden'}`}
        >
          {t('Modifying...' as any) /* does not have a transelation yet */}
        </p>
        <NativeEditor ref={editorRef} />
      </div>
      <div
        data-purpose="container for submit and tool buttons"
        className="flex w-full justify-between items-center mt-3 pt-2 border-t border-(--background-secondary)"
      >
        <select
          className="bg-transparent border-none text-xs text-(--text-muted) cursor-pointer focus:ring-0 p-0"
          value={selectedDataSourceId}
          onChange={(e) => setSelectedDataSourceId(e.target.value)}
        >
          <option value="daily-notes">{t('Daily Notes' as any)}</option>
          <option value="single-file">{t('Single File' as any)}</option>
        </select>
        <div className="flex items-center">
          {showEditStatus && (
            <button
              type="button"
              className="mr-3 text-xs font-medium text-(--text-muted) hover:text-(--text-normal) cursor-pointer"
              onClick={handleCancelBtnClick}
            >
              {t('CANCEL EDIT')}
            </button>
          )}
          <button
            type="button"
            data-purpose="submit button"
            className="submit-button font-bold text-white px-3 py-1"
            onClick={() => {
              const content = editorRef.current?.getContent();
              if (content) {
                handleSaveBtnClick(content);
              }
            }}
          >
            {showEditStatus ? t('Save' as any) : 'Note'}
          </button>
        </div>
      </div>
    </div>
  );
}
