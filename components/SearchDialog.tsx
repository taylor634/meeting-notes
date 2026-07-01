"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Search, FileText, CheckSquare, Hash } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) onClose();
        else document.dispatchEvent(new CustomEvent("open-search"));
      }
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const { data } = useQuery({
    queryKey: ["search", debouncedQ],
    queryFn: () =>
      debouncedQ.length >= 2
        ? fetch(`/api/search?q=${encodeURIComponent(debouncedQ)}`).then((r) => r.json())
        : Promise.resolve({ results: {} }),
    enabled: debouncedQ.length >= 2,
  });

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
      setQuery("");
    },
    [router, onClose]
  );

  if (!open) return null;

  const results = data?.results ?? {};
  const hasResults =
    (results.meetings?.length ?? 0) +
      (results.actionItems?.length ?? 0) +
      (results.occurrences?.length ?? 0) >
    0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-slide-in">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search meetings, notes, action items..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] font-mono text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto py-2">
          {!debouncedQ || debouncedQ.length < 2 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Type to search...
            </p>
          ) : !hasResults ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            <>
              {results.meetings?.length > 0 && (
                <ResultSection title="Meetings">
                  {results.meetings.map((m: { id: string; title: string; emoji: string | null }) => (
                    <ResultItem
                      key={m.id}
                      icon={<span>{m.emoji ?? "📅"}</span>}
                      title={m.title}
                      subtitle="Meeting"
                      onClick={() => navigate(`/meetings/${m.id}`)}
                    />
                  ))}
                </ResultSection>
              )}
              {results.occurrences?.length > 0 && (
                <ResultSection title="Notes">
                  {results.occurrences.map((o: { id: string; meeting: { id: string; title: string }; date: string }) => (
                    <ResultItem
                      key={o.id}
                      icon={<FileText className="w-4 h-4" />}
                      title={o.meeting.title}
                      subtitle={formatDate(o.date)}
                      onClick={() => navigate(`/meetings/${o.meeting.id}?occurrence=${o.id}`)}
                    />
                  ))}
                </ResultSection>
              )}
              {results.actionItems?.length > 0 && (
                <ResultSection title="Action Items">
                  {results.actionItems.map((ai: { id: string; text: string; occurrence: { meeting: { id: string; title: string } } }) => (
                    <ResultItem
                      key={ai.id}
                      icon={<CheckSquare className="w-4 h-4" />}
                      title={ai.text}
                      subtitle={ai.occurrence.meeting.title}
                      onClick={() => navigate(`/meetings/${ai.occurrence.meeting.id}`)}
                    />
                  ))}
                </ResultSection>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="px-4 py-1.5">
        <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function ResultItem({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-accent text-left transition-colors"
    >
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
    </button>
  );
}
