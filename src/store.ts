import { create, type StateCreator, type StoreApi, type UseBoundStore } from "zustand";

/** It would be nice if these types were exported from zustand, but for now we've just copied them from the zustand source code. */
type ExtractState<S> = S extends {
  getState: () => infer T;
}
  ? T
  : never;
export type WithReact<S extends StoreApi<unknown>> = S & {
  getServerState?: () => ExtractState<S>;
};

interface FiledropState {
  privateKey: string | undefined;

  authenticate: (slug: string, randomString: string, masterPassword: string) => void;
}

const bundleStoreInitializer: StateCreator<FiledropState, [], [], FiledropState> = (set, _get) => ({
  privateKey: undefined,
  authenticate: (slug, randomString, masterPassword) => {},

  authorizationHeader: undefined,
});

/** This getter pattern ensures we don't unnecessarily create the store. */
let bundleStore: { useBundleStore: UseBoundStore<WithReact<StoreApi<FiledropState>>> };
export function getFiledropStore() {
  if (bundleStore) return bundleStore;
  bundleStore = {
    useBundleStore: create(bundleStoreInitializer),
  };
  return bundleStore;
}
