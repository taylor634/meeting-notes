"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Search, Plus, Settings, Moon, Sun, Pin, MoreHorizontal, Pencil, Trash2, PinOff } from "lucide-react";
import { useTheme } from "next-themes";
import { cn, getColor } from "@/lib/utils";
import type { RecurringMeeting } from "@/lib/types";
import { SearchDialog } from "./SearchDialog";
import { useState, useRef, useEffect } from "react";
import { NewMeetingDialog } from "./NewMeetingDialog";
import { EditMeetingDialog } from "./EditMeetingDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import toast from "react-hot-toast";

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [newMeetingOpen, setNewMeetingOpen] = useState(false);
  const qc = useQueryClient();

  const { data: meetings = [] } = useQuery<RecurringMeeting[]>({
    queryKey: ["meetings"],
    queryFn: () => fetch("/api/meetings").then((r) => r.json()),
  });

  const pinned = meetings.filter((m) => m.pinned);
  const unpinned = meetings.filter((m) => !m.pinned);

  return (
    <>
      <aside className="w-60 shrink-0 flex flex-col border-r border-border bg-card/50 backdrop-blur-sm h-screen">
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center text-sm">🗓️</div>
            <span className="font-semibold text-sm tracking-tight">Meeting Notes</span>
          </div>
        </div>

        <div className="px-3 py-3 space-y-0.5">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent text-sm transition-colors group"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left">Search</span>
            <kbd className="hidden group-hover:inline-flex items-center gap-0.5 text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono opacity-60">⌘K</kbd>
          </button>

          <Link
            href="/"
            className={cn(
              "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
              pathname === "/" ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-2">
          {pinned.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1">
                <Pin className="w-3 h-3 text-muted-foreground/50" />
                <span className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wider">Pinned</span>
              </div>
              {pinned.map((m) => (
                <MeetingLink key={m.id} meeting={m} pathname={pathname} />
              ))}
            </div>
          )}

          {unpinned.length > 0 && (
            <div>
              <div className="px-2 py-1.5 mb-1">
                <span className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wider">All Meetings</span>
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

        <div className="px-3 py-3 border-t border-border flex items-center justify-between">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link href="/settings" className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Settings className="w-4 h-4" />
          </Link>
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function togglePin() {
    await fetch(`/api/meetings/${meeting.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !meeting.pinned }),
    });
    qc.invalidateQueries({ queryKey: ["meetings"] });
  }

  async function deleteMeeting() {
    await fetch(`/api/meetings/${meeting.id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["meetings"] });
    toast.success("Meeting deleted");
    setConfirmDelete(false);
    if (pathname.startsWith(`/meetings/${meeting.id}`)) router.push("/");
  }

  return (
    <>
      <div className={cn("group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors relative", isActive ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
        <Link href={`/meetings/${meeting.id}`} className="flex items-center gap-2 flex-1 min-w-0">
          <span className="w-5 text-center shrink-0">{meeting.emoji ?? "📅"}</span>
          <span className="flex-1 truncate">{meeting.title}</span>
        </Link>

        {/* Either badge or menu button */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="hidden group-hover:flex items-center justify-center w-5 h-5 rounded hover:bg-border transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {!menuOpen && outstanding > 0 && (
            <span className={cn("group-hover:hidden text-[10px] font-medium px-1.5 py-0.5 rounded-full", colors.bg, colors.text)}>
              {outstanding}
            </span>
          )}

          {menuOpen && (
            <div className="absolute left-0 top-6 w-40 bg-card border border-border rounded-lg shadow-lg py-1 z-50 animate-fade-in">
              <button
                onClick={() => { setMenuOpen(false); togglePin(); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left text-foreground"
              >
                {meeting.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                {meeting.pinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={() => { setMenuOpen(false); setEditOpen(true); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left text-foreground"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-destructive transition-colors text-left"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <EditMeetingDialog meeting={meeting} open={editOpen} onClose={() => setEditOpen(false)} />
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete "${meeting.title}"?`}
        description="This will permanently remove all meeting history, action items, and notes. This cannot be undone."
        confirmLabel="Delete meeting"
        onConfirm={deleteMeeting}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
