import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpenText,
  LayoutDashboard,
  ListChecks,
  MessagesSquare,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { BrandMark } from "./brand";
import { ResponsibleAiDialog } from "./responsible-ai";
import { setTheme, useTheme } from "@/lib/theme";
import { useTasks, isDueToday } from "@/lib/tasks";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/tasks", label: "Task Planner", icon: ListChecks, exact: false },
  { to: "/research", label: "Research", icon: BookOpenText, exact: false },
  { to: "/chat", label: "AI Chat", icon: MessagesSquare, exact: false },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const theme = useTheme();
  const tasks = useTasks();
  const { setOpenMobile } = useSidebar();
  const todayOpen = tasks.filter((t) => isDueToday(t) && t.status !== "done").length;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          to="/"
          className="flex items-center gap-2.5 px-1 py-1.5"
          onClick={() => setOpenMobile(false)}
        >
          <BrandMark className="size-8" />
          <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-display text-lg font-bold tracking-tight">Kestrel</span>
            <span className="text-[11px] text-muted-foreground">Plan · Research · Chat</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link to={item.to} onClick={() => setOpenMobile(false)}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.to === "/tasks" && todayOpen > 0 && (
                      <SidebarMenuBadge>{todayOpen}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <ResponsibleAiDialog>
              <SidebarMenuButton tooltip="Privacy & responsible AI">
                <ShieldCheck />
                <span>Privacy & responsible AI</span>
              </SidebarMenuButton>
            </ResponsibleAiDialog>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={theme === "dark" ? "Light mode" : "Dark mode"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
