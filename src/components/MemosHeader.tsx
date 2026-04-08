import 'react';
import { useCallback, useContext, useEffect, useState } from 'react';
import MenuSvg from '../icons/menu.svg?react';
import { globalStateService, memoService, queryService } from '../services';
import appContext from '../stores/appContext';
import Only from './common/OnlyWhen';
import SearchBar from './SearchBar';

/** @deprecated */
const MemosHeader: React.FC<Props> = () => {
  const {
    locationState: {
      query: { filter },
    },
    globalState: { isMobileView },
    queryState: { queries },
  } = useContext(appContext);

  const [titleText, setTitleText] = useState('MEMOS');

  useEffect(() => {
    const query = queryService.getQueryById(filter);
    if (query) {
      setTitleText(query.title);
    } else {
      setTitleText('MEMOS');
    }
  }, [filter, queries]);

  const handleMemoTextClick = useCallback(() => {
    memoService.fetchAllMemos().catch(() => {
      // do nth
    });
  }, []);

  // const handleRefreshClick = useCallback(() => {
  //   memoService.fetchAllMemos().catch(() => {
  //     // do nth
  //   });
  // }, []);

  const handleShowSidebarBtnClick = useCallback(() => {
    globalStateService.setShowSiderbarInMobileView(true);
  }, []);

  return (
    <div className="section-header-container memos-header-container">
      <div className="title-text" onClick={handleMemoTextClick} onKeyUp={onkeyup} onKeyDown={onkeydown}>
        <Only when={isMobileView}>
          <button
            className="flex items-center justify-center p-2 m-1
            bg-transparent border-none outline-none shadow-none! appearance-none!"
            onClick={handleShowSidebarBtnClick}
          >
            {/*<img className="icon-img" src={menuSvg} alt="menu" />*/}
            <MenuSvg className="shrink-0 w-4 h-4" />
          </button>
        </Only>
        <span className="normal-text">{titleText}</span>
      </div>
      <SearchBar />
    </div>
  );
};

export default function memosHeader() {
  const {
    locationState: {
      query: { filter },
    },
    globalState: { isMobileView },
    queryState: { queries },
  } = useContext(appContext);

  const [titleText, setTitleText] = useState('MEMOS');

  useEffect(() => {
    const query = queryService.getQueryById(filter);
    if (query) {
      setTitleText(query.title);
    } else {
      setTitleText('MEMOS');
    }
  }, [filter, queries]);
  const handleMemoTextClick = useCallback(() => {
    memoService.fetchAllMemos().catch(() => {
      // do nth
    });
  }, []);
  const handleShowSidebarBtnClick = useCallback(() => {
    globalStateService.setShowSiderbarInMobileView(true);
  }, []);

  return (
    <div className="flex justify-between w-full p-3">
      <div className="flex justify-center items-center">
        <Only when={isMobileView}>
          <button
            type="button"
            data-purpose="Menu Button Icon"
            className="flex items-center justify-center p-0 text-1.5xl clickable-icon btn"
            onClick={handleShowSidebarBtnClick}
          >
            <MenuSvg />
          </button>
        </Only>
        {/** biome-ignore lint/a11y/useKeyWithClickEvents: <Unecessary Accessibility> */}
        <p
          className="text-2xl font-bold ml-1.5 text-(--text-normal) cursor-pointer"
          data-purpose="Title Text"
          onClick={handleMemoTextClick}
        >
          Spalls
        </p>
      </div>
      <SearchBar />
    </div>
  );
}
