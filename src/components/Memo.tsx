import { moment, Notice, Platform } from 'obsidian';
import type React from 'react';
import { memo, useCallback, useContext, useMemo, useRef } from 'react';
import useState from 'react-usestateref';
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
import TaskBlank from '../icons/task-blank.svg?react';
import Task from '../icons/task.svg?react';
import '../less/memo.less';
import { DefaultEditorLocation, ShowTaskLabel, UseButtonToShowEditor } from '../memos';
import { showMemoInDailyNotes } from '../obComponents/obShowMemo';
import { globalStateService, memoService } from '../services';
import appContext from '../stores/appContext';
import { t } from '../translations/helper';
import showMemoCardDialog from './MemoCardDialog';
import MemoImage from './MemoImage';
import showShareMemoImageDialog from './ShareMemoImageDialog';

// interface LinkedMemo extends FormattedMemo {
//   dateStr: string;
// }

interface Props {
  memo: Model.Memo;
}

// Get Current Memos And Change it

const Memo: React.FC<Props> = (props: Props) => {
  const { globalState } = useContext(appContext);
  const { memo: propsMemo } = props;
  const [showConfirmDeleteBtn, toggleConfirmDeleteBtn] = useToggle(false);
  // const imageUrls = Array.from(memo.content.match(IMAGE_URL_REG) ?? []);

  const handleShowMemoStoryDialog = () => {
    showMemoCardDialog(propsMemo);
  };

  const handleMarkMemoClick = () => {
    if (UseButtonToShowEditor && DefaultEditorLocation === 'Bottom') {
      const elem = document.querySelector(
        "div[data-type='memos_view'] .view-content .memo-show-editor-button",
      ) as HTMLElement;
      if (typeof elem?.onclick == 'function') {
        elem.onclick.apply(elem);
      }
    }

    globalStateService.setMarkMemoId(propsMemo.id);
  };

  const handleEditMemoClick = () => {
    if (UseButtonToShowEditor && DefaultEditorLocation === 'Bottom' && Platform.isMobile) {
      const elem = document.querySelector(
        "div[data-type='memos_view'] .view-content .memo-show-editor-button",
      ) as HTMLElement;
      if (typeof elem.onclick == 'function') {
        elem.onclick.apply(elem);
      }
    }

    globalStateService.setEditMemoId(propsMemo.id);
  };

  const handleSourceMemoClick = (m: Model.Memo) => {
    showMemoInDailyNotes(m.id, m.path);
  };

  // const handleCreateNewNoteClick = () => {
  //   turnIntoNote(memo.id);
  // };

  const handleDeleteMemoClick = async () => {
    if (showConfirmDeleteBtn) {
      try {
        await memoService.hideMemoById(propsMemo.id);
      } catch (error: any) {
        new Notice(error.message);
      }

      if (globalStateService.getState().editMemoId === propsMemo.id) {
        globalStateService.setEditMemoId('');
      }
    } else {
      toggleConfirmDeleteBtn();
    }
  };

  const handleMouseLeaveMemoWrapper = () => {
    if (showConfirmDeleteBtn) {
      toggleConfirmDeleteBtn(false);
    }
  };

  const handleGenMemoImageBtnClick = () => {
    showShareMemoImageDialog(propsMemo);
  };

  const handleMemoTypeShow = () => {
    if (!ShowTaskLabel) {
      return;
    }

    if (propsMemo.memoType === 'TASK-TODO') {
      return <TaskBlank />;
    } else if (propsMemo.memoType === 'TASK-DONE') {
      return <Task />;
    }
  };

  // const handleMemoKeyDown = useCallback((event: React.MouseEvent, m) => {
  //   if (event.ctrlKey || event.metaKey) {
  //     handleSourceMemoClick(m);
  //   }
  // }, []);

  const handleMemoDoubleClick = useCallback((event: React.MouseEvent) => {
    if (event) {
      handleEditMemoClick();
    }
  }, []);

  const handleMemoContentClick = async (e: React.MouseEvent, m: Model.Memo) => {
    const targetEl = e.target as HTMLElement;

    if (e.ctrlKey || e.metaKey) {
      handleSourceMemoClick(m);
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
      // do nth
    }
  };

  const imageProps = {
    memo: propsMemo.content,
  };

  return (
    <div
      className={`memo-wrapper ${'memos-' + propsMemo.id} ${propsMemo.memoType}`}
      onMouseLeave={handleMouseLeaveMemoWrapper}
      draggable="true"
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', propsMemo.content.replace(/<br>/g, '\n'));
      }}
    >
      <div className="memo-top-wrapper">
        <div className="memo-top-left-wrapper">
          <span className="time-text" onClick={handleShowMemoStoryDialog}>
            {propsMemo.createdAt}
          </span>
          <div
            className={`memo-type-img ${
              (propsMemo.memoType === 'TASK-TODO' || propsMemo.memoType === 'TASK-DONE') && ShowTaskLabel
                ? ''
                : 'hidden'
            }`}
          >
            {handleMemoTypeShow() ?? ''}
          </div>
        </div>
        <div className="memo-top-right-wrapper">
          <div className="btns-container">
            <span className="btn more-action-btn">
              {/*<img className="icon-img" src={more} />*/}
              <More className="icon-img" />
            </span>
            <div className="more-action-btns-wrapper">
              <div className="more-action-btns-container">
                <span className="btn" onClick={handleShowMemoStoryDialog}>
                  {t('READ')}
                </span>
                <span className="btn" onClick={handleMarkMemoClick}>
                  {t('MARK')}
                </span>
                <span className="btn" onClick={handleGenMemoImageBtnClick}>
                  {t('SHARE')}
                </span>
                <span className="btn" onClick={handleEditMemoClick}>
                  {t('EDIT')}
                </span>
                <span className="btn" onClick={() => handleSourceMemoClick(propsMemo)}>
                  {t('SOURCE')}
                </span>
                <span
                  className={`btn delete-btn ${showConfirmDeleteBtn ? 'final-confirm' : ''}`}
                  onClick={handleDeleteMemoClick}
                >
                  {showConfirmDeleteBtn ? t('CONFIRM！') : t('DELETE')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className="memo-content-text"
        onClick={(e) => handleMemoContentClick(e, propsMemo)}
        onDoubleClick={handleMemoDoubleClick}
        dangerouslySetInnerHTML={{ __html: formatMemoContent(propsMemo.content, propsMemo.id) }}
      ></div>
      <MemoImage {...imageProps} />
    </div>
  );
};

