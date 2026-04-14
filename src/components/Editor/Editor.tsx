/**
 * @file Editor.tsx
 * @description The Editor component. Note that this is only internal component
 */
import ReactTextareaAutocomplete from '@webscopeio/react-textarea-autocomplete';
import type { App, TFile } from 'obsidian';
import React, { type ReactNode, useContext, useEffect, useImperativeHandle, useRef } from 'react';
import useState from 'react-usestateref';
import TinyUndo from 'tiny-undo';
import { MEMOS_VIEW_TYPE } from '../../constants';
import { storage } from '../../helpers/storage';
import useRefresh from '../../hooks/useRefresh';
import '../../less/editor.less';
import '../../less/suggest.less';
import { FocusOnEditor, SaveMemoButtonIcon, SaveMemoButtonLabel } from '../../memos';
import { getSuggestions } from '../../obComponents/obFileSuggester';
import { usedTags } from '../../obComponents/obTagSuggester';
import appContext from '../../stores/appContext';
import appStore from '../../stores/appStore';
import { t } from '../../translations/helper';
import Only from '../common/OnlyWhen';

/**
 * Obsidian global app instance.
 */
declare const app: App;

/**
 * @description Interface representing a suggestion item for tags or files.
 */
interface SuggestionItem {
  char: string;
  name: string;
  file?: TFile;
}

/**
 * @description Properties for the TItem component.
 */
type ItemProps = {
  entity: SuggestionItem;
};

/**
 * @description Properties for the Loading component.
 */
type LoadingProps = {
  data: Array<{ name: string; char: string }>;
};

/**
 * @description Actions exposed by the Editor component via ref.
 */
export interface EditorRefActions {
  element: HTMLTextAreaElement;
  focus: FunctionType;
  insertText: (text: string) => void;
  setContent: (text: string) => void;
  getContent: () => string;
}

/**
 * @description Properties for the Editor component.
 */
interface EditorProps {
  className: string;
  inputerType: string;
  initialContent: string;
  placeholder: string;
  showConfirmBtn: boolean;
  showCancelBtn: boolean;
  tools?: ReactNode;
  onConfirmBtnClick: (content: string) => void;
  onCancelBtnClick: () => void;
  onContentChange: (content: string) => void;
}

/**
 * @description TItem component used in text area autocomplete to render tag and file suggestions.
 * @param {ItemProps} props - The item properties including the character.
 */
function TItem({ entity: { char } }: ItemProps) {
  return <div data-purpose="autocomplete-item">{`${char}`}</div>;
}

/**
 * @description Loading component used when suggestions are being fetched.
 * @param {LoadingProps} _props - The loading component properties.
 */
function Loading(_props: LoadingProps) {
  return <div data-purpose="autocomplete-loading">Loading</div>;
}

export let editorInput: HTMLTextAreaElement;
let actualToken: string;

/**
 * @description EditorLegacy component is a versatile text editor supporting internal tags,
 * file references (via autocomplete), and undo/redo histories.
 *
 * @param {EditorProps & { ref?: React.Ref<EditorRefActions> }} props - The component properties.
 */
