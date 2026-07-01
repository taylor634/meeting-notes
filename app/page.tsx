"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { CheckSquare, Calendar, Pin, PinOff, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn, formatDate, formatRelative, parseSummary, getColor, CADENCE_LABELS } from "@/lib/utils";
import type { RecurringMeeting } from "@/lib/types";
import { useState, useRef, useEffect } from "react";
import { NewMeetingDialog } from "@/components/NewMeetingDialog";
import { EditMeetingDialog } from "@/components/EditMeetingDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import toast from "react-hot-toast";

export default function Dashboard() {
  const qc = useQueryClient();
  const [newMeetingOpen, setNewMeetingOpen] = useState(false);

  const { data: meetings = [], isLoading } = useQuery<RecurringMeeting[]>({
    queryKey: ["meetings"],
    queryFn: () => fetch("/api/meetings").then((r) => r.json()),
  });

  async function togglePin(meeting: RecurringMeeting) {
    await fetch(`/api/meetings/${meeting.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !meeting.pinned }),
    });
    qc.invalidateQueries({ queryKey: ["meetings"] });
  }

  const [confirmDelete, setConfirmDelete] = useState<RecurringMeeting | null>(null);

  async function deleteMeeting(meeting: RecurringMeeting) {
    await fetch(`/api/meetings/${meeting.id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["meetings"] });
    toast.success("Meeting deleted");
    setConfirmDelete(null);
  }

  const pinned = meetings.filter((m) => m.pinned);
  const unpinned = meetings.filter((m) => !m.pinned);
  const totalOutstanding = meetings.reduce((s, m) => s + (m.outstandingActionItems ?? 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {meetings.length} recurring meetings
            {totalOutstanding > 0 && (
              <> · <span className="text-amber-500">{totalOutstanding} open action items</span></>
            )}
          </p>
        </div>
        <button
          onClick={() => setNewMeetingOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-violet-500 hover:bg-violet-400 text-white text-sm rounded-lg transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          New meeting
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-44 bg-card/50 border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <EmptyState onNew={() => setNewMeetingOpen(true)} />
      ) : (
        <div className="space-y-8">
          {pinned.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Pin className="w-3.5 h-3.5 text-muted-foreground/50" />
                <h2 className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">Pinned</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinned.map((m) => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    onTogglePin={() => togglePin(m)}
                    onDelete={() => setConfirmDelete(m)}
                  />
                ))}
              </div>
            </section>
          )}

          {unpinned.length > 0 && (
            <section>
              {pinned.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">All Meetings</h2>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unpinned.map((m) => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    onTogglePin={() => togglePin(m)}
                    onDelete={() => setConfirmDelete(m)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <NewMeetingDialog open={newMeetingOpen} onClose={() => setNewMeetingOpen(false)} />
      {confirmDelete && (
        <ConfirmDialog
          open={true}
          title={`Delete "${confirmDelete.title}"?`}
          description="This will permanently remove all meeting history, action items, and notes. This cannot be undone."
          confirmLabel="Delete meeting"
          onConfirm={() => deleteMeeting(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function MeetingCard({
  meeting,
  onTogglePin,
  onDelete,
}: {
  meeting: RecurringMeeting;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  const colors = getColor(meeting.color);
  const lastOcc = meeting.occurrences?.[0];
  const summary = parseSummary(lastOcc?.summary ?? null);
  const outstanding = meeting.outstandingActionItems ?? 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <div className="group relative flex flex-col bg-card border border-border rounded-xl p-4 hover:border-border/80 transition-all hover:shadow-lg hover:shadow-black/10 hover:-translate-y-0.5">
        {/* ··· menu */}
        <div ref={menuRef} className="absolute top-3 right-3 z-10">
          <button
            onClick={(e) => { e.preventDefault(); setMenuOpen((o) => !o); }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-accent transition-all text-muted-foreground/40 hover:text-muted-foreground"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 w-40 bg-card border border-border rounded-lg shadow-lg py-1 animate-fade-in">
              <button
                onClick={(e) => { e.preventDefault(); setMenuOpen(false); onTogglePin(); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left"
              >
                {meeting.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                {meeting.pinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={(e) => { e.preventDefault(); setMenuOpen(false); setEditOpen(true); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              <div className="my-1 border-t border-border" />
              <button
                onClick={(e) => { e.preventDefault(); setMenuOpen(false); onDelete(); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-destructive transition-colors text-left"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>

        <Link href={`/meetings/${meeting.id}`} className="flex-1 flex flex-col">
          <div className="flex items-start gap-3 mb-3">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0", colors.bg)}>
              {meeting.emoji ?? "📅"}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate pr-6">{meeting.title}</h3>
              <p className={cn("text-xs font-medium mt-0.5", colors.text)}>
                {CADENCE_LABELS[meeting.cadence] ?? meeting.cadence}
              </p>
            </div>
          </div>

          {summary.length > 0 ? (
            <div className="mb-3 space-y-1 flex-1">
              {summary.slice(0, 2).map((s, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className={cn("w-1 h-1 rounded-full mt-1.5 shrink-0", colors.dot)} />
                  <p className="text-xs text-muted-foreground line-clamp-1">{s}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1">
              {meeting.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{meeting.description}</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-auto">
            <div className="flex items-center gap-3">
              {outstanding > 0 && (
                <div className="flex items-center gap-1 text-xs text-amber-500">
                  <CheckSquare className="w-3 h-3" />
                  <span>{outstanding} open</span>
                </div>
              )}
              {meeting.nextDate && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(meeting.nextDate)}</span>
                </div>
              )}
            </div>
            {lastOcc && (
              <span className="text-[11px] text-muted-foreground/50">{formatRelative(lastOcc.updatedAt)}</span>
            )}
          </div>
        </Link>
      </div>

      <EditMeetingDialog meeting={meeting} open={editOpen} onClose={() => setEditOpen(false)} />
    </>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl mb-4">🗓️</div>
      <h3 className="font-semibold text-lg mb-2">No recurring meetings yet</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        Create your first meeting to start tracking context, action items, and decisions across every occurrence.
      </p>
      <button
        onClick={onNew}
        className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white text-sm rounded-lg transition-colors font-medium"
      >
        <Plus className="w-4 h-4" />
        Create your first meeting
      </button>
    </div>
  );
}