export function formatMemoContent(content: string, memoid?: string) {
  content = encodeHtml(content);
  content = parseRawTextToHtml(content)
    .split('<br>')
    .map((t) => {
      return `<p>${t !== '' ? t : '<br>'}</p>`;
    })
    .join('');

  const { shouldUseMarkdownParser, shouldHideImageUrl } = globalStateService.getState();

  if (shouldUseMarkdownParser) {
    content = parseMarkedToHtml(content, memoid);
  }

  if (shouldHideImageUrl) {
    content = content.replace(WIKI_IMAGE_URL_REG, '').replace(MARKDOWN_URL_REG, '').replace(IMAGE_URL_REG, '');
  }

  // console.log(content);

  // 中英文之间加空格
  // if (shouldSplitMemoWord) {
  //   content = content
  //     .replace(/([\u4e00-\u9fa5])([A-Za-z0-9?.,;[\]]+)/g, "$1 $2")
  //     .replace(/([A-Za-z0-9?.,;[\]]+)([\u4e00-\u9fa5])/g, "$1 $2");
  // }

  content = content
    .replace(TAG_REG, "<span class='tag-span'>#$1</span>")
    .replace(FIRST_TAG_REG, "<p><span class='tag-span'>#$2</span>")
    .replace(LINK_REG, "$1<a class='link' target='_blank' rel='noreferrer' href='$2'>$2</a>")
    .replace(MD_LINK_REG, "<a class='link' target='_blank' rel='noreferrer' href='$2'>$1</a>")
    .replace(MEMO_LINK_REG, "<span class='memo-link-text' data-value='$2'>$1</span>")
    .replace(/\^\S{6}/g, '');

  // const contentMark = content.split('');

  // if(/(.*)<a(.*)/g.test(content)){

  // }
  //   for(let i=0; i<content.length;i++){
  //     let mark = false;
  //     let aMark = false;
  //     if(contentMark[i])
  //   }

  const tempDivContainer = document.createElement('div');
  tempDivContainer.innerHTML = content;
  for (let i = 0; i < tempDivContainer.children.length; i++) {
    const c = tempDivContainer.children[i];

    if (c.tagName === 'P' && c.textContent === '' && c.firstElementChild?.tagName !== 'BR') {
      c.remove();
      i--;
    }
  }

  return tempDivContainer.innerHTML;
}

export default memo(Memo);
