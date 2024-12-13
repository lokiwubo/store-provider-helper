import { useSyncExternalStore } from "react";
import { createLocalStorageContainer, StorageStore, StorageStoreSchema } from "@store-provider-helper/core";
import { FunctionLike } from "ts-utils-helper";


/**
 * @description 
 */
export  const createLocalStorage = < TName extends string, TSchema extends StorageStoreSchema >(name: TName, schema: TSchema)=>{
  const container = createLocalStorageContainer(name, schema);
  const useLocalStorage = function<TSelector extends FunctionLike>(selector: TSelector){
    useSyncExternalStore( container.subscribe, container.getStoreData);
    return selector(container.getStoreData());
  }
  return Object.assign({
    getItem: container.getItem,
    setItem: container.setItem,
  }, useLocalStorage) as  unknown as {
    getItem: StorageStore<TSchema>["getItem"],
    setItem: StorageStore<TSchema>["setItem"],
  }
};