"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  ChevronDown,
  LogOut,
  Search,
  Settings,
  User as UserIcon,
  Shield,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuItem,
DropdownMenuLabel,
DropdownMenuSeparator,
DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Badge } from "@/components/ui/Badge";
import { ModeToggle } from "@/shared/layout/components/ModeToggle";
import { SidebarTrigger, useSidebar } from "@/components/ui/Sidebar";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { CoinBalancePill } from "@/features/coins/components/CoinBalancePill";
import { useIsMobile, useAsyncAction } from "@/shared/hooks";
import { useAppLanguage } from "@/shared/hooks/use-app-language";
import { useAuthState } from "@/features/auth/hooks";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { logout } from "@/features/auth/services/auth.service";
import { useRouter } from "next/navigation";
import { useUser, useClearUser } from "@/features/users/store/user-store";
import { useAdminRole } from "@/features/admin/hooks/useAdminRole";
import { useAdminFeatureFlag } from "@/features/admin/hooks/useAdminFeatureFlag";

function useIsMac() {
return useSyncExternalStore(
() => () => {},
() => /Mac|iPod|iPhone|iPad/.test(navigator.platform),
() => false,
  );
}

export function AppHeader() {
const { state } = useSidebar();
const isMobile = useIsMobile();
const { t } = useAppLanguage();
const { isAuthenticated, setAuthenticated } = useAuthState();
const router = useRouter();
const user = useUser();
const clearUser = useClearUser();
const isMac = useIsMac();

const { isLoading: isAdminLoading, role } = useAdminRole();
const { isLive } = useAdminFeatureFlag("admin_live");
const canSeeAdmin = isLive && !isAdminLoading && (role === "admin" || role === "moderator");
const isAdmin = role === "admin";
const isModerator = role === "moderator";

const avatarLabel = useMemo(() => {
const value = user?.displayName || user?.username || user?.email || "User";
const parts = value.trim().split(" ");
if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }, [user]);

const userDisplayName = useMemo(() => {
return user?.displayName || user?.username || user?.email || "Account";
  }, [user]);

const userEmail = user?.email;
const userAvatarUrl = user?.avatarUrl;

const { execute: handleLogout, isLoading: isLoggingOut } = useAsyncAction(
async () => {
try {
await logout();
      } finally {
setAuthenticated(false);
clearUser();
router.replace("/login");
      }
    },
  );

const sidebarWidth =
isMobile === undefined
? "0"
: isMobile
? "0"
: state === "expanded"
? "16rem"
: "3rem";

if (isAuthenticated === undefined) {
return (
<header
className="fixed top-0 z-50 h-16 flex items-center
                   bg-background border-b border-border px-2 sm:px-4
                   transition-all duration-300"
style={{ left: sidebarWidth, right: 0 }}
aria-hidden="true"
      />
    );
  }

return (
<header
className="fixed top-0 z-50 h-16 flex items-center
                 bg-background border-b border-border px-2 sm:px-4
                 transition-all duration-300"
style={{ left: sidebarWidth, right: 0 }}
    >
<div>
<SidebarTrigger
className="text-foreground/70 hover:text-foreground  hover:bg-transparent bg-transparent font-extralight"
aria-label="Toggle sidebar"
        />
</div>

<div className="w-4 sm:w-4" />

<div className="hidden sm:flex items-center gap-2 flex-1 min-w-0 max-w-sm sm:max-w-md lg:max-w-xl">
<div className="relative flex-1 min-w-0">
<button
type="button"
onClick={() =>
window.dispatchEvent(new CustomEvent('quick-search:open'))
}
aria-label={t(
'openSearch',
'Open search'
)}
aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
className="group flex h-9 w-full items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
data-testid="header-search-trigger"
>
<Search className="h-4 w-4 shrink-0" aria-hidden="true" />
<span className="truncate">
{t('searchPlaceholder', 'Search quizzes, categories, creators…')}
</span>
<kbd className="ml-auto hidden md:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground group-hover:bg-background">
{isMac ? '⌘K' : 'Ctrl+K'}
</kbd>
</button>
</div>
</div>

<div className="w-4 sm:w-4 flex-1" />

<div className="flex items-center gap-2 sm:gap-2 md:gap-3 shrink-0">
<NotificationBell />
<div>
<ModeToggle />
</div>

<CoinBalancePill />

{isAuthenticated ? (
<div className="relative z-[55]">
<DropdownMenu>
<DropdownMenuTrigger asChild>
<Button
variant="ghost"
size="default"
className="flex h-10 items-center gap-2 rounded-full px-2 py-1.5 hover:bg-muted/70"
aria-label="Open user menu"
>
<Avatar className="h-8 w-8 shrink-0">
{userAvatarUrl ? (
<AvatarImage src={userAvatarUrl} alt={userDisplayName} />
) : null}
<AvatarFallback className="bg-brand text-brand-foreground text-xs">
{avatarLabel}
</AvatarFallback>
</Avatar>
<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
</Button>
</DropdownMenuTrigger>

<DropdownMenuContent
align="end"
sideOffset={12}
className="w-64 z-[60]"
>
<DropdownMenuLabel className="space-y-1">
<div className="flex items-center gap-3">
<Avatar className="h-9 w-9 shrink-0">
{userAvatarUrl ? (
<AvatarImage
src={userAvatarUrl}
alt={userDisplayName}
/>
) : null}
<AvatarFallback className="bg-brand text-brand-foreground text-xs">
{avatarLabel}
</AvatarFallback>
</Avatar>
<div className="min-w-0 flex-1">
<div className="flex items-center gap-2">
<p className="truncate text-sm font-semibold text-foreground">
{userDisplayName}
</p>
{/* Role badges for admin/moderator */}
{isAdmin && (
<Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 font-medium">
Admin
</Badge>
)}
{isModerator && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium bg-warning text-warning-foreground">
            Mod
          </Badge>
        )}
</div>
{userEmail ? (
<p className="truncate text-xs text-muted-foreground">
{userEmail}
</p>
) : null}
</div>
</div>
</DropdownMenuLabel>

<DropdownMenuSeparator />

<DropdownMenuItem asChild>
<Link href="/my-profile" className="flex items-center gap-2">
<UserIcon className="h-4 w-4" />
<span>My profile</span>
</Link>
</DropdownMenuItem>

<DropdownMenuItem asChild>
<Link href="/settings" className="flex items-center gap-2">
<Settings className="h-4 w-4" />
<span>Settings</span>
</Link>
</DropdownMenuItem>

{canSeeAdmin && (
<DropdownMenuItem asChild>
<Link href="/admin" className="flex items-center gap-2">
<Shield className="h-4 w-4" />
<span>Admin Console</span>
</Link>
</DropdownMenuItem>
                )}

<DropdownMenuSeparator />

<DropdownMenuItem
variant="destructive"
className="flex items-center gap-2"
onSelect={(event) => {
event.preventDefault();
void handleLogout();
                  }}
disabled={isLoggingOut}
                >
<LogOut className="h-4 w-4" />
<span>{isLoggingOut ? "Signing out…" : "Logout"}</span>
</DropdownMenuItem>
</DropdownMenuContent>
</DropdownMenu>
</div>
        ) : (
<Button asChild size="sm" className="rounded-full px-4">
<Link href="/login">Sign in</Link>
</Button>
        )}
</div>
</header>
  );
}
