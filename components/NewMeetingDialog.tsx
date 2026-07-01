"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const COLORS = ["blue", "violet", "emerald", "amber", "rose", "sky", "orange", "pink"];
const EMOJIS = ["📅", "📱", "🎧", "👤", "💰", "🏢", "🚀", "⚡", "🎯", "💡", "🔧", "📊"];
const COLOR_CLASSES: Record<string, string> = {
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
};

interface NewMeetingDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewMeetingDialog({ open, onClose }: NewMeetingDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cadence, setCadence] = useState("weekly");
  const [color, setColor] = useState("violet");
  const [emoji, setEmoji] = useState("📅");
  const [participants, setParticipants] = useState("");
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();
  const router = useRouter();

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          cadence,
          color,
          emoji,
          participants: participants.split(",").map((p) => p.trim()).filter(Boolean),
        }),
      });
      const meeting = await res.json();
      qc.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting created");
      onClose();
      router.push(`/meetings/${meeting.id}`);
    } catch {
      toast.error("Failed to create meeting");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setTitle("");
    setDescription("");
    setCadence("weekly");
    setColor("violet");
    setEmoji("📅");
    setParticipants("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold">New recurring meeting</h2>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Emoji + Title */}
          <div className="flex gap-3">
            <div className="relative">
              <select
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="appearance-none w-12 h-10 bg-muted border border-border rounded-lg text-center text-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {EMOJIS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Meeting title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Cadence</label>
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="adhoc">Ad-hoc</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Color</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "w-5 h-5 rounded-full transition-transform",
                      COLOR_CLASSES[c],
                      color === c && "ring-2 ring-offset-2 ring-offset-card ring-white scale-110"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          <input
            type="text"
            placeholder="Participants (comma-separated)"
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || loading}
              className="flex-1 px-4 py-2 text-sm bg-violet-500 hover:bg-violet-400 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create meeting"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
