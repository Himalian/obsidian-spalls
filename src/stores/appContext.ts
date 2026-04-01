import { createContext } from 'react';

// Avoid accessing appStore synchronously to prevent circular dependency ReferenceError
const appContext = createContext<any>({} as any);

/**
 * @deprecated
 */
export default appContext;
