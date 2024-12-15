import { createHistoryContainer } from "@store-provider-helper/core";

/**
 * @description
 */
export const createHistory = <TName extends string>(
  name: TName,
  options?: Partial<{
    expired: number;
  }>
) => {
  const historyContainer = createHistoryContainer(name);
  const useHistoryState = function <TState>(state: TState) {
    const [state, setState] = historyContainer.getState(state);

    const setHistoryState = function (newState: TState) {
      return newState;
    };
    return [state, setHistoryState];
  };
  return useHistoryState;
};
