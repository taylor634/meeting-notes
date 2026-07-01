"use client";

import { useState } from "react";
import { X, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface NewOccurrenceDialogProps {
  meetingId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (occurrenceId: string) => void;
}

export function NewOccurrenceDialog({ meetingId, open, onClose, onCreated }: NewOccurrenceDialogProps) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/occurrences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, date }),
      });
      const occ = await res.json();
      toast.success("New occurrence created — open items carried forward");
      onCreated(occ.id);
      onClose();
    } catch {
      toast.error("Failed to create occurrence");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-sm">New meeting occurrence</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Open action items & questions will be carried forward automatically.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-3">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Meeting date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/15 rounded-lg">
            <RotateCcw className="w-3.5 h-3.5 text-amber-400/70 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-400/70">
              Unfinished action items and unresolved questions from the last meeting will automatically roll into this one.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm bg-violet-500 hover:bg-violet-400 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create occurrence"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
