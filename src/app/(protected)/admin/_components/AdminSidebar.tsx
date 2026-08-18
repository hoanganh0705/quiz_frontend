"use client";

import type * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
Settings,
Shield,
ChevronLeft,
} from "lucide-react";

import {
Sidebar,
SidebarContent,
SidebarFooter,
SidebarHeader,
SidebarMenu,
SidebarMenuButton,
SidebarMenuItem,
SidebarRail,
SidebarSeparator,
} from "@/components/ui/Sidebar";

import { AdminNav } from "@/features/admin/components/AdminNav";

export function AdminSidebar({
...props
}: React.ComponentProps<typeof Sidebar>) {
const pathname = usePathname();

const isActive = (url: string) => {
if (url === "/admin") return pathname === "/admin";
return pathname.startsWith(url);
  };

return (
<Sidebar
collapsible="icon"
className="dark:bg-sidebar bg-sidebar"
{...props}
    >
<SidebarHeader className="border-r border-sidebar-border">
<SidebarMenu>
<SidebarMenuItem>
<SidebarMenuButton size="lg" asChild>
<Link href="/admin">
<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-brand text-white-primary">
<Shield className="size-4" />
</div>
<div className="flex flex-col gap-0.5 leading-none">
<span className="font-bold text-base text-sidebar-foreground">
Admin
                  </span>
<span className="text-xs text-muted-foreground font-normal">
Management
                  </span>
</div>
</Link>
</SidebarMenuButton>
</SidebarMenuItem>
</SidebarMenu>
</SidebarHeader>

{/* Permission-derived nav — driven by useAdminNav */}
<SidebarContent className="bg-background border border-sidebar-border">
<AdminNav />
</SidebarContent>

<SidebarSeparator className="mx-2" />

<SidebarFooter className="bg-background border-x border-sidebar-border">
{/* Settings link — always visible when admin */}
<SidebarMenu className="space-y-1 px-2 pb-2">
<SidebarMenuItem>
<SidebarMenuButton
asChild
isActive={isActive("/admin/settings")}
className={
isActive("/admin/settings")
? "text-white-primary bg-brand hover:bg-brand-hover data-[active=true]:bg-brand-hover"
: "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }
            >
<Link href="/admin/settings">
<Settings className="h-4 w-4" aria-hidden="true" />
<span className="text-sm font-medium">Settings</span>
</Link>
</SidebarMenuButton>
</SidebarMenuItem>
{/* Roles & Permissions — always visible when admin (links to roles page) */}
<SidebarMenuItem>
<SidebarMenuButton
asChild
isActive={isActive("/admin/roles")}
className={
isActive("/admin/roles")
? "text-white-primary bg-brand hover:bg-brand-hover data-[active=true]:bg-brand-hover"
: "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }
            >
<Link href="/admin/roles">
<Shield className="h-4 w-4" aria-hidden="true" />
<span className="text-sm font-medium">Roles & Permissions</span>
</Link>
</SidebarMenuButton>
</SidebarMenuItem>
</SidebarMenu>

{/* Back to app */}
<SidebarMenu className="px-2 pt-0">
<SidebarMenuItem>
<SidebarMenuButton className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
<Link href="/" className="flex items-center gap-2">
<ChevronLeft className="size-4" />
<span className="text-sm font-medium">Back to App</span>
</Link>
</SidebarMenuButton>
</SidebarMenuItem>
</SidebarMenu>
</SidebarFooter>

<SidebarRail />
</Sidebar>
  );
}
