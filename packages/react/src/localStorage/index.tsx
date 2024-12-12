import { useEffect, useSyncExternalStore } from "react";

export function useLocalStorage() {
  useEffect(() => {}, []);
  useSyncExternalStore(
    api.subscribe,
    api.getStoreData.bind(api),
    api.getStoreData.bind(api)
  );
}
