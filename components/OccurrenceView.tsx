"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  CheckSquare2,
  Square,
  Plus,
  Trash2,
  HelpCircle,
  CheckCircle2,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  RotateCcw,
  Calendar,
  User,
} from "lucide-react";
import { cn, formatDate, parseSummary, getColor } from "@/lib/utils";
import type { MeetingOccurrence, RecurringMeeting, ActionItem, OpenQuestion, Decision } from "@/lib/types";
import toast from "react-hot-toast";

interface OccurrenceViewProps {
  occurrence: MeetingOccurrence;
  meeting: RecurringMeeting;
  onUpdate: () => void;
}

export function OccurrenceView({ occurrence, meeting, onUpdate }: OccurrenceViewProps) {
  const colors = getColor(meeting.color);
  const summary = parseSummary(occurrence.summary);
  const [notesValue, setNotesValue] = useState(occurrence.notes);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [saving, setSaving] = useState(false);
  const [summaryItems, setSummaryItems] = useState<string[]>(summary);
  const [editingDate, setEditingDate] = useState(false);

  // Sync notes when occurrence changes
  useEffect(() => {
    setNotesValue(occurrence.notes);
    setSummaryItems(parseSummary(occurrence.summary));
  }, [occurrence.id, occurrence.notes, occurrence.summary]);

  const autoSaveNotes = useCallback(
    (value: string) => {
      if (saveTimeout) clearTimeout(saveTimeout);
      const t = setTimeout(async () => {
        setSaving(true);
        await fetch(`/api/occurrences/${occurrence.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: value }),
        });
        setSaving(false);
      }, 800);
      setSaveTimeout(t);
    },
    [occurrence.id, saveTimeout]
  );

  async function saveSummary(items: string[]) {
    await fetch(`/api/occurrences/${occurrence.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: items }),
    });
    onUpdate();
  }

  async function markComplete() {
    await fetch(`/api/occurrences/${occurrence.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    toast.success("Meeting marked complete");
    onUpdate();
  }

  const rolledItems = (occurrence.actionItems ?? []).filter((a) => a.rolledFromId);
  const newItems = (occurrence.actionItems ?? []).filter((a) => !a.rolledFromId);

  return (
    <div className="max-w-3xl mx-auto px-8 py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md", colors.bg, colors.text)}>
              {formatDate(occurrence.date)}
            </span>
            {occurrence.status === "completed" && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400">
                Completed
              </span>
            )}
            {occurrence.status === "draft" && (
              <span className="text-xs text-muted-foreground/50">Draft</span>
            )}
          </div>
          <h2 className="text-xl font-semibold">
            {meeting.title}
          </h2>
        </div>

        {occurrence.status !== "completed" && (
          <button
            onClick={markComplete}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400 rounded-lg transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark complete
          </button>
        )}
      </div>

      {/* Summary */}
      <SummarySection
        items={summaryItems}
        colors={colors}
        onChange={(items) => {
          setSummaryItems(items);
          saveSummary(items);
        }}
      />

      {/* Carried forward banner */}
      {rolledItems.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15 text-xs text-amber-400/80">
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>{rolledItems.length} item{rolledItems.length !== 1 ? "s" : ""}</strong> carried forward from last meeting
          </span>
        </div>
      )}

      {/* Action Items */}
      <ActionItemsSection
        occurrence={occurrence}
        meeting={meeting}
        onUpdate={onUpdate}
      />

      {/* Open Questions */}
      <OpenQuestionsSection
        occurrence={occurrence}
        onUpdate={onUpdate}
      />

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Notes */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-muted-foreground" />
            Meeting Notes
          </h3>
          {saving && (
            <span className="text-xs text-muted-foreground/50 animate-pulse">Saving…</span>
          )}
        </div>
        <textarea
          value={notesValue}
          onChange={(e) => {
            setNotesValue(e.target.value);
            autoSaveNotes(e.target.value);
          }}
          placeholder="Write your meeting notes here… Supports markdown formatting.

## Agenda
-

## Discussion

## Key points
"
          className="w-full min-h-[320px] bg-transparent resize-none text-sm text-foreground leading-relaxed focus:outline-none placeholder:text-muted-foreground/40 font-mono"
          spellCheck={false}
        />
      </section>

      {/* Decisions */}
      <DecisionsSection occurrence={occurrence} onUpdate={onUpdate} />
    </div>
  );
}

// ── Summary ──────────────────────────────────────────────────────────────────

function SummarySection({
  items,
  colors,
  onChange,
}: {
  items: string[];
  colors: ReturnType<typeof getColor>;
  onChange: (items: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [newItem, setNewItem] = useState("");

  function addItem() {
    if (!newItem.trim()) return;
    onChange([...items, newItem.trim()]);
    setNewItem("");
  }

  function removeItem(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  if (!editing && items.length === 0) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full text-left px-3 py-2.5 border border-dashed border-border rounded-lg text-xs text-muted-foreground/40 hover:text-muted-foreground/70 hover:border-muted-foreground/30 transition-colors"
      >
        + Add meeting summary bullets
      </button>
    );
  }

  return (
    <div className={cn("rounded-xl border p-4", colors.border, colors.bg)}>
      <div className="flex items-center justify-between mb-2.5">
        <span className={cn("text-xs font-semibold uppercase tracking-wider", colors.text)}>
          Summary
        </span>
        <button
          onClick={() => setEditing(!editing)}
          className={cn("text-xs", colors.text, "opacity-60 hover:opacity-100")}
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 group">
            <span className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", colors.dot)} />
            <span className="text-sm flex-1">{item}</span>
            {editing && (
              <button
                onClick={() => removeItem(i)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {editing && (
        <div className="flex gap-2 mt-3">
          <input
            autoFocus
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addItem();
              if (e.key === "Escape") setEditing(false);
            }}
            placeholder="Add bullet point…"
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/40"
          />
          <button
            onClick={addItem}
            className={cn("text-xs font-medium", colors.text)}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

// ── Action Items ──────────────────────────────────────────────────────────────

function ActionItemsSection({
  occurrence,
  meeting,
  onUpdate,
}: {
  occurrence: MeetingOccurrence;
  meeting: RecurringMeeting;
  onUpdate: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [expanded, setExpanded] = useState(true);
  const items = occurrence.actionItems ?? [];
  const open = items.filter((a) => !a.completed);
  const done = items.filter((a) => a.completed);

  async function toggle(item: ActionItem) {
    await fetch(`/api/action-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !item.completed }),
    });
    onUpdate();
  }

  async function deleteItem(id: string) {
    await fetch(`/api/action-items/${id}`, { method: "DELETE" });
    onUpdate();
  }

  async function addItem() {
    if (!newText.trim()) return;
    await fetch("/api/action-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        occurrenceId: occurrence.id,
        meetingId: meeting.id,
        text: newText.trim(),
        owner: newOwner.trim() || null,
      }),
    });
    setNewText("");
    setNewOwner("");
    setAdding(false);
    onUpdate();
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-semibold hover:text-foreground/80 transition-colors"
        >
          <CheckSquare2 className="w-4 h-4 text-muted-foreground" />
          Action Items
          {open.length > 0 && (
            <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-md">
              {open.length} open
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {expanded && (
        <div className="space-y-1">
          {items.length === 0 && !adding && (
            <p className="text-xs text-muted-foreground/40 py-2">No action items yet</p>
          )}

          {/* Open items */}
          {open.map((item) => (
            <ActionItemRow
              key={item.id}
              item={item}
              onToggle={() => toggle(item)}
              onDelete={() => deleteItem(item.id)}
            />
          ))}

          {/* Completed items */}
          {done.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] text-muted-foreground/40 mb-1 uppercase tracking-wider">
                Completed ({done.length})
              </p>
              {done.map((item) => (
                <ActionItemRow
                  key={item.id}
                  item={item}
                  onToggle={() => toggle(item)}
                  onDelete={() => deleteItem(item.id)}
                />
              ))}
            </div>
          )}

          {/* Add form */}
          {adding && (
            <div className="flex gap-2 mt-2 p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex-1 space-y-2">
                <input
                  autoFocus
                  type="text"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addItem();
                    if (e.key === "Escape") setAdding(false);
                  }}
                  placeholder="Action item description…"
                  className="w-full bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/40"
                />
                <input
                  type="text"
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  placeholder="Owner (optional)"
                  className="w-full bg-transparent text-xs text-muted-foreground focus:outline-none placeholder:text-muted-foreground/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={addItem}
                  className="px-2.5 py-1 bg-violet-500 hover:bg-violet-400 text-white text-xs rounded-md transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setAdding(false)}
                  className="px-2.5 py-1 text-muted-foreground hover:text-foreground text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ActionItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: ActionItem;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-accent/50 group transition-colors">
      <button
        onClick={onToggle}
        className={cn(
          "mt-0.5 shrink-0 transition-colors",
          item.completed ? "text-emerald-400" : "text-muted-foreground/30 hover:text-muted-foreground"
        )}
      >
        {item.completed ? (
          <CheckSquare2 className="w-4 h-4" />
        ) : (
          <Square className="w-4 h-4" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm",
            item.completed && "line-through text-muted-foreground/50"
          )}
        >
          {item.text}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          {item.owner && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground/50">
              <User className="w-3 h-3" />
              {item.owner}
            </span>
          )}
          {item.dueDate && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground/50">
              <Calendar className="w-3 h-3" />
              {formatDate(item.dueDate)}
            </span>
          )}
          {item.rolledFromId && (
            <span className="text-xs text-amber-400/60 font-medium">↑ carried forward</span>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground/30 hover:text-destructive transition-all rounded-md hover:bg-destructive/10"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Open Questions ────────────────────────────────────────────────────────────

function OpenQuestionsSection({
  occurrence,
  onUpdate,
}: {
  occurrence: MeetingOccurrence;
  onUpdate: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const questions = occurrence.questions ?? [];
  const open = questions.filter((q) => !q.resolved);
  const resolved = questions.filter((q) => q.resolved);

  async function addQuestion() {
    if (!newText.trim()) return;
    await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ occurrenceId: occurrence.id, text: newText.trim() }),
    });
    setNewText("");
    setAdding(false);
    onUpdate();
  }

  async function toggleResolve(q: OpenQuestion) {
    await fetch(`/api/questions/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: !q.resolved }),
    });
    onUpdate();
  }

  async function deleteQuestion(id: string) {
    await fetch(`/api/questions/${id}`, { method: "DELETE" });
    onUpdate();
  }

  if (questions.length === 0 && !adding) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
          Open Questions
          {open.length > 0 && (
            <span className="text-xs text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded-md">
              {open.length}
            </span>
          )}
        </h3>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      <div className="space-y-1">
        {open.map((q) => (
          <QuestionRow
            key={q.id}
            question={q}
            onToggle={() => toggleResolve(q)}
            onDelete={() => deleteQuestion(q.id)}
          />
        ))}
        {resolved.length > 0 && (
          <div className="mt-2">
            <p className="text-[11px] text-muted-foreground/40 mb-1 uppercase tracking-wider">
              Resolved ({resolved.length})
            </p>
            {resolved.map((q) => (
              <QuestionRow
                key={q.id}
                question={q}
                onToggle={() => toggleResolve(q)}
                onDelete={() => deleteQuestion(q.id)}
              />
            ))}
          </div>
        )}
        {adding && (
          <div className="flex gap-2 mt-2 p-3 bg-muted/30 rounded-lg border border-border">
            <input
              autoFocus
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addQuestion();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="What needs to be discussed or resolved?"
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/40"
            />
            <button
              onClick={addQuestion}
              className="px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-white text-xs rounded-md"
            >
              Add
            </button>
            <button
              onClick={() => setAdding(false)}
              className="text-xs text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function QuestionRow({
  question,
  onToggle,
  onDelete,
}: {
  question: OpenQuestion;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-accent/50 group transition-colors">
      <button onClick={onToggle} className="mt-0.5 shrink-0">
        {question.resolved ? (
          <CheckCircle2 className="w-4 h-4 text-sky-400" />
        ) : (
          <HelpCircle className="w-4 h-4 text-muted-foreground/30 hover:text-muted-foreground" />
        )}
      </button>
      <p
        className={cn(
          "text-sm flex-1",
          question.resolved && "line-through text-muted-foreground/50"
        )}
      >
        {question.text}
      </p>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground/30 hover:text-destructive transition-all rounded-md hover:bg-destructive/10"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Decisions ─────────────────────────────────────────────────────────────────

function DecisionsSection({
  occurrence,
  onUpdate,
}: {
  occurrence: MeetingOccurrence;
  onUpdate: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const decisions = occurrence.decisions ?? [];

  async function addDecision() {
    if (!newText.trim()) return;
    await fetch("/api/decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ occurrenceId: occurrence.id, text: newText.trim() }),
    });
    setNewText("");
    setAdding(false);
    onUpdate();
  }

  async function deleteDecision(id: string) {
    await fetch(`/api/decisions/${id}`, { method: "DELETE" });
    onUpdate();
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Lightbulb className="w-4 h-4 text-muted-foreground" />
          Decisions Made
          {decisions.length > 0 && (
            <span className="text-xs text-muted-foreground/50">
              {decisions.length}
            </span>
          )}
        </h3>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      <div className="space-y-1">
        {decisions.length === 0 && !adding && (
          <p className="text-xs text-muted-foreground/40 py-1">No decisions recorded</p>
        )}
        {decisions.map((d) => (
          <div
            key={d.id}
            className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-accent/50 group transition-colors"
          >
            <Lightbulb className="w-4 h-4 text-amber-400/50 mt-0.5 shrink-0" />
            <p className="text-sm flex-1">{d.text}</p>
            <button
              onClick={() => deleteDecision(d.id)}
              className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground/30 hover:text-destructive transition-all rounded-md hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {adding && (
          <div className="flex gap-2 mt-2 p-3 bg-muted/30 rounded-lg border border-border">
            <input
              autoFocus
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addDecision();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="What was decided?"
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/40"
            />
            <button
              onClick={addDecision}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-white text-xs rounded-md"
            >
              Add
            </button>
            <button
              onClick={() => setAdding(false)}
              className="text-xs text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
