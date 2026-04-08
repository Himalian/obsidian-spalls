/** @file Memo.tsx
 * @description Single memo component.
/** biome-ignore-all lint/a11y/noStaticElementInteractions: <still in development> */
import { Notice, Platform } from 'obsidian';
import 'react';
import { useCallback, useContext } from 'react';
import {
  FIRST_TAG_REG,
  IMAGE_URL_REG,
  LINK_REG,
  MARKDOWN_URL_REG,
  MD_LINK_REG,
  MEMO_LINK_REG,
  TAG_REG,
  WIKI_IMAGE_URL_REG,
} from '../helpers/consts';
import { encodeHtml, parseMarkedToHtml, parseRawTextToHtml } from '../helpers/marked';
import useToggle from '../hooks/useToggle';
import More from '../icons/more.svg?react';
import Task from '../icons/task.svg?react';
import TaskBlank from '../icons/task-blank.svg?react';
import { DefaultEditorLocation, ShowTaskLabel, UseButtonToShowEditor } from '../memos';
import { showMemoInDailyNotes } from '../obComponents/obShowMemo';
import { globalStateService, memoService } from '../services';
import appContext from '../stores/appContext';
import MarkdownRenderer from './MarkdownRenderer';
import showMemoCardDialog from './MemoCardDialog';
import showShareMemoImageDialog from './ShareMemoImageDialog';
import '../less/memos-header.less';

interface MemoProps {
  memo: Model.Memo;
}

/** @deprecated */
export function formatMemoContent(content: string, memoid?: string) {
  let formattedContent = encodeHtml(content);
  formattedContent = parseRawTextToHtml(formattedContent)
    .split('<br>')
    .map((tItem) => {
      return `<p>${tItem !== '' ? tItem : '<br>'}</p>`;
    })
    .join('');

  const { shouldUseMarkdownParser, shouldHideImageUrl } = globalStateService.getState();

  if (shouldUseMarkdownParser) {
    formattedContent = parseMarkedToHtml(formattedContent, memoid);
  }

  if (shouldHideImageUrl) {
    formattedContent = formattedContent
      .replace(WIKI_IMAGE_URL_REG, '')
      .replace(MARKDOWN_URL_REG, '')
      .replace(IMAGE_URL_REG, '');
  }

  formattedContent = formattedContent
    .replace(TAG_REG, "<span class='tag-span'>#$1</span>")
    .replace(FIRST_TAG_REG, "<p><span class='tag-span'>#$2</span>")
    .replace(LINK_REG, "$1<a class='link' target='_blank' rel='noreferrer' href='$2'>$2</a>")
    .replace(MD_LINK_REG, "<a class='link' target='_blank' rel='noreferrer' href='$2'>$1</a>")
    .replace(MEMO_LINK_REG, "<span class='memo-link-text' data-value='$2'>$1</span>")
    .replace(/\^\S{6}/g, '');

  const tempDivContainer = document.createElement('div');
  tempDivContainer.innerHTML = formattedContent;
  for (let i = 0; i < tempDivContainer.children.length; i++) {
    const c = tempDivContainer.children[i];

    if (c.tagName === 'P' && c.textContent === '' && c.firstElementChild?.tagName !== 'BR') {
      c.remove();
      i--;
    }
  }

  return tempDivContainer.innerHTML;
}

