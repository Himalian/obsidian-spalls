// biome-ignore lint/style/useImportType: <not refactored yet>
import { App } from 'obsidian';
import { createContext } from 'react';

// biome-ignore lint/correctness/noUnusedVariables: <Not refactored yet>
interface AppInstance {
  dailyNotesState: {
    app: App;
  };
}
const appContext = createContext<any>({} as any);

/**
 * @type unknown
 */
export default appContext;