export default function Editor(props: EditorProps & { ref?: React.Ref<EditorRefActions> }) {
  const {
    globalState: { useTinyUndoHistoryCache },
  } = useContext(appContext);
  const {
    className,
    inputerType,
    initialContent,
    placeholder,
    showConfirmBtn,
    showCancelBtn,
    onConfirmBtnClick: handleConfirmBtnClickCallback,
    onCancelBtnClick: handleCancelBtnClickCallback,
    onContentChange: handleContentChangeCallback,
    ref,
  } = props;
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const tinyUndoRef = useRef<TinyUndo | null>(null);
  const refresh = useRefresh();

  const [, setHeight] = useState(0);

  useEffect(() => {
    const leaves = app.workspace.getLeavesOfType(MEMOS_VIEW_TYPE);
    let memosHeight;
    let leafView;

    if (leaves.length > 0) {
      const leaf = leaves[0];
      leafView = leaf.view.containerEl;
      memosHeight = leafView.offsetHeight;
    } else {
      leafView = document as any;
      memosHeight = (window as any).outerHeight;
    }

    setHeight(memosHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    if (initialContent) {
      editorRef.current.value = initialContent;
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (useTinyUndoHistoryCache) {
      if (!editorRef.current) {
        return;
      }

      const { tinyUndoActionsCache, tinyUndoIndexCache } = storage.get(['tinyUndoActionsCache', 'tinyUndoIndexCache']);

      tinyUndoRef.current = new TinyUndo(editorRef.current, {
        interval: 5000,
        initialActions: tinyUndoActionsCache,
        initialIndex: tinyUndoIndexCache,
      });

      tinyUndoRef.current.subscribe((actions, index) => {
        storage.set({
          tinyUndoActionsCache: actions,
          tinyUndoIndexCache: index,
        });
      });

      return () => {
        tinyUndoRef.current?.destroy();
      };
    } else {
      tinyUndoRef.current?.destroy();
      tinyUndoRef.current = null;
      storage.remove(['tinyUndoActionsCache', 'tinyUndoIndexCache']);
    }
  }, [useTinyUndoHistoryCache]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.style.height = 'auto';
      editorRef.current.style.height = (editorRef.current.scrollHeight ?? 0) + 'px';
    }
  }, [editorRef.current?.value]);

  useImperativeHandle(
    ref,
    () => ({
      element: editorRef.current as HTMLTextAreaElement,
      focus: () => {
        if (FocusOnEditor) {
          editorRef.current?.focus();
        }
      },
      insertText: (rawText: string) => {
        if (!editorRef.current) {
          return;
        }

        const prevValue = editorRef.current.value;
        editorRef.current.value =
          prevValue.slice(0, editorRef.current.selectionStart) +
          rawText +
          prevValue.slice(editorRef.current.selectionStart);
        handleContentChangeCallback(editorRef.current.value);
        refresh();
      },
      setContent: (text: string) => {
        if (editorRef.current) {
          editorRef.current.value = text;
          handleContentChangeCallback(editorRef.current.value);
          refresh();
        }
      },
      getContent: (): string => {
        return editorRef.current?.value ?? '';
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /**
   * @description Handles the selection of an item from the autocomplete dropdown.
   * @param {Object} event - The selection event containing trigger type and item data.
   */
  function handleInsertTrigger(event: { currentTrigger: string; item: SuggestionItem }) {
    if (!editorRef.current) {
      return;
    }

    const { fileManager } = appStore.getState().dailyNotesState.app;

    if (event.currentTrigger === '#') {
      const prevValue = editorRef.current.value;
      let removeCharNum;
      if (actualToken !== null && actualToken !== undefined) {
        removeCharNum = actualToken.length;
      } else {
        removeCharNum = 0;
      }
      let behindCharNum = editorRef.current.selectionStart;
      for (let i = 0; i < prevValue.length; i++) {
        if (!/\s/g.test(prevValue[behindCharNum])) {
          behindCharNum++;
        }
      }

      editorRef.current.value =
        //eslint-disable-next-line
        prevValue.slice(0, editorRef.current.selectionStart - removeCharNum) +
        event.item.char +
        prevValue.slice(behindCharNum);
      handleContentChangeCallback(editorRef.current.value);
      refresh();
    } else if (event.currentTrigger === '[[') {
      if (!event.item.file) return;
      const filePath = fileManager.generateMarkdownLink(event.item.file, event.item.file.path, '', '');

      const prevValue = editorRef.current.value;
      let removeCharNum;
      if (actualToken !== null && actualToken !== undefined) {
        if (filePath.includes('[[')) {
          removeCharNum = actualToken.length + 1;
        } else if (event.item.file.extension !== 'md') {
          removeCharNum = actualToken.length + 1;
        } else {
          removeCharNum = actualToken.length + 2;
        }
      } else {
        removeCharNum = 2;
      }
      let behindCharNum = editorRef.current.selectionStart;
      for (let i = 0; i < prevValue.length; i++) {
        if (!/\s/g.test(prevValue[behindCharNum])) {
          behindCharNum++;
        }
      }

      editorRef.current.value =
        //eslint-disable-next-line
        prevValue.slice(0, editorRef.current.selectionStart - removeCharNum) +
        filePath +
        prevValue.slice(behindCharNum);
      handleContentChangeCallback(editorRef.current.value);
      refresh();
    }
  }

  /**
   * @description Handles input changes in the editor.
   */
  function handleEditorInput() {
    handleContentChangeCallback(editorRef.current?.value ?? '');
    refresh();
  }

  /**
   * @description Handles keyboard events in the editor (e.g. submitting on Meta/Ctrl + Enter).
   * @param {React.KeyboardEvent<HTMLTextAreaElement>} event - The keyboard event.
   */
  function handleEditorKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    event.stopPropagation();

    if (event.code === 'Enter') {
      if (event.metaKey || event.ctrlKey) {
        handleCommonConfirmBtnClick();
      }
    }
    refresh();
  }

  /**
   * @description Handles the confirmation (save) action for the editor.
   */
  function handleCommonConfirmBtnClick() {
    if (!editorRef.current) {
      return;
    }

    if (inputerType === 'memo') {
      editorRef.current.value = getEditorContentCache();
    }

    handleConfirmBtnClickCallback(editorRef.current.value);
    editorRef.current.value = '';

    refresh();
    // After confirm btn clicked, tiny-undo should reset state(clear actions and index)
    tinyUndoRef.current?.resetState();
  }

  /**
   * @description Handles the cancellation action for the editor.
   */
  function handleCommonCancelBtnClick() {
    handleCancelBtnClickCallback();
  }

  /**
   * @description Gets the cached content for the editor from storage.
   * @returns {string} The cached content string.
   */
  function getEditorContentCache(): string {
    return storage.get(['editorContentCache']).editorContentCache ?? '';
  }

  /**
   * @description Retrieves the current content of the editor, checking cache.
   * @returns {string} The current editor content.
   */
  function getEditorContent(): string {
    if (!editorRef.current) {
      return '';
    }

    editorRef.current.value = getEditorContentCache();

    return editorRef.current.value;
  }

  // Cast to any to bypass the strict JSX component type mismatch with React 17/19 types in third party lib
  const Autocomplete = ReactTextareaAutocomplete as any;

  return (
    <div className={'common-editor-wrapper ' + className} data-purpose="editor-wrapper">
      {inputerType === 'memo' ? (
        <Autocomplete
          className="common-editor-inputer scroll"
          loadingComponent={Loading}
          placeholder={placeholder}
          movePopupAsYouType={true}
          value={getEditorContent()}
          innerRef={(textarea: HTMLTextAreaElement) => {
            editorRef.current = textarea;
          }}
          onInput={handleEditorInput}
          onKeyDown={handleEditorKeyDown}
          style={{
            minHeight: 48,
          }}
          dropdownStyle={{
            minWidth: 180,
            maxHeight: 250,
            overflowY: 'auto',
          }}
          minChar={0}
          onItemSelected={handleInsertTrigger}
          scrollToItem={true}
          trigger={{
            '#': {
              dataProvider: (token: string) => {
                actualToken = token;
                return usedTags(token).map(
                  ({ name, char }: { name: string; char: string }): SuggestionItem => ({ name, char }),
                );
              },
              component: TItem,
              afterWhitespace: true,
              output: (item: SuggestionItem) => item.char,
            },
            '[[': {
              dataProvider: (token: string) => {
                actualToken = token;
                return getSuggestions(token)
                  .slice(0, 10)
                  .map(
                    ({ name, char, file }: { name: string; char: string; file: TFile }): SuggestionItem => ({
                      name,
                      char,
                      file,
                    }),
                  );
              },
              component: TItem,
              afterWhitespace: true,
              output: (item: SuggestionItem) => item.char,
            },
          }}
        />
      ) : (
        <textarea
          className="common-editor-inputer scroll"
          rows={1}
          placeholder={placeholder}
          ref={editorRef}
          onInput={handleEditorInput}
          onKeyDown={handleEditorKeyDown}
          style={{
            minHeight: 48,
          }}
          data-purpose="editor-textarea"
        ></textarea>
      )}

      <div className="common-tools-wrapper" data-purpose="tools-wrapper">
        <div className="common-tools-container" data-purpose="tools-container">
          <Only when={props.tools !== undefined}>{props.tools}</Only>
        </div>
        <div className="btns-container" data-purpose="action-buttons-container">
          <Only when={showCancelBtn}>
            <button className="action-btn cancel-btn" onClick={handleCommonCancelBtnClick} data-purpose="cancel-btn">
              {t('CANCEL EDIT')}
            </button>
          </Only>
          <Only when={showConfirmBtn}>
            <button
              className="action-btn confirm-btn"
              disabled={!editorRef.current?.value}
              onClick={handleCommonConfirmBtnClick}
              data-purpose="confirm-btn"
            >
              {SaveMemoButtonLabel}
              <span className="icon-text">{SaveMemoButtonIcon}️</span>
            </button>
          </Only>
        </div>
      </div>
    </div>
  );
}
