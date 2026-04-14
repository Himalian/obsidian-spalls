import { createContext } from 'react';
import appStore, { type AppState } from './appStore';

const appContext = createContext<AppState>(appStore.getState());

export default appContext;
