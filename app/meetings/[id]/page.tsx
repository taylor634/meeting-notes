"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { use, useState, useEffect } from "react";
import {
  Plus,
  ChevronLeft,
  Clock,
  Users,
  Pin,
  PinOff,
  MoreHorizontal,
  CheckSquare2,
  HelpCircle,
  Lightbulb,
  ArrowUpRight,
} from "lucide-react";
import { cn, formatDate, formatShortDate, parseSummary, getColor, CADENCE_LABELS } from "@/lib/utils";
import type { RecurringMeeting, MeetingOccurrence } from "@/lib/types";
import { OccurrenceView } from "@/components/OccurrenceView";
import { NewOccurrenceDialog } from "@/components/NewOccurrenceDialog";
import Link from "next/link";
import toast from "react-hot-toast";

export default function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const router = useRouter();
  const [newOccurrenceOpen, setNewOccurrenceOpen] = useState(false);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null);

  const { data: meeting, isLoading } = useQuery<RecurringMeeting>({
    queryKey: ["meeting", id],
    queryFn: () => fetch(`/api/meetings/${id}`).then((r) => r.json()),
  });

  // Select occurrence from URL param or default to latest
  useEffect(() => {
    if (!meeting?.occurrences?.length) return;
    const urlOcc = searchParams.get("occurrence");
    if (urlOcc && meeting.occurrences.find((o) => o.id === urlOcc)) {
      setSelectedOccurrenceId(urlOcc);
    } else if (!selectedOccurrenceId) {
      setSelectedOccurrenceId(meeting.occurrences[0]?.id ?? null);
    }
  }, [meeting, searchParams, selectedOccurrenceId]);

  const selectedOccurrence = meeting?.occurrences?.find((o) => o.id === selectedOccurrenceId);

  async function togglePin() {
    if (!meeting) return;
    await fetch(`/api/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !meeting.pinned }),
    });
    qc.invalidateQueries({ queryKey: ["meeting", id] });
    qc.invalidateQueries({ queryKey: ["meetings"] });
    toast.success(meeting.pinned ? "Unpinned" : "Pinned");
  }

  if (isLoading) return <MeetingPageSkeleton />;
  if (!meeting) return <div className="p-8 text-muted-foreground">Meeting not found</div>;

  const colors = getColor(meeting.color);
  const participants = JSON.parse(meeting.participants || "[]") as string[];
  const sortedOccurrences = meeting.occurrences ?? [];
  const outstanding = sortedOccurrences
    .flatMap((o) => o.actionItems ?? [])
    .filter((a) => !a.completed).length;

  return (
    <div className="flex h-screen">
      {/* Timeline sidebar */}
      <div className="w-64 shrink-0 border-r border-border flex flex-col h-full">
        {/* Meeting header */}
        <div className="px-4 py-4 border-b border-border">
          <Link href="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3 w-fit">
            <ChevronLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <div className="flex items-start gap-2">
            <span className="text-2xl">{meeting.emoji ?? "📅"}</span>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-sm leading-tight">{meeting.title}</h1>
              <p className={cn("text-xs mt-0.5 font-medium", colors.text)}>
                {CADENCE_LABELS[meeting.cadence]}
              </p>
            </div>
            <button
              onClick={togglePin}
              className="p-1 rounded-md hover:bg-accent transition-colors text-muted-foreground/40 hover:text-muted-foreground shrink-0"
            >
              {meeting.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
          </div>

          {participants.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5">
              <Users className="w-3 h-3 text-muted-foreground/50 shrink-0" />
              <p className="text-xs text-muted-foreground/70 truncate">
                {participants.join(", ")}
              </p>
            </div>
          )}

          {outstanding > 0 && (
            <div className={cn("mt-2.5 flex items-center gap-1.5 text-xs px-2 py-1 rounded-md", colors.bg)}>
              <CheckSquare2 className={cn("w-3 h-3", colors.text)} />
              <span className={cn("font-medium", colors.text)}>
                {outstanding} open action item{outstanding !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                Timeline
              </span>
              <span className="text-[11px] text-muted-foreground/50">
                {sortedOccurrences.length}
              </span>
            </div>

            {sortedOccurrences.length === 0 ? (
              <p className="text-xs text-muted-foreground/50 text-center py-4">
                No meetings yet
              </p>
            ) : (
              <div className="space-y-1 relative">
                {/* Timeline line */}
                {sortedOccurrences.length > 1 && (
                  <div className="absolute left-[11px] top-4 bottom-4 w-px bg-border" />
                )}
                {sortedOccurrences.map((occ, idx) => {
                  const isSelected = occ.id === selectedOccurrenceId;
                  const occActions = (occ.actionItems ?? []).filter((a) => !a.completed).length;
                  return (
                    <button
                      key={occ.id}
                      onClick={() => setSelectedOccurrenceId(occ.id)}
                      className={cn(
                        "w-full flex items-start gap-2.5 px-2 py-2 rounded-lg transition-colors text-left group relative",
                        isSelected ? "bg-accent" : "hover:bg-accent/50"
                      )}
                    >
                      <div
                        className={cn(
                          "w-[9px] h-[9px] rounded-full shrink-0 mt-1 border-2 z-10",
                          isSelected
                            ? `${colors.dot} border-transparent`
                            : "bg-background border-muted-foreground/30 group-hover:border-muted-foreground/50"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-xs font-medium",
                            isSelected ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {formatDate(occ.date)}
                        </p>
                        {occ.status === "completed" && occActions > 0 && (
                          <p className="text-[11px] text-amber-400 mt-0.5">
                            {occActions} open
                          </p>
                        )}
                        {idx === 0 && (
                          <span className={cn("text-[10px] font-medium", colors.text)}>Latest</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* New occurrence button */}
        <div className="px-4 py-3 border-t border-border">
          <button
            onClick={() => setNewOccurrenceOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-sm rounded-lg transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            New occurrence
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {selectedOccurrence ? (
          <OccurrenceView
            occurrence={selectedOccurrence}
            meeting={meeting}
            onUpdate={() => qc.invalidateQueries({ queryKey: ["meeting", id] })}
          />
        ) : (
          <EmptyOccurrenceState
            meetingTitle={meeting.title}
            onNew={() => setNewOccurrenceOpen(true)}
          />
        )}
      </div>

      <NewOccurrenceDialog
        meetingId={id}
        open={newOccurrenceOpen}
        onClose={() => setNewOccurrenceOpen(false)}
        onCreated={(occId) => {
          qc.invalidateQueries({ queryKey: ["meeting", id] });
          setSelectedOccurrenceId(occId);
        }}
      />
    </div>
  );
}

function EmptyOccurrenceState({
  meetingTitle,
  onNew,
}: {
  meetingTitle: string;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-2xl mb-4">
        🗓️
      </div>
      <h3 className="font-semibold mb-2">No meetings recorded yet</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        Start recording meetings for <strong>{meetingTitle}</strong>. The app will automatically carry forward unresolved action items and questions.
      </p>
      <button
        onClick={onNew}
        className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white text-sm rounded-lg transition-colors font-medium"
      >
        <Plus className="w-4 h-4" />
        Record first meeting
      </button>
    </div>
  );
}

function MeetingPageSkeleton() {
  return (
    <div className="flex h-screen">
      <div className="w-64 border-r border-border p-4">
        <div className="h-4 w-20 bg-muted rounded animate-pulse mb-4" />
        <div className="h-6 w-full bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
      </div>
      <div className="flex-1 p-8">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="h-32 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}
