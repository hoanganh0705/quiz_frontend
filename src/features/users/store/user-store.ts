import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getCurrentUser } from "@/features/users/services/users.reads.service";
import { isApiError } from "@/lib/api/core/ApiError";
import type { UserMeResponseDto } from "@/lib/api/generated/schemas";
import {
subscribeToProfileEvents,
type ProfileUpdatedEvent,
} from "@/lib/api/core/profile-broadcast-channel";
import { getAuthToken } from "@/features/auth/utils/auth-cookies";

type UserState = {
user: UserMeResponseDto | null;
isLoading: boolean;
error: string | null;

retryAfterAt: number | null;
setUser: (user: UserMeResponseDto | null) => void;
clearUser: () => void;
fetchCurrentUser: () => Promise<UserMeResponseDto | null>;
};

const FALLBACK_RETRY_AFTER_MS = 30_000;
let inFlight: Promise<UserMeResponseDto | null> | null = null;

export const useUserStore = create<UserState>()(
persist(
(set, get) => ({
user: null,
isLoading: false,
error: null,
retryAfterAt: null,
setUser: (user) => set({ user, error: null, retryAfterAt: null }),
clearUser: () => {

inFlight = null;
set({ user: null, isLoading: false, error: null, retryAfterAt: null });
      },
fetchCurrentUser: async () => {

const token = getAuthToken();
if (!token) {
return get().user;
        }

if (inFlight) {
return inFlight;
        }

const retryAfterAt = get().retryAfterAt;
if (retryAfterAt !== null && Date.now() < retryAfterAt) {
return get().user;
        }

const promise = (async (): Promise<UserMeResponseDto | null> => {
set({ isLoading: true, error: null, retryAfterAt: null });
try {
const user = await getCurrentUser();

set({ user, isLoading: false, retryAfterAt: null });
return user;
          } catch (error) {
const message =
error instanceof Error ? error.message : "Failed to load user";

const retryAfterMs = isApiError(error)
? (error.retryAfter ?? 0) * 1000
: 0;
const cooldown =
retryAfterMs > 0 ? retryAfterMs : FALLBACK_RETRY_AFTER_MS;
set({
isLoading: false,
error: message,
retryAfterAt: Date.now() + cooldown,
            });
return null;
          }
        })();

inFlight = promise.finally(() => {
inFlight = null;
        });

return inFlight;
      },
    }),
{
name: "user_store_v1",
storage: createJSONStorage(() => localStorage),
partialize: (state) => ({ user: state.user }),

skipHydration: true,
    },
  ),
);

export const useUser = () => useUserStore((state) => state.user);

export const useIsUserLoading = () => useUserStore((state) => state.isLoading);
export const useUserError = () => useUserStore((state) => state.error);

export const useSetUser = () => useUserStore((state) => state.setUser);
export const useClearUser = () => useUserStore((state) => state.clearUser);
export const useFetchCurrentUser = () =>
useUserStore((state) => state.fetchCurrentUser);

let hasProfileListener = false;

if (typeof window !== "undefined" && !hasProfileListener) {
const unsubscribe = subscribeToProfileEvents((event: ProfileUpdatedEvent) => {

if (
event.kind === "me" ||
event.kind === "settings" ||
event.kind === "avatar"
    ) {
void useUserStore.getState().fetchCurrentUser();
    }
  });

void unsubscribe;
hasProfileListener = true;
}
