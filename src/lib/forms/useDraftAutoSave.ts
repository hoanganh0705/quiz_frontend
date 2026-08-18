"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
useFormState,
type FieldValues,
type UseFormReturn,
} from "react-hook-form";

const STORAGE_NAMESPACE = "quizhub.draft";

export interface DraftStorage {
getItem(key: string): string | null;
setItem(key: string, value: string): void;
removeItem(key: string): void;
}

const defaultStorage: DraftStorage = {
getItem: (key) =>
typeof window === "undefined" ? null : window.localStorage.getItem(key),
setItem: (key, value) => {
if (typeof window === "undefined") return;
window.localStorage.setItem(key, value);
  },
removeItem: (key) => {
if (typeof window === "undefined") return;
window.localStorage.removeItem(key);
  },
};

export interface UseDraftAutoSaveOptions<T extends FieldValues> {
form: UseFormReturn<T>;

formId: string;

userId: string | null;

intervalMs?: number;

storage?: DraftStorage;
}

export interface DraftSnapshot<T extends FieldValues> {
savedAt: string;
values: T;
}

export interface UseDraftAutoSaveReturn<T extends FieldValues> {

savedAt: string | null;

restore: () => void;

dismiss: () => void;

clearOnSubmit: () => void;
}

function buildKey(formId: string, userIdOrAnon: string): string {
return `${STORAGE_NAMESPACE}.${formId}.${userIdOrAnon}`;
}

function readSnapshot(
storage: DraftStorage,
key: string,
): DraftSnapshot<FieldValues> | null {
const raw = storage.getItem(key);
if (raw === null || raw.length === 0) return null;
try {
const parsed = JSON.parse(raw) as DraftSnapshot<FieldValues>;
if (
typeof parsed === "object" &&
parsed !== null &&
typeof parsed.savedAt === "string" &&
typeof parsed.values === "object" &&
parsed.values !== null
    ) {
return parsed;
    }
  } catch {
    // Fall through to null — corrupt entries are dropped.
  }
return null;
}

export function useDraftAutoSave<T extends FieldValues>(
options: UseDraftAutoSaveOptions<T>,
): UseDraftAutoSaveReturn<T> {
const {
form,
formId,
userId,
intervalMs = 5000,
storage = defaultStorage,
  } = options;

const userIdOrAnon = userId ?? "anon";
const storageKey = buildKey(formId, userIdOrAnon);

const [savedAt, setSavedAt] = useState<string | null>(null);
const snapshotRef = useRef<DraftSnapshot<T> | null>(null);
const lastWrittenRef = useRef<string | null>(null);

const { isDirty } = useFormState({ control: form.control as any });

useEffect(() => {
const snapshot = readSnapshot(storage, storageKey);
if (snapshot) {
snapshotRef.current = snapshot as DraftSnapshot<T>;
setSavedAt(snapshot.savedAt);
    }
    // The storage key is stable per formId+userId; intentionally not
    // reactive on the hook's identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

useEffect(() => {
if (!isDirty) return;

const timer = setInterval(() => {
const values = form.getValues();
const serialized = JSON.stringify(values);
if (serialized === lastWrittenRef.current) return;
const snapshot: DraftSnapshot<T> = {
savedAt: new Date().toISOString(),
values,
      };
storage.setItem(storageKey, JSON.stringify(snapshot));
lastWrittenRef.current = serialized;
snapshotRef.current = snapshot;
setSavedAt(snapshot.savedAt);
    }, intervalMs);

return () => {
clearInterval(timer);
    };
  }, [form, isDirty, intervalMs, storage, storageKey]);

const wasDirtyRef = useRef(false);
useEffect(() => {
if (wasDirtyRef.current && !isDirty) {
storage.removeItem(storageKey);
snapshotRef.current = null;
lastWrittenRef.current = null;
setSavedAt(null);
    }
wasDirtyRef.current = isDirty;
  }, [isDirty, storage, storageKey]);

const restore = useCallback(() => {
const snapshot = snapshotRef.current;
if (!snapshot) return;
form.reset(snapshot.values as Parameters<typeof form.reset>[0]);
  }, [form]);

const dismiss = useCallback(() => {
storage.removeItem(storageKey);
snapshotRef.current = null;
lastWrittenRef.current = null;
setSavedAt(null);
  }, [storage, storageKey]);

const clearOnSubmit = useCallback(() => {
storage.removeItem(storageKey);
snapshotRef.current = null;
lastWrittenRef.current = null;
setSavedAt(null);
  }, [storage, storageKey]);

return { savedAt, restore, dismiss, clearOnSubmit };
}