export default function Memo({ memo: propsMemo }: MemoProps) {
  // biome-ignore lint/correctness/noUnusedVariables: <Still in refactoring>
  const { globalState } = useContext(appContext);
  const [showConfirmDeleteBtn, toggleConfirmDeleteBtn] = useToggle(false);

  const handleShowMemoStoryDialog = useCallback(() => {
    showMemoCardDialog(propsMemo);
  }, [propsMemo]);

  const handleMarkMemoClick = useCallback(() => {
    if (UseButtonToShowEditor && DefaultEditorLocation === 'Bottom') {
      const elem = document.querySelector(
        "div[data-type='memos_view'] .view-content .memo-show-editor-button",
      ) as HTMLElement | null;
      if (typeof elem?.onclick === 'function') {
        elem.onclick.apply(elem);
      }
    }

    globalStateService.setMarkMemoId(propsMemo.id);
  }, [propsMemo.id]);

  const handleEditMemoClick = useCallback(() => {
    if (UseButtonToShowEditor && DefaultEditorLocation === 'Bottom' && Platform.isMobile) {
      const elem = document.querySelector(
        "div[data-type='memos_view'] .view-content .memo-show-editor-button",
      ) as HTMLElement | null;
      if (elem && typeof elem.onclick === 'function') {
        elem.onclick.apply(elem);
      }
    }

    globalStateService.setEditMemoId(propsMemo.id);
  }, [propsMemo.id]);

  const handleSourceMemoClick = useCallback(() => {
    showMemoInDailyNotes(propsMemo.id, propsMemo.path);
  }, [propsMemo.id, propsMemo.path]);

  const handleDeleteMemoClick = useCallback(async () => {
    if (showConfirmDeleteBtn) {
      try {
        await memoService.hideMemoById(propsMemo.id);
      } catch (error: unknown) {
        if (error instanceof Error) {
          new Notice(error.message);
        } else {
          new Notice(String(error));
        }
      }

      if (globalStateService.getState().editMemoId === propsMemo.id) {
        globalStateService.setEditMemoId('');
      }
    } else {
      toggleConfirmDeleteBtn();
    }
  }, [showConfirmDeleteBtn, propsMemo.id, toggleConfirmDeleteBtn]);

  const handleMouseLeaveMemoWrapper = useCallback(() => {
    if (showConfirmDeleteBtn) {
      toggleConfirmDeleteBtn(false);
    }
  }, [showConfirmDeleteBtn, toggleConfirmDeleteBtn]);

  const handleGenMemoImageBtnClick = useCallback(() => {
    showShareMemoImageDialog(propsMemo);
  }, [propsMemo]);

  const handleMemoTypeShow = useCallback(() => {
    if (!ShowTaskLabel) {
      return null;
    }

    if (propsMemo.memoType === 'TASK-TODO') {
      return <TaskBlank />;
    }
    if (propsMemo.memoType === 'TASK-DONE') {
      return <Task />;
    }
    return null;
  }, [propsMemo.memoType]);

  const handleMemoDoubleClick = useCallback(() => {
    handleEditMemoClick();
  }, [handleEditMemoClick]);

  const handleMemoContentClick = useCallback(
    (e: React.MouseEvent) => {
      const targetEl = e.target as HTMLElement;

      if (e.ctrlKey || e.metaKey) {
        handleSourceMemoClick();
      }

      if (targetEl.className === 'memo-link-text') {
        const memoId = targetEl.dataset?.value;
        const memoTemp = memoService.getMemoById(memoId ?? '');

        if (memoTemp) {
          showMemoCardDialog(memoTemp);
        } else {
          new Notice('MEMO Not Found');
          targetEl.classList.remove('memo-link-text');
        }
      } else if (targetEl.className === 'todo-block') {
        // intentionally empty
      }
    },
    [handleSourceMemoClick],
  );

  const imageProps = {
    memo: propsMemo.content,
  };
  return (
    <div
      data-purpose="Memo container"
      className="flex flex-col justify-between rounded-md bg-(--background-secondary) w-full p-4 mb-0.5"
    >
      <div data-purpose="Memo header" className="flex justify-between text-sm text-(--text-normal) w-full pb-2">
        <p data-purpose="time" className="text-(--text-faint) text-sm">
          {propsMemo.updatedAt}
        </p>
        <button type="button" className="memo-header-icon clickable-icon btn">
          <More data-purpose="action button" />
        </button>
      </div>
      <span></span>
      <MarkdownRenderer className="" content={propsMemo.content} />
      {/*<p className="markdown-rendered cm-contentContainer">{propsMemo.content}</p>*/}
    </div>
  );
}
