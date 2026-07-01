"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { CheckCircle2, AlertCircle, RefreshCw, Unlink, Calendar, Video, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  const { data: integrations = {}, isLoading } = useQuery<Record<string, { connected: boolean; scope?: string }>>({
    queryKey: ["integrations"],
    queryFn: () => fetch("/api/integrations").then((r) => r.json()),
  });

  // Show toast on OAuth redirect
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected === "google") toast.success("Google Calendar connected!");
    if (connected === "zoom") toast.success("Zoom connected!");
    if (error) toast.error("Connection failed. Please try again.");
  }, [searchParams]);

  async function disconnect(provider: string) {
    await fetch("/api/integrations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    qc.invalidateQueries({ queryKey: ["integrations"] });
    toast.success(`${provider === "google" ? "Google Calendar" : "Zoom"} disconnected`);
  }

  async function syncCalendar() {
    const res = await fetch("/api/calendar/sync", { method: "POST" });
    const data = await res.json();
    if (data.error) { toast.error(data.error); return; }
    qc.invalidateQueries({ queryKey: ["meetings"] });
    toast.success(`Synced — ${data.synced} meetings updated`);
  }

  const googleConnected = integrations["google"]?.connected;
  const zoomConnected = integrations["zoom"]?.connected;

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage integrations and preferences</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">Integrations</h2>

        {/* Google Calendar */}
        <IntegrationCard
          icon={<Calendar className="w-5 h-5 text-blue-500" />}
          title="Google Calendar"
          description="Automatically sync next meeting dates and extract Zoom links from your calendar events."
          connected={!!googleConnected}
          loading={isLoading}
          onConnect={() => window.location.href = "/api/auth/google"}
          onDisconnect={() => disconnect("google")}
          actions={googleConnected ? [
            { label: "Sync now", icon: <RefreshCw className="w-3.5 h-3.5" />, onClick: syncCalendar }
          ] : []}
        />

        {/* Zoom */}
        <IntegrationCard
          icon={<Video className="w-5 h-5 text-blue-400" />}
          title="Zoom"
          description="Import AI Companion meeting summaries, action items, and notes directly into your meeting occurrences."
          connected={!!zoomConnected}
          loading={isLoading}
          onConnect={() => window.location.href = "/api/auth/zoom"}
          onDisconnect={() => disconnect("zoom")}
        />
      </section>

      {/* How it works */}
      <section className="mt-10 p-5 bg-muted/30 rounded-xl border border-border space-y-3">
        <h3 className="text-sm font-semibold">How the integrations work</h3>
        <ol className="space-y-2.5 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-500 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <span><strong className="text-foreground">Connect Google Calendar</strong> — your recurring meeting next dates sync automatically. Zoom links are extracted from calendar events.</span>
          </li>
          <li className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-500 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <span><strong className="text-foreground">Connect Zoom</strong> — after a meeting ends, open its occurrence and click <em>Import from Zoom</em>. The AI Companion summary, topics, and next steps import automatically.</span>
          </li>
          <li className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-500 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <span><strong className="text-foreground">Unresolved items carry forward</strong> — when you start the next occurrence, everything unfinished rolls over automatically.</span>
          </li>
        </ol>
      </section>
    </div>
  );
}

// IntegrationCard
function IntegrationCard({
  icon, title, description, connected, loading, onConnect, onDisconnect, actions = [],
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  connected: boolean;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  actions?: { label: string; icon: React.ReactNode; onClick: () => void }[];
}) {
  const [syncing, setSyncing] = useState(false);

  return (
    <div className="flex items-start gap-4 p-5 bg-card border border-border rounded-xl">
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-medium text-sm">{title}</h3>
          {!loading && (
            connected
              ? <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium"><CheckCircle2 className="w-3.5 h-3.5" />Connected</span>
              : <span className="flex items-center gap-1 text-xs text-muted-foreground/50"><AlertCircle className="w-3.5 h-3.5" />Not connected</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>

        <div className="flex items-center gap-2 mt-3">
          {connected ? (
            <>
              {actions.map((a) => (
                <button
                  key={a.label}
                  onClick={async () => { setSyncing(true); await a.onClick(); setSyncing(false); }}
                  disabled={syncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
                >
                  <span className={cn(syncing && "animate-spin")}>{a.icon}</span>
                  {syncing ? "Syncing..." : a.label}
                </button>
              ))}
              <button
                onClick={onDisconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-lg hover:bg-accent hover:text-destructive transition-colors"
              >
                <Unlink className="w-3.5 h-3.5" />
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={onConnect}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-500 hover:bg-violet-400 text-white rounded-lg transition-colors font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Connect {title}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
