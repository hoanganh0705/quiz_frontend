import React from "react";

// SWR compatibility shim for legacy test mocks
export const mutate = async (..._args: unknown[]) => Promise.resolve();

const defaultCache = new Map<string, unknown>();
let activeCache: any = defaultCache;

export const useSWRConfig = () => ({
  mutate,
  cache: activeCache,
});

export const SWRConfig = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value?: { provider?: () => any };
}) => {
  if (value?.provider) {
    activeCache = value.provider();
  }
  return children;
};

export const unstable_serialize = (key: unknown) => {
  if (typeof key === "string") return key;
  return JSON.stringify(key);
};

export default function useSWR() {
  return {
    data: undefined,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate,
  };
}
