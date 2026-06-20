import React, { useState, useEffect, useRef } from "react";
import { Task, TaskStage, ActivityChange } from "../types";
import D3BottleneckChart from "./D3BottleneckChart";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, CheckCircle, CloudLightning, Database, LineChart, Slack,
  Download, Upload, Loader2, CheckCheck, AlertCircle, Send, Trash2,
  ExternalLink, Info, Eye, EyeOff, ToggleLeft, ToggleRight, FileText,
  RefreshCw,
} from "lucide-react";

interface DashboardProps {
  tasks: Task[];
  activities: ActivityChange[];
  onTasksImported: () => Promise<void>;
  currentRole: string;
}

// ─── Slack Setup Panel ───────────────────────────────────────────────────────

function SlackPanel() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [memberId, setMemberId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | ""; msg: string }>({ type: "", msg: "" });

  const [botToken, setBotToken] = useState("");
  const [hasBotToken, setHasBotToken] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const d = await res.json();
        setWebhookUrl(d.slackWebhookUrl || "");
        setEnabled(d.slackEnabled || false);
        setMemberId(d.slackMemberId || "");
        setLogs(d.lastSlackLogs || []);
        setHasBotToken(d.hasBotToken || false);
      }
    } finally { setLoading(false); }
  }

  async function saveSettings(overrides?: any) {
    setSaving(true);
    clearStatus();
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slackWebhookUrl: overrides?.webhookUrl ?? webhookUrl,
          slackEnabled: overrides?.enabled ?? enabled,
          slackMemberId: overrides?.memberId ?? memberId,
          slackBotToken: overrides?.botToken ?? botToken,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setWebhookUrl(d.slackWebhookUrl || "");
        setEnabled(d.slackEnabled || false);
        setMemberId(d.slackMemberId || "");
        setHasBotToken(d.hasBotToken || false);
        setBotToken(""); // clear after save
        setLogs(d.lastSlackLogs || []);
        showStatus("success", "Settings saved successfully.");
      } else {
        showStatus("error", "Failed to save settings.");
      }
    } finally { setSaving(false); }
  }

  async function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    await saveSettings({ enabled: next });
  }

  async function sendTest() {
    setTesting(true);
    clearStatus();
    try {
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: "test", taskTitle: "Test Campaign",
          clientName: "Test Client", userName: "Dashboard",
          userRole: "Dashboard", action: "message",
          details: "✅ Slack webhook test — pipeline is connected and live!",
        }),
      });
      await loadSettings();
      showStatus("success", "Test notification sent! Check your Slack channel.");
    } catch {
      showStatus("error", "Test failed. Check your webhook URL.");
    } finally { setTesting(false); }
  }

  async function clearLogs() {
    await fetch("/api/settings/clear-logs", { method: "POST" });
    setLogs([]);
  }

  function showStatus(type: "success" | "error", msg: string) {
    setStatus({ type, msg });
    setTimeout(() => setStatus({ type: "", msg: "" }), 4000);
  }
  function clearStatus() { setStatus({ type: "", msg: "" }); }

  const hasWebhook = webhookUrl.trim().length > 0;
  const isConnected = hasWebhook && enabled;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl ${isConnected ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-slate-800 border border-slate-700"}`}>
            <Slack className={`h-4 w-4 ${isConnected ? "text-emerald-400" : "text-slate-400"}`} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Slack Notifications</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isConnected ? "Connected — alerts fire on every stage change" : "Not connected"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
          <span className="text-[11px] font-mono text-slate-400">{isConnected ? "Live" : "Off"}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Step 1: Webhook URL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span className="bg-indigo-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">1</span>
                Incoming Webhook URL
              </label>
              <a
                href="https://api.slack.com/messaging/webhooks"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                How to get one <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showWebhook ? "text" : "password"}
                  placeholder="https://hooks.slack.com/services/T.../B.../..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowWebhook(!showWebhook)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showWebhook ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <button
                onClick={() => saveSettings({ webhookUrl, enabled: webhookUrl ? true : enabled })}
                disabled={saving}
                className="px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                Save
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              In Slack: <strong className="text-slate-400">App Directory → Incoming Webhooks → Add → Copy URL</strong>
            </p>
          </div>

          {/* Step 2: Member ID */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span className="bg-slate-700 text-slate-300 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">2</span>
              Your Slack Member ID
              <span className="text-[10px] text-slate-500 font-normal">(optional — to get @mentioned)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="U1234ABCDE  (Profile → ⋯ → Copy member ID)"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                onClick={() => saveSettings({ memberId })}
                disabled={saving}
                className="px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-700 whitespace-nowrap"
              >
                Save
              </button>
            </div>
          </div>

          {/* Step 2b: Bot Token (for DMs) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span className="bg-slate-700 text-slate-300 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">2b</span>
              Slack Bot Token
              <span className="text-[10px] text-slate-500 font-normal">(optional — enables DMs to assigned staff)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder={hasBotToken ? "••••••••• (saved)" : "xoxb-your-bot-token"}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                onClick={() => saveSettings({ botToken })}
                disabled={saving || !botToken}
                className="px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-700 whitespace-nowrap"
              >
                Save
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              Create a Slack App → add <strong className="text-slate-400">chat:write</strong> + <strong className="text-slate-400">im:write</strong> scopes → install to workspace → copy Bot Token.
              Each team member also needs their <strong className="text-slate-400">Slack Member ID</strong> saved in Settings → Team.
            </p>
            {hasBotToken && (
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                <CheckCircle className="h-3 w-3" /> Bot token saved — DMs will be sent to assigned staff on stage changes
              </div>
            )}
          </div>

          {/* Step 3: Enable toggle */}
          <div className="flex items-center justify-between bg-slate-950 rounded-xl p-3 border border-slate-800">
            <div>
              <p className="text-xs font-semibold text-slate-200">Enable Slack Alerts</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Fire webhooks on every campaign stage change</p>
            </div>
            <button
              onClick={toggleEnabled}
              disabled={!hasWebhook || saving}
              title={!hasWebhook ? "Add a webhook URL first" : ""}
              className={`cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {enabled
                ? <ToggleRight className="h-7 w-7 text-emerald-400" />
                : <ToggleLeft className="h-7 w-7 text-slate-500" />}
            </button>
          </div>

          {/* Test & status */}
          <div className="flex gap-2.5">
            <button
              onClick={sendTest}
              disabled={!hasWebhook || testing}
              className="flex-1 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-300 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send Test Message
            </button>
            {logs.length > 0 && (
              <button
                onClick={clearLogs}
                className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/15 text-rose-400 rounded-xl text-[10px] font-semibold cursor-pointer transition-colors flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" /> Clear Logs
              </button>
            )}
          </div>

          {status.msg && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
              status.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/20 text-rose-300"
            }`}>
              {status.type === "success" ? <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />}
              {status.msg}
            </div>
          )}

          {/* Recent logs */}
          {logs.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recent Dispatches</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {logs.slice(0, 8).map((log) => (
                  <div key={log.id} className="flex items-center gap-2 bg-slate-950 rounded-lg px-2.5 py-1.5 border border-slate-900">
                    <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${log.success ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <span className="text-[10px] text-slate-300 flex-1 truncate font-mono">{log.message}</span>
                    <span className="text-[9px] text-slate-500 flex-shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Data Export Panel ───────────────────────────────────────────────────────

function DataPanel({ tasks, activities, onTasksImported }: {
  tasks: Task[];
  activities: ActivityChange[];
  onTasksImported: () => Promise<void>;
}) {
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | ""; msg: string }>({ type: "", msg: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  function exportCSV() {
    window.open("/api/export/csv", "_blank");
  }

  function exportActivities() {
    window.open("/api/export/activities-csv", "_blank");
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ tasks, activities }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pipeline-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(Boolean);
      if (lines.length < 2) throw new Error("CSV is empty");

      const parsed = lines.slice(1).map((line, idx) => {
        const cols = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"'));
        return {
          id: cols[0] || `task-import-${idx}-${Date.now()}`,
          clientName: cols[1] || "Unknown",
          title: cols[2] || "Untitled",
          format: (cols[3] as any) || "Video",
          stage: (cols[4] as any) || "planning",
          createdAt: cols[5] || new Date().toISOString(),
          assignedEditor: cols[6] || "",
          assignedWriter: cols[7] || "",
          captionText: cols[8] || "",
          hashtags: cols[9] || "",
          publishedPlatform: cols[10] || "",
          publishedLink: cols[11] || "",
          publisherNotes: cols[12] || "",
          updatedAt: new Date().toISOString(),
          description: "",
        };
      });

      if (!window.confirm(`Import ${parsed.length} campaigns? This will replace your current data.`)) return;

      const res = await fetch("/api/tasks/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: parsed }),
      });

      if (!res.ok) throw new Error("Import failed");
      await onTasksImported();
      setStatus({ type: "success", msg: `Imported ${parsed.length} campaigns successfully.` });
    } catch (err: any) {
      setStatus({ type: "error", msg: err.message || "Import failed" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
    setTimeout(() => setStatus({ type: "", msg: "" }), 5000);
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-teal-500/10 border border-teal-500/20 rounded-xl">
          <Database className="h-4 w-4 text-teal-400" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">Data & Logs</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Export campaigns & activity logs, import from CSV</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => window.open("/api/export/xlsx", "_blank")}
          className="col-span-2 flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Export Full Report (.xlsx — 7 sheets)
        </button>
        <button
          onClick={() => window.open("/api/export/csv", "_blank")}
          className="flex items-center gap-2 px-3 py-2.5 bg-teal-600/10 hover:bg-teal-600/20 border border-teal-500/20 text-teal-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV (simple)
        </button>
        <button
          onClick={() => window.open("/api/export/activities-csv", "_blank")}
          className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          Export Activity Log
        </button>
        <button
          onClick={exportJSON}
          className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Backup as JSON
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-2 px-3 py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
        >
          {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Import from CSV
        </button>
      </div>

      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={importCSV} />

      <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-1.5">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">CSV Column Format</p>
        <div className="grid grid-cols-3 gap-1 text-[9px] font-mono text-slate-500">
          {["A: Campaign ID", "B: Client Name", "C: Title", "D: Format", "E: Stage", "F: Created", "G: Editor", "H: Writer", "I: Caption", "J: Hashtags", "K: Platform", "L: Link"].map(col => (
            <span key={col} className="bg-slate-900 rounded px-1.5 py-0.5">{col}</span>
          ))}
        </div>
        <p className="text-[9px] text-slate-600">Export first, edit in Excel/Sheets, then re-import.</p>
      </div>

      {status.msg && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
          status.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            : "bg-rose-500/10 border-rose-500/20 text-rose-300"
        }`}>
          {status.type === "success" ? <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />}
          {status.msg}
        </div>
      )}

      {/* Database stats */}
      <div className="flex items-center gap-2 text-[10px] text-slate-500">
        <Info className="h-3 w-3" />
        <span>{tasks.length} campaigns stored in local SQLite database · {activities.length} activity records</span>
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard({ tasks, activities = [], onTasksImported, currentRole }: DashboardProps) {
  const stageStats = {
    planning: tasks.filter((t) => t.stage === TaskStage.PLANNING).length,
    editing: tasks.filter((t) => t.stage === TaskStage.EDITING).length,
    writing: tasks.filter((t) => t.stage === TaskStage.WRITING).length,
    publishing: tasks.filter((t) => t.stage === TaskStage.PUBLISHING).length,
    completed: tasks.filter((t) => t.stage === TaskStage.COMPLETED).length,
  };

  const formats = {
    Video: tasks.filter((t) => t.format === "Video").length,
    Graphic: tasks.filter((t) => t.format === "Graphic").length,
    Carousel: tasks.filter((t) => t.format === "Carousel").length,
  };

  const barChartData = [
    { name: "Planning", count: stageStats.planning, fill: "#6366f1" },
    { name: "Editing", count: stageStats.editing, fill: "#f59e0b" },
    { name: "Writing", count: stageStats.writing, fill: "#ec4899" },
    { name: "Publishing", count: stageStats.publishing, fill: "#0ea5e9" },
    { name: "Done", count: stageStats.completed, fill: "#10b981" },
  ];

  const pieChartData = [
    { name: "Videos", value: formats.Video, color: "#f43f5e" },
    { name: "Graphics", value: formats.Graphic, color: "#3b82f6" },
    { name: "Carousels", value: formats.Carousel, color: "#10b981" },
  ].filter((d) => d.value > 0);

  const uniqueClients = Array.from(new Set(tasks.map((t) => t.clientName))).filter(Boolean).length;

  return (
    <div className="space-y-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} color="indigo" label="Active Pipelines"
          value={tasks.filter((t) => t.stage !== TaskStage.COMPLETED).length} sub="In progress" />
        <KpiCard icon={<CheckCircle className="h-4 w-4" />} color="emerald" label="Completed"
          value={stageStats.completed} sub="Published campaigns" />
        <KpiCard icon={<CloudLightning className="h-4 w-4" />} color="rose" label="Content Mix"
          value={`${formats.Video}v · ${formats.Graphic}g · ${formats.Carousel}c`} sub="Format breakdown" small />
        <KpiCard icon={<Database className="h-4 w-4" />} color="teal" label="Active Clients"
          value={uniqueClients} sub="Unique accounts" />
      </div>

      {/* Charts + Integrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Analytics */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <LineChart className="h-4 w-4 text-blue-400" /> Pipeline Analytics
          </h4>

          <div>
            <p className="text-[11px] text-slate-400 mb-2">Campaigns by stage ({tasks.length} total)</p>
            <div className="h-44">
              {tasks.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">No campaigns yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", fontSize: 11 }} />
                    <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                      {barChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-4 flex items-center justify-between gap-4">
            <div className="w-28 h-28">
              {pieChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={22} outerRadius={42} dataKey="value">
                      {pieChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v}`, "Count"]} contentStyle={{ fontSize: 10, backgroundColor: "#1e293b" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <p className="text-[11px] text-slate-400 font-medium">Content Format Split</p>
              {pieChartData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-[11px] text-slate-300">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  {item.name}: <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Slack + Data */}
        <div className="space-y-4">
          <SlackPanel />
          <DataPanel tasks={tasks} activities={activities} onTasksImported={onTasksImported} />
        </div>

      </div>

      {/* D3 Bottleneck */}
      <D3BottleneckChart tasks={tasks} activities={activities} />

    </div>
  );
}

function KpiCard({ icon, color, label, value, sub, small }: {
  icon: React.ReactNode; color: string; label: string;
  value: string | number; sub: string; small?: boolean;
}) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/10",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/10",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/10",
    teal: "bg-teal-500/10 text-teal-400 border-teal-500/10",
  };
  const textColor: Record<string, string> = {
    indigo: "text-white", emerald: "text-emerald-400",
    rose: "text-white", teal: "text-teal-400",
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">{label}</span>
        <span className={`font-bold tracking-tight block ${small ? "text-sm" : "text-2xl"} ${textColor[color]}`}>{value}</span>
        <span className={`text-[10px] block ${colors[color].split(" ")[1]}`}>{sub}</span>
      </div>
      <div className={`p-2.5 rounded-xl border ${colors[color]}`}>{icon}</div>
    </div>
  );
}
