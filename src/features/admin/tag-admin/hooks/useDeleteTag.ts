"use client";

import { useCallback, useRef, useState } from "react";

import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api";
import { addTagAdminBreadcrumb } from "@/lib/admin/admin_live_sentry";

import { deleteTag } from "@/features/admin/services/tag-admin.service";
import { TAG_KEYS } from "@/features/tags/query-keys";

import { broadcastTagAdminInvalidate } from "../cache/tag-cross-tab";
import { TAG_ADMIN_LIST_KEY } from "./useTagAdminList";

export interface UseDeleteTag {
  remove: (id: string) => Promise<void>;
  isPending: boolean;
  error: ApiError | null;
  reset: () => void;
  audit: AuditSnapshot;
}

export interface AuditSnapshot {
  beforeTagId: string | null;
  afterTagId: string | null;
}

export function useDeleteTag(): UseDeleteTag {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const [beforeTagId, setBeforeTagId] = useState<string | null>(null);
  const [afterTagId, setAfterTagId] = useState<string | null>(null);

  const abortRef = useRef<(() => void) | null>(null);

  const remove = useCallback(async (id: string): Promise<void> => {
    abortRef.current?.();
    setIsPending(true);
    setError(null);

    setBeforeTagId(id);
    setAfterTagId(null);

    const start = Date.now();

    addTagAdminBreadcrumb({
      action: "tag.delete",
      route: "tag-admin.deleteTag",
      status: "started",
      durationMs: 0,
    });

    try {
      await deleteTag(id);

      setAfterTagId(id);
      addTagAdminBreadcrumb({
        action: "tag.delete",
        route: "tag-admin.deleteTag",
        status: "success",
        durationMs: Date.now() - start,
        targetId: id,
      });

      const qc = getQueryClient();
      await Promise.all([
        qc.invalidateQueries({ queryKey: [TAG_ADMIN_LIST_KEY] }),
        qc.invalidateQueries({ queryKey: TAG_KEYS.all }),
      ]);

      broadcastTagAdminInvalidate("delete", id);
      setIsPending(false);
    } catch (thrown: unknown) {
      const apiError =
        thrown instanceof ApiError ? thrown : new ApiError(thrown as never);

      addTagAdminBreadcrumb({
        action: "tag.delete",
        route: "tag-admin.deleteTag",
        status: "failure",
        durationMs: Date.now() - start,
        targetId: id,
        code: apiError.code,
        requestId: apiError.requestId,
      });

      setIsPending(false);
      setError(apiError);
      throw apiError;
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.();
    setError(null);
    setIsPending(false);
    setBeforeTagId(null);
    setAfterTagId(null);
  }, []);

  return {
    remove,
    isPending,
    error,
    reset,
    audit: { beforeTagId, afterTagId },
  };
}
