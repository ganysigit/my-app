"use client"

import * as React from "react"
import {
  IconDashboard,
  IconDatabase,
  IconBrandDiscord,
  IconBrandNotion,
  IconRefresh,
  IconClockHour4,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Admin",
    email: "admin@example.com",
    avatar: "/avatars/admin.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Sync Mappings",
      url: "/sync-mappings",
      icon: IconRefresh,
    },
    {
      title: "Notion Connections",
      url: "/notion-connections",
      icon: IconBrandNotion,
    },
    {
      title: "Discord Connections",
      url: "/discord-connections",
      icon: IconBrandDiscord,
    },
  ],
  navClouds: [],
  navSecondary: [
    {
      title: "Sync Log",
      url: "/sync-log",
      icon: IconClockHour4,
    },
  ],

}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/dashboard">
                <IconDatabase className="!size-5" />
                <span className="text-base font-semibold">Sync Bot</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
