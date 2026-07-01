"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Search, Plus, Settings, Moon, Sun, Pin } from "lucide-react";
import { useTheme } from "next-themes";
import { cn, getColor } from "@/lib/utils";
import type { RecurringMeeting } from "@/lib/types";
import { SearchDialog } from "./SearchDialog";
import { useState } from "react";
import { NewMeetingDialog } from "./NewMeetingDialog";

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [newMeetingOpen, setNewMeetingOpen] = useState(false);

  const { data: meetings = [] } = useQuery<RecurringMeeting[]>({
    queryKey: ["meetings"],
    queryFn: () => fetch("/api/meetings").then((r) => r.json()),
  });

  const pinned = meetings.filter((m) => m.pinned);
  const unpinned = meetings.filter((m) => !m.pinned);

  return (
    <>
      <aside className="w-60 shrink-0 flex flex-col border-r border-border bg-card/50 backdrop-blur-sm h-screen">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center text-sm">
              🗓️
            </div>
            <span className="font-semibold text-sm tracking-tight">Meeting Notes</span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-3 py-3 space-y-0.5">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent text-sm transition-colors group"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left">Search</span>
            <kbd className="hidden group-hover:inline-flex items-center gap-0.5 text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono opacity-60">
              ⌘K
            </kbd>
          </button>

          <Link
            href="/"
            className={cn(
              "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
              pathname === "/"
                ? "text-foreground bg-accent"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
        </div>

        {/* Meetings list */}
        <div className="flex-1 overflow-y-auto px-3 pb-2">
          {pinned.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1">
                <Pin className="w-3 h-3 text-muted-foreground/50" />
                <span className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                  Pinned
                </span>
              </div>
              {pinned.map((m) => (
                <MeetingLink key={m.id} meeting={m} pathname={pathname} />
              ))}
            </div>
          )}

          {unpinned.length > 0 && (
            <div>
              <div className="px-2 py-1.5 mb-1">
                <span className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                  All Meetings
                </span>
              </div>
              {unpinned.map((m) => (
                <MeetingLink key={m.id} meeting={m} pathname={pathname} />
              ))}
            </div>
          )}

          <button
            onClick={() => setNewMeetingOpen(true)}
            className="mt-2 w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-muted-foreground/50 hover:text-muted-foreground text-sm transition-colors hover:bg-accent"
          >
            <Plus className="w-4 h-4" />
            New meeting
          </button>
        </div>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-border flex items-center justify-between">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </aside>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <NewMeetingDialog open={newMeetingOpen} onClose={() => setNewMeetingOpen(false)} />
    </>
  );
}

function MeetingLink({ meeting, pathname }: { meeting: RecurringMeeting; pathname: string }) {
  const colors = getColor(meeting.color);
  const isActive = pathname === `/meetings/${meeting.id}` || pathname.startsWith(`/meetings/${meeting.id}/`);
  const outstanding = meeting.outstandingActionItems ?? 0;

  return (
    <Link
      href={`/meetings/${meeting.id}`}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors group",
        isActive
          ? "text-foreground bg-accent"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      <span className="w-5 text-center shrink-0">{meeting.emoji ?? "📅"}</span>
      <span className="flex-1 truncate">{meeting.title}</span>
      {outstanding > 0 && (
        <span
          className={cn(
            "shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
            colors.bg,
            colors.text
          )}
        >
          {outstanding}
        </span>
      )}
    </Link>
  );
}
