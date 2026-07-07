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
  RefreshCw, Search, Filter, Calendar, Layers, Sliders, X, Check, Edit,
} from "lucide-react";

interface DashboardProps {
  tasks: Task[];
  activities: ActivityChange[];
  onTasksImported: () => Promise<void>;
  onUpdateTask?: (id: string, updates: any) => Promise<void>;
  onAddTask?: (taskData: any) => Promise<void>;
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

// ─── Google Sheets Sync Panel ────────────────────────────────────────────────

function GoogleSheetsPanel({ onTasksImported }: { onTasksImported: () => Promise<void> }) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | ""; msg: string }>({ type: "", msg: "" });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/sheets");
      if (res.ok) {
        const d = await res.json();
        setWebhookUrl(d.webhookUrl || "");
        setEnabled(d.enabled || false);
        setLogs(d.lastLogs || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(overrides?: any) {
    setSaving(true);
    clearStatus();
    try {
      const res = await fetch("/api/settings/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: overrides?.webhookUrl ?? webhookUrl,
          enabled: overrides?.enabled ?? enabled,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setWebhookUrl(d.webhookUrl || "");
        setEnabled(d.enabled || false);
        setLogs(d.lastLogs || []);
        showStatus("success", "Google Sheets link updated successfully.");
      } else {
        showStatus("error", "Failed to save Google Sheets settings.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    await saveSettings({ enabled: next });
  }

  async function runSyncAll() {
    setSyncingAll(true);
    clearStatus();
    try {
      const res = await fetch("/api/settings/sheets/sync-all", { method: "POST" });
      if (res.ok) {
        await loadSettings();
        showStatus("success", "Entire pipeline successfully backed up to Google Sheets!");
      } else {
        const d = await res.json();
        showStatus("error", d.error || "Failed to sync to Google Sheets.");
      }
    } catch {
      showStatus("error", "Sync failed. Make sure your Web App URL is accessible.");
    } finally {
      setSyncingAll(false);
    }
  }

  async function runRestore() {
    if (!window.confirm("⚠️ RESTORE PIPELINE DATA\n\nThis will replace all your current campaigns with the records in your Google Sheet. Are you sure you want to proceed?")) {
      return;
    }
    setRestoring(true);
    clearStatus();
    try {
      const res = await fetch("/api/settings/sheets/restore", { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        await onTasksImported();
        await loadSettings();
        showStatus("success", `Restored ${d.count} campaigns successfully from Google Sheets!`);
      } else {
        const d = await res.json();
        showStatus("error", d.error || "Failed to restore data.");
      }
    } catch {
      showStatus("error", "Restore failed. Verify your Apps Script is deployed.");
    } finally {
      setRestoring(false);
    }
  }

  async function clearLogs() {
    await fetch("/api/settings/sheets/clear-logs", { method: "POST" });
    setLogs([]);
  }

  function showStatus(type: "success" | "error", msg: string) {
    setStatus({ type, msg });
    setTimeout(() => setStatus({ type: "", msg: "" }), 5000);
  }
  function clearStatus() { setStatus({ type: "", msg: "" }); }

  const scriptCode = `function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  if (data.action === "sync_all") {
    sheet.clear();
    sheet.appendRow(["ID", "Client Name", "Campaign Title", "Stage", "Format", "Description", "Raw Footage Path/Link", "Edited Path/Link", "Caption", "Hashtags", "Published Platform", "Published Link", "Publisher Notes", "Created At", "Updated At"]);
    var tasks = data.tasks;
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      sheet.appendRow([
        t.id || "", t.clientName || "", t.title || "", t.stage || "", t.format || "",
        t.description || "", t.rawFootageLink || t.rawFootagePath || "", t.editedFileLink || t.editedFilePath || "",
        t.captionText || "", t.hashtags || "", t.publishedPlatform || "", t.publishedLink || "", t.publisherNotes || "",
        t.createdAt || "", t.updatedAt || ""
      ]);
    }
    return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
  } else if (data.action === "upsert") {
    var t = data.task;
    var rows = sheet.getDataRange().getValues();
    var rowIndex = -1;
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === t.id) { rowIndex = i + 1; break; }
    }
    var rowData = [
      t.id || "", t.clientName || "", t.title || "", t.stage || "", t.format || "",
      t.description || "", t.rawFootageLink || t.rawFootagePath || "", t.editedFileLink || t.editedFilePath || "",
      t.captionText || "", t.hashtags || "", t.publishedPlatform || "", t.publishedLink || "", t.publisherNotes || "",
      t.createdAt || "", t.updatedAt || ""
    ];
    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["ID", "Client Name", "Campaign Title", "Stage", "Format", "Description", "Raw Footage Path/Link", "Edited Path/Link", "Caption", "Hashtags", "Published Platform", "Published Link", "Publisher Notes", "Created At", "Updated At"]);
      }
      sheet.appendRow(rowData);
    }
    return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
  } else if (data.action === "delete") {
    var id = data.id;
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) { sheet.deleteRow(i + 1); break; }
    }
    return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
  } else if (data.action === "fetch_all") {
    var rows = sheet.getDataRange().getValues();
    if (rows.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({tasks: []})).setMimeType(ContentService.MimeType.JSON);
    }
    var tasks = [];
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      tasks.push({
        id: row[0], clientName: row[1], title: row[2], stage: row[3], format: row[4],
        description: row[5], rawFootageLink: row[6], editedFileLink: row[7],
        captionText: row[8], hashtags: row[9], publishedPlatform: row[10], publishedLink: row[11], publisherNotes: row[12],
        createdAt: row[13], updatedAt: row[14]
      });
    }
    return ContentService.createTextOutput(JSON.stringify({tasks: tasks})).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

  function copyScriptCode() {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  const hasWebhook = webhookUrl.trim().length > 0;
  const isConnected = hasWebhook && enabled;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl ${isConnected ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-slate-800 border border-slate-700"}`}>
            <FileText className={`h-4 w-4 ${isConnected ? "text-emerald-400" : "text-emerald-500"}`} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Google Sheets Backup & Live-Sync</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isConnected ? "Connected — real-time Google Sheet synchronization" : "Google Sheets integration"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
          <span className="text-[11px] font-mono text-slate-400">{isConnected ? "Connected" : "Not Linked"}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
        </div>
      ) : (
        <>
          <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800/80 text-xs text-slate-300 space-y-3">
            <h5 className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded text-[10px]">Easy Setup Guide</span>
              No Google OAuth/API Keys needed!
            </h5>
            <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-[11px] text-slate-400">
              <li>Open your target Google Sheet</li>
              <li>Click <strong className="text-zinc-100">Extensions → Apps Script</strong></li>
              <li>Clear any code, paste our Apps Script template code, and click save.</li>
              <li>Click <strong className="text-zinc-100">Deploy → New Deployment</strong></li>
              <li>Set Type: <strong className="text-zinc-100">Web App</strong>, Execute as: <strong className="text-zinc-100">Me</strong>, Access: <strong className="text-zinc-100">Anyone</strong></li>
              <li>Deploy, copy the Web App URL, and paste it below!</li>
            </ol>
            
            <button
              onClick={copyScriptCode}
              className="w-full py-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-300 rounded-lg text-[10px] font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? (
                <>
                  <CheckCheck className="h-3 w-3 text-emerald-400" />
                  Code Copied to Clipboard!
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" />
                  Copy Google Apps Script Code
                </>
              )}
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span className="bg-indigo-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">1</span>
              Apps Script Web App URL
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showUrl ? "text" : "password"}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowUrl(!showUrl)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showUrl ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <button
                onClick={() => saveSettings({ webhookUrl, enabled: webhookUrl ? true : enabled })}
                disabled={saving}
                className="px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                Save
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-950 rounded-xl p-3 border border-slate-800">
            <div>
              <p className="text-xs font-semibold text-slate-200">Enable Google Sheet Live Sync</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Upload, edit, and delete rows automatically in real time</p>
            </div>
            <button
              onClick={toggleEnabled}
              disabled={!hasWebhook || saving}
              title={!hasWebhook ? "Add a web app URL first" : ""}
              className="cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {enabled
                ? <ToggleRight className="h-7 w-7 text-emerald-400" />
                : <ToggleLeft className="h-7 w-7 text-slate-500" />}
            </button>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={runSyncAll}
              disabled={!hasWebhook || syncingAll}
              className="flex-1 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
            >
              {syncingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Full Backup to Sheet
            </button>
            <button
              onClick={runRestore}
              disabled={!hasWebhook || restoring}
              className="flex-1 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-300 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
            >
              {restoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Restore from Sheet
            </button>
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

          {logs.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sync Connection Logs</p>
                <button
                  onClick={clearLogs}
                  className="text-[9px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                >
                  Clear Logs
                </button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {logs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center gap-2 bg-slate-950 rounded-lg px-2.5 py-1.5 border border-slate-900 font-mono text-[9px]">
                    <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${log.success ? "bg-emerald-400" : "bg-rose-400"}`} />
                    <span className="text-[10px] text-slate-300 flex-1 truncate">{log.message}</span>
                    <span className="text-slate-500 flex-shrink-0">
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
  const [resetting, setResetting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | ""; msg: string }>({ type: "", msg: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleResetDatabase() {
    if (!window.confirm("⚠️ ARE YOU SURE? This will permanently delete all campaigns and activity logs for production reset! This cannot be undone.")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      if (res.ok) {
        await onTasksImported();
        setStatus({ type: "success", msg: "Database successfully cleared and reset for production!" });
      } else {
        throw new Error("Reset failed");
      }
    } catch (err: any) {
      setStatus({ type: "error", msg: err.message || "Failed to reset database" });
    } finally {
      setResetting(false);
    }
    setTimeout(() => setStatus({ type: "", msg: "" }), 5000);
  }

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
        <button
          onClick={handleResetDatabase}
          disabled={resetting}
          className="col-span-2 flex items-center justify-center gap-2 px-3 py-2.5 bg-rose-650/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
        >
          {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Reset Database for Production (Clear All)
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

const getPriorityBadgeStyle = (priority?: string) => {
  switch (priority) {
    case "Urgent":
      return {
        text: "🔴 Urgent",
        classes: "text-rose-400 bg-rose-500/15 border-rose-500/25",
      };
    case "High":
      return {
        text: "🟠 High",
        classes: "text-orange-400 bg-orange-500/15 border-orange-500/25",
      };
    case "Low":
      return {
        text: "🟢 Low",
        classes: "text-slate-400 bg-slate-800/80 border-slate-700/55",
      };
    case "Medium":
    default:
      return {
        text: "🟡 Medium",
        classes: "text-yellow-450 bg-yellow-500/10 border-yellow-500/20",
      };
  }
};

export default function Dashboard({ tasks, activities = [], onTasksImported, onUpdateTask, onAddTask, currentRole }: DashboardProps) {
  const DEFAULT_CLIENTS = [
    "Roshan Zindagi","GymBhai","Powerlifting","Diabesity.Life","The Quarterdeck","TSC.Challenges Club",
    "Dr Ahmad Shahzad","Dr Ali Asad Khan","Dr Aman Ullah Bhalli","Dr Amir Shoukat","Dr Ashfaq Ali",
    "Dr Asif Islam","Dr Asim Munir Alvi","Dr Azmat Ali Khan","Dr Bilad Ul Islam","Dr Col Shakeel Mirza",
    "Dr Madeeha Nazar","Dr Mehboob Qadir","Dr Muhammad Usman","Dr Munir Azher Ch","Dr Qamar Sajjad",
    "Dr Salahudin Rind","Dr Shaista Kanwal","Dr Tahir Rasool","Dr Usman Musharraf",
    "Dr Mehmood Ul Hassan","Dr Shair Zaman Kakar","LDF"
  ];
  const [customClients, setCustomClients] = useState<string[]>([]);
  const allClients = Array.from(new Set([...DEFAULT_CLIENTS, ...customClients, ...tasks.map(t => t.clientName)])).filter(Boolean).sort();

  useEffect(() => {
    fetch("/api/custom-clients")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCustomClients(data);
        }
      })
      .catch(err => console.error("Error loading custom clients", err));
  }, [tasks]);

  // --- State for Pipeline Command Center ---
  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("All");
  const [formatFilter, setFormatFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [selectedAdminTask, setSelectedAdminTask] = useState<Task | null>(null);
  const [adminSaving, setAdminSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [adminRevisionText, setAdminRevisionText] = useState("");
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "priority">("date");

  // Form states for quick add
  const [newClient, setNewClient] = useState("");
  const [customNewClient, setCustomNewClient] = useState("");
  const [isCustomClientMode, setIsCustomClientMode] = useState(false);
  const [saveCustomClientOption, setSaveCustomClientOption] = useState(true);
  const [newStage, setNewStage] = useState<TaskStage>(TaskStage.PLANNING);
  const [newTitle, setNewTitle] = useState("");
  const [newFormat, setNewFormat] = useState<"Video" | "Graphic" | "Carousel">("Video");
  const [newEditor, setNewEditor] = useState("Yasir");
  const [newWriter, setNewWriter] = useState("Fatima Malik");
  const [newBrief, setNewBrief] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newPriority, setNewPriority] = useState<"Low" | "Medium" | "High" | "Urgent">("Medium");

  async function handleDeleteCustomClient() {
    if (!newClient) return;
    if (!window.confirm(`Are you sure you want to delete "${newClient}" from the saved clients list?`)) return;
    try {
      const res = await fetch("/api/custom-clients/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: newClient })
      });
      if (res.ok) {
        const data = await res.json();
        setCustomClients(data);
        setNewClient("");
      }
    } catch (err) {
      console.error("Error deleting custom client:", err);
    }
  }

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
  const clientAccounts = ["All", ...Array.from(new Set(tasks.map(t => t.clientName))).filter(Boolean)];

  // Filter campaigns
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClient = clientFilter === "All" || t.clientName === clientFilter;
    const matchesFormat = formatFilter === "All" || t.format === formatFilter;
    return matchesSearch && matchesClient && matchesFormat;
  });

  const PRIORITY_ORDER: Record<string, number> = {
    Urgent: 4,
    High: 3,
    Medium: 2,
    Low: 1,
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "priority") {
      const weightA = PRIORITY_ORDER[a.priority || "Medium"] || 2;
      const weightB = PRIORITY_ORDER[b.priority || "Medium"] || 2;
      if (weightA !== weightB) {
        return weightB - weightA; // Urgent first, then High, etc.
      }
    }
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const triggerToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Crew arrays matching Team Config exactly
  const teamEditorsList = ["Yasir", "Ammar", "Zainab"];
  const teamDesignersList = ["Adila"];
  const teamWritersList = ["Fatima Malik"];

  // Quick state overrides
  const handleStageChange = async (taskId: string, newStage: TaskStage) => {
    if (!onUpdateTask) return;
    setAdminSaving(true);
    try {
      await onUpdateTask(taskId, {
        stage: newStage,
        $actionUserName: "Administrator",
        $actionUserRole: "Dashboard",
        $actionDetails: `Stage manually overriden from "${tasks.find(t=>t.id===taskId)?.stage}" to "${newStage}" by Administrator.`,
      });
      triggerToast("success", `Campaign progressed to stage: ${newStage}`);
      if (selectedAdminTask?.id === taskId) {
        setSelectedAdminTask(prev => prev ? { ...prev, stage: newStage } : null);
      }
    } catch {
      triggerToast("error", "Failed to update campaign stage.");
    } finally {
      setAdminSaving(false);
    }
  };

  const handleReassignStaff = async (taskId: string, field: "assignedEditor" | "assignedWriter", newName: string) => {
    if (!onUpdateTask) return;
    setAdminSaving(true);
    try {
      await onUpdateTask(taskId, {
        [field]: newName,
        $actionUserName: "Administrator",
        $actionUserRole: "Dashboard",
        $actionDetails: `Reassigned ${field === "assignedEditor" ? "Editor" : "Writer"} of "${tasks.find(t=>t.id===taskId)?.title}" to "${newName}" by Administrator.`,
      });
      triggerToast("success", `Reassigned successfully to ${newName}`);
      if (selectedAdminTask?.id === taskId) {
        setSelectedAdminTask(prev => prev ? { ...prev, [field]: newName } : null);
      }
    } catch {
      triggerToast("error", "Assignee change failed.");
    } finally {
      setAdminSaving(false);
    }
  };

  const handleAdminRequestRevision = async (task: Task) => {
    if (!onUpdateTask || !adminRevisionText.trim()) return;
    setAdminSaving(true);
    try {
      const revision = {
        id: "rev-" + Date.now(),
        requestedBy: "Administrator",
        requestedAt: new Date().toISOString(),
        reason: adminRevisionText.trim(),
        stage: task.stage,
      };
      const existing = task.revisions || [];
      await onUpdateTask(task.id, {
        stage: TaskStage.PLANNING,
        revisions: [...existing, revision],
        revisionCount: (task.revisionCount || 0) + 1,
        $actionUserName: "Administrator",
        $actionUserRole: "Dashboard",
        $actionDetails: `🔄 Emergency Admin Revision: "${adminRevisionText.trim()}"`,
      });
      triggerToast("success", "Sent back to Brief/Planning stage with revision request.");
      setAdminRevisionText("");
      setSelectedAdminTask(null);
    } catch {
      triggerToast("error", "Failed to lodge revision request.");
    } finally {
      setAdminSaving(false);
    }
  };

  const handleDeleteCampaign = async (taskId: string) => {
    if (!window.confirm("WARNING: Are you absolutely sure you want to permanently delete this campaign? It will be removed from local SQLite storage and Google sheets backup.")) return;
    setAdminSaving(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        await onTasksImported();
        triggerToast("success", "Campaign permanently deleted.");
        setSelectedAdminTask(null);
      } else {
        triggerToast("error", "Server rejected campaign delete.");
      }
    } catch {
      triggerToast("error", "Network connection failure during deletion.");
    } finally {
      setAdminSaving(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalClient = isCustomClientMode ? customNewClient.trim() : newClient;
    if (!finalClient || !newTitle || !newDeadline || !newBrief || !onAddTask) return;
    setAdminSaving(true);
    try {
      if (isCustomClientMode && saveCustomClientOption) {
        try {
          const clientRes = await fetch("/api/custom-clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientName: finalClient })
          });
          if (clientRes.ok) {
            const updated = await clientRes.json();
            setCustomClients(updated);
          }
        } catch (err) {
          console.error("Error saving custom client:", err);
        }
      }
      const isVideo = newFormat === "Video";
      await onAddTask({
        clientName: finalClient,
        title: `${newFormat} (${newDeadline})`,
        format: newFormat,
        assignedEditor: isVideo ? newEditor : "Adila", // Route correctly based on formats
        assignedWriter: newWriter,
        description: newBrief,
        stage: newStage,
        priority: newPriority,
        userName: "Administrator",
        userRole: "Dashboard",
        deadline: newDeadline,
      });
      triggerToast("success", `Admin campaign injected directly to ${newStage}!`);
      setNewClient("");
      setCustomNewClient("");
      setIsCustomClientMode(false);
      setNewStage(TaskStage.PLANNING);
      setNewTitle("");
      setNewDeadline("");
      setNewBrief("");
      setNewPriority("Medium");
      setShowAddCampaign(false);
    } catch {
      triggerToast("error", "Campaign insertion failed.");
    } finally {
      setAdminSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Banner Notifications */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-2xl border text-xs font-semibold shadow-2xl animate-fade-in ${
          toast.type === "success" 
            ? "bg-emerald-950/95 border-emerald-500/35 text-emerald-300"
            : "bg-rose-950/95 border-rose-500/35 text-rose-300"
        }`}>
          {toast.type === "success" ? <CheckCheck className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-rose-400" />}
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-1.5 opacity-60 hover:opacity-100">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

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

        {/* Right column: Slack + Sheets + Data */}
        <div className="space-y-4">
          <SlackPanel />
          <GoogleSheetsPanel onTasksImported={onTasksImported} />
          <DataPanel tasks={tasks} activities={activities} onTasksImported={onTasksImported} />
        </div>

      </div>

      {/* 🔍 LIVE PIPELINE COMMAND CENTER (ADMIN) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
        
        {/* Title & Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-800/80 pb-3.5">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="h-4.5 w-4.5 text-indigo-400 animate-pulse" /> Live Pipeline Command Center
            </h3>
            <p className="text-[11px] text-slate-400">
              Interactive administrative control console. Track campaigns, progress stages, re-assign team, and request re-dos.
            </p>
          </div>
          <button
            onClick={() => setShowAddCampaign(!showAddCampaign)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/10 cursor-pointer self-start sm:self-auto transition-colors"
          >
            {showAddCampaign ? <X className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
            {showAddCampaign ? "Cancel Injection" : "Inject Campaign"}
          </button>
        </div>

        {/* Inject Campaign Form Overlay inside dashboard */}
        {showAddCampaign && (
          <form onSubmit={handleCreateCampaign} className="bg-slate-950 p-4.5 rounded-xl border border-indigo-900/30 space-y-4 animate-fade-in text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5 pb-2 border-b border-indigo-950/50">
              ⚡ Action: Inject Campaign directly into Briefing stage
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10.5px] font-semibold text-slate-400">Client Account</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomClientMode(!isCustomClientMode)}
                    className="text-[9.5px] text-indigo-400 hover:underline font-bold focus:outline-none"
                  >
                    {isCustomClientMode ? "Choose Existing" : "+ Add New Client"}
                  </button>
                </div>
                {isCustomClientMode ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      required
                      placeholder="Enter brand/client name..."
                      value={customNewClient}
                      onChange={(e) => setCustomNewClient(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <label className="flex items-center gap-1.5 cursor-pointer select-none mt-1">
                      <input
                        type="checkbox"
                        checked={saveCustomClientOption}
                        onChange={(e) => setSaveCustomClientOption(e.target.checked)}
                        className="rounded border-slate-800 bg-slate-900 text-indigo-500 focus:ring-0 focus:ring-offset-0 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400 font-medium">💾 Save client for future use</span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <select
                      required
                      value={newClient}
                      onChange={(e) => setNewClient(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Choose Account --</option>
                      {allClients.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {newClient && customClients.includes(newClient) && (
                      <button
                        type="button"
                        onClick={handleDeleteCustomClient}
                        className="text-[9.5px] text-rose-400 hover:underline font-semibold block text-left mt-1"
                      >
                        🗑️ Delete from saved clients
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold text-slate-400 mb-1">Campaign Title / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GymBhai Transformation Reels"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-905 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.8 text-xs text-slate-200 focus:outline-none focus:border-indigo-505"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold text-slate-400 mb-1">Format Type</label>
                <select
                  value={newFormat}
                  onChange={(e) => setNewFormat(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Video">Video Reel / Short</option>
                  <option value="Graphic">Graphic Image</option>
                  <option value="Carousel">Carousel Layout</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold text-slate-400 mb-1">Set Completion Deadline</label>
                <input
                  type="date"
                  required
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {newFormat === "Video" ? (
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-400 mb-1">Assign Editor Desk</label>
                  <select
                    value={newEditor}
                    onChange={(e) => setNewEditor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {teamEditorsList.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-400 mb-1">Assign Designer Desk</label>
                  <select
                    disabled
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-500 focus:outline-none"
                  >
                    <option value="Adila">Adila (Creative Graphic Designer)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10.5px] font-semibold text-slate-400 mb-1">Assign Social Writer Desk</label>
                <select
                  value={newWriter}
                  onChange={(e) => setNewWriter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {teamWritersList.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold text-slate-400 mb-1">Starting Workflow Stage</label>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value={TaskStage.PLANNING}>1. Brief & Review (Planning)</option>
                  <option value={TaskStage.EDITING}>2. Visual Editing (Editing)</option>
                  <option value={TaskStage.WRITING}>3. Social Copy (Writing)</option>
                  <option value={TaskStage.PUBLISHING}>4. Publish Ready (Publishing)</option>
                  <option value={TaskStage.COMPLETED}>5. Out Live (Completed)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold text-slate-400 mb-1">Priority Level</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Low">🟢 Low</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="High">🟠 High</option>
                  <option value="Urgent">🔴 Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] font-semibold text-slate-400 mb-1">Creative Brief instruction instructions</label>
              <textarea
                required
                placeholder="Details of visual theme, sound design, hook lines, copywriting, or special requests..."
                rows={2}
                value={newBrief}
                onChange={(e) => setNewBrief(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-250 placeholder-slate-700 focus:outline-none focus:border-indigo-505 resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowAddCampaign(false)}
                className="px-4 py-2 border border-slate-800 text-xs text-slate-400 hover:bg-slate-900/55 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adminSaving}
                className="px-5 py-2 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow"
              >
                {adminSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5" />}
                Save and Launch Campaign
              </button>
            </div>
          </form>
        )}

        {/* Filters and Views Bar */}
        <div className="bg-slate-950 p-4.5 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between text-left">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
            
            {/* Search Input */}
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search campaign topic..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8.5 pr-2.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 max-w-xs"
              />
            </div>

            {/* Client Account Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 whitespace-nowrap">Client:</span>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                {clientAccounts.map(accountName => (
                  <option key={accountName} value={accountName}>{accountName === "All" ? "All Accounts" : accountName}</option>
                ))}
              </select>
            </div>

            {/* Format Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 whitespace-nowrap">Format:</span>
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="All">All Formats</option>
                <option value="Video">Video Reels</option>
                <option value="Graphic">Graphic Images</option>
                <option value="Carousel">Carousels</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 whitespace-nowrap">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="date">📅 Newest Created</option>
                <option value="priority">🔥 High Priority First</option>
              </select>
            </div>
          </div>

          {/* Kanban / List Toggle Modes */}
          <div className="flex items-center gap-2 border-l border-slate-800 pl-4 w-full sm:w-auto justify-end">
            <span className="text-[10.5px] text-slate-500 font-mono">Layout:</span>
            <div className="bg-slate-900 border border-slate-800 p-0.5 rounded-xl flex gap-1">
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "kanban" 
                    ? "bg-indigo-650 text-white" 
                    : "text-slate-550 hover:text-slate-300"
                }`}
              >
                Kanban
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "list" 
                    ? "bg-indigo-650 text-white" 
                    : "text-slate-550 hover:text-slate-300"
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* ─── WORKFLOW KANBAN BOARD VIEW ─── */}
        {viewMode === "kanban" && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 text-left items-start overflow-x-auto pb-4">
            
            {/* STAGE LANES CONFIG */}
            {[
              { id: TaskStage.PLANNING, title: "1. Brief & Review 📋", color: "indigo", border: "border-indigo-500/20", bg: "bg-indigo-500/5", colorHex: "#6366f1" },
              { id: TaskStage.EDITING, title: "2. Visual Editing 🎬", color: "amber", border: "border-amber-500/20", bg: "bg-amber-500/5", colorHex: "#f59e0b" },
              { id: TaskStage.WRITING, title: "3. SOCIAL COPY ✍️", color: "pink", border: "border-pink-500/20", bg: "bg-pink-500/5", colorHex: "#ec4899" },
              { id: TaskStage.PUBLISHING, title: "4. PUBLISH READY 🚀", color: "sky", border: "border-sky-500/20", bg: "bg-sky-500/5", colorHex: "#0ea5e9" },
              { id: TaskStage.COMPLETED, title: "5. OUT LIVE ✅", color: "emerald", border: "border-emerald-500/20", bg: "bg-emerald-505/5", colorHex: "#10b981" }
            ].map(lane => {
              const laneTasks = sortedTasks.filter(t => t.stage === lane.id);
              return (
                <div key={lane.id} className="min-w-[200px] flex-1 flex flex-col gap-3">
                  
                  {/* Lane Title */}
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${lane.border} ${lane.bg}`}>
                    <span className="text-[11.5px] font-bold text-slate-200 uppercase tracking-wide">{lane.title}</span>
                    <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[10.5px] font-bold rounded-lg text-slate-400">
                      {laneTasks.length}
                    </span>
                  </div>

                  {/* Lane Scroll Content Area */}
                  <div className="space-y-2.5 min-h-[350px] bg-slate-950/40 p-2 rounded-xl border border-slate-905 max-h-[500px] overflow-y-auto">
                    {laneTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-800 rounded-lg text-[10px] text-slate-650 h-[300px]">
                        <span>0 Campaigns</span>
                      </div>
                    ) : (
                      laneTasks.map(task => {
                        const isVideo = task.format === "Video";
                        const isCarousel = task.format === "Carousel";
                        const badgeColor = isVideo ? "text-rose-450 bg-rose-500/10 border-rose-500/15" : isCarousel ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/15" : "text-blue-400 bg-blue-500/10 border-blue-500/15";
                        const formatIcon = isVideo ? "🎬" : isCarousel ? "🎠" : "🎨";
                        
                        return (
                          <div
                            key={task.id}
                            onClick={() => setSelectedAdminTask(task)}
                            className="bg-slate-900 border border-slate-8 hover:border-slate-700/80 p-3 rounded-xl cursor-pointer hover:bg-slate-850/80 transition-all space-y-2 relative shadow shadow-black group"
                          >
                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                              <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 font-bold px-1.5 py-0.5 rounded uppercase max-w-[110px] truncate">
                                {task.clientName}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className={`text-[9.5px] font-black px-1.5 py-0.2 rounded border uppercase font-mono ${badgeColor}`}>
                                  {formatIcon} {task.format || "Video"}
                                </span>
                                <span className={`text-[9px] font-semibold px-1 py-0.2 rounded border font-mono ${getPriorityBadgeStyle(task.priority).classes}`}>
                                  {getPriorityBadgeStyle(task.priority).text}
                                </span>
                              </div>
                            </div>

                            <h5 className="text-[11.5px] font-semibold text-slate-200 line-clamp-2 leading-tight">
                              {task.title.replace(`(${task.deadline})`, "").trim() || "Untitled Campaign"}
                            </h5>

                            {/* Info grid */}
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 border-t border-slate-950 pt-2 text-[9.5px] text-slate-500">
                              <div>
                                <span className="block opacity-60">Visual Crew:</span>
                                <strong className="text-slate-300 font-normal">{task.assignedEditor || "Adila"}</strong>
                              </div>
                              <div>
                                <span className="block opacity-60">Copy Crew:</span>
                                <strong className="text-slate-300 font-normal">{task.assignedWriter || "Fatima"}</strong>
                              </div>
                              <div>
                                <span className="block opacity-60">Created Date:</span>
                                <strong className="text-slate-300 font-normal font-mono">
                                  {task.createdAt ? new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A"}
                                </strong>
                              </div>
                              <div>
                                <span className="block opacity-60">Deadline Date:</span>
                                <strong className={`font-mono ${task.deadline ? 'text-amber-400 font-semibold' : 'text-slate-300 font-normal'}`}>
                                  {task.deadline ? new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "None"}
                                </strong>
                              </div>
                            </div>

                            {/* Revision Indicator Badge */}
                            {task.revisionCount ? (
                              <div className="absolute right-2.5 bottom-2.5 flex items-center gap-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8.5px] font-mono px-1 py-0.2 rounded-md">
                                <RefreshCw className="h-2.5 w-2.5 animate-spin-slow" />
                                <span>R{task.revisionCount}</span>
                              </div>
                            ) : null}

                            {/* Quick Advance visual bar on cards hover helper */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-between gap-1.5 pt-1.5 border-t border-dashed border-slate-800">
                              <span className="text-[8.5px] text-zinc-500 self-center font-mono">Admin actions:</span>
                              <div className="flex gap-1">
                                {lane.id !== TaskStage.PLANNING && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const prevStagesMap: Record<string, TaskStage> = {
                                        editing: TaskStage.PLANNING,
                                        writing: TaskStage.EDITING,
                                        publishing: TaskStage.WRITING,
                                        completed: TaskStage.PUBLISHING
                                      };
                                      handleStageChange(task.id, prevStagesMap[lane.id]);
                                    }}
                                    className="p-1 hover:bg-slate-800 text-rose-400 rounded-md border border-slate-950 hover:border-slate-750"
                                    title="Regress stage"
                                  >
                                    &larr;
                                  </button>
                                )}
                                {lane.id !== TaskStage.COMPLETED && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const nextStagesMap: Record<string, TaskStage> = {
                                        planning: TaskStage.EDITING,
                                        editing: TaskStage.WRITING,
                                        writing: TaskStage.PUBLISHING,
                                        publishing: TaskStage.COMPLETED
                                      };
                                      handleStageChange(task.id, nextStagesMap[lane.id]);
                                    }}
                                    className="p-1 hover:bg-slate-800 text-emerald-400 rounded-md border border-slate-950 hover:border-slate-750 font-bold"
                                    title="Advance stage"
                                  >
                                    &rarr;
                                  </button>
                                )}
                              </div>
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* ─── COMPREHENSIVE TABULAR TABLE VIEW ─── */}
        {viewMode === "list" && (
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 text-left">
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px] text-slate-350">
                <thead className="bg-slate-900 border-b border-slate-800 text-[10.5px] uppercase tracking-wider text-slate-400 font-mono">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Client</th>
                    <th className="px-4 py-3 font-semibold">Campaign / Title</th>
                    <th className="px-4 py-3 font-semibold">Format</th>
                    <th className="px-4 py-3 font-semibold">Stage Status</th>
                    <th className="px-4 py-3 font-semibold">Created At</th>
                    <th className="px-4 py-3 font-semibold">Deadline</th>
                    <th className="px-4 py-3 font-semibold">Visual Crew</th>
                    <th className="px-4 py-3 font-semibold">Copy Writer</th>
                    <th className="px-4 py-3 font-semibold">Directory Path / Link</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/65">
                  {sortedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                        No active campaigns match the selected filters. Change search parameters to list items.
                      </td>
                    </tr>
                  ) : (
                    sortedTasks.map(task => {
                      const colorsMap: Record<string, string> = {
                        planning: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
                        editing: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                        writing: "bg-pink-500/10 text-pink-400 border border-pink-500/20",
                        publishing: "bg-sky-500/10 text-sky-400 border border-sky-505/20",
                        completed: "bg-emerald-500/10 text-emerald-400 border border-emerald-505/20"
                      };

                      return (
                        <tr key={task.id} className="hover:bg-slate-900/50 group">
                          <td className="px-4 py-3 font-bold text-slate-200">
                            {task.clientName}
                          </td>
                          <td className="px-4 py-3 text-slate-300 max-w-xs truncate">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{task.title.replace(`(${task.deadline})`, "").trim()}</span>
                              <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border font-mono ${getPriorityBadgeStyle(task.priority).classes}`}>
                                {getPriorityBadgeStyle(task.priority).text}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-400">{task.format}</span>
                          </td>
                          <td className="px-4 py-3 uppercase text-[9.5px] font-bold">
                            <span className={`px-2 py-0.5 rounded-lg ${colorsMap[task.stage] || "bg-slate-800 text-slate-400"}`}>
                              {task.stage}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-350 whitespace-nowrap font-mono text-[10.5px]">
                            {task.createdAt ? new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-[10.5px]">
                            {task.deadline ? (
                              <span className="text-amber-400 font-semibold">
                                {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            ) : (
                              <span className="text-slate-500">None</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={task.assignedEditor || "Yasir"}
                              onChange={(e) => handleReassignStaff(task.id, "assignedEditor", e.target.value)}
                              className="bg-transparent hover:bg-slate-900 border border-transparent hover:border-slate-850 px-1 rounded-md text-[11.5px] text-slate-350 focus:outline-none"
                            >
                              {teamEditorsList.concat(teamDesignersList).map(e => <option key={e} value={e} className="bg-slate-950">{e}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={task.assignedWriter || "Fatima Malik"}
                              onChange={(e) => handleReassignStaff(task.id, "assignedWriter", e.target.value)}
                              className="bg-transparent hover:bg-slate-900 border border-transparent hover:border-slate-850 px-1 rounded-md text-[11.5px] text-slate-350 focus:outline-none"
                            >
                              {teamWritersList.map(w => <option key={w} value={w} className="bg-slate-950">{w}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-xs max-w-xs truncate text-slate-500 font-mono">
                            {task.editedFilePath || task.rawFootagePath || task.editedFileLink || "No path set"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100">
                              <button
                                onClick={() => setSelectedAdminTask(task)}
                                className="px-2 py-1 bg-slate-900 border border-slate-800 hover:border-slate-500 hover:bg-slate-850 text-[10px] font-bold rounded-lg text-slate-300 transition-colors"
                              >
                                View / Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ─── DETAILED VIEW OVERLAY MODAL (ADMIN CONTROL) ─── */}
      {selectedAdminTask && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in text-left">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl text-slate-200 relative space-y-4 shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-indigo-500 font-extrabold text-white px-2 py-0.5 rounded uppercase tracking-wider font-mono">Administration Hub</span>
                  <span className="text-xs text-slate-400">Campaign #{selectedAdminTask.id}</span>
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  {selectedAdminTask.clientName} &mdash; {selectedAdminTask.title.replace(`(${selectedAdminTask.deadline})`, "").trim()}
                </h3>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1 font-mono flex-wrap">
                  <span className="flex items-center gap-1">
                    📅 Created: <strong className="text-slate-300">{selectedAdminTask.createdAt ? new Date(selectedAdminTask.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "N/A"}</strong>
                  </span>
                  <span className="text-slate-700">|</span>
                  <span className="flex items-center gap-1">
                    🚨 Deadline: <strong className={selectedAdminTask.deadline ? "text-amber-400 font-bold" : "text-slate-300"}>{selectedAdminTask.deadline ? new Date(selectedAdminTask.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "None"}</strong>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAdminTask(null)}
                className="p-1.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Campaign details content area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              <div className="space-y-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[9.5px] uppercase font-mono text-indigo-400 font-bold block">Creative Brief</span>
                  <p className="text-slate-300 leading-normal font-sans pr-1 max-h-36 overflow-y-auto font-normal">
                    {selectedAdminTask.description || "No creative briefing parameters provided for this task."}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  <div className="bg-slate-955 bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[9.5px] uppercase font-mono text-teal-400 font-bold block">Raw Footage Location</span>
                    <span className="text-[10px] block font-mono text-slate-400 truncate">{selectedAdminTask.rawFootagePath || "No local path specified"}</span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[9.5px] uppercase font-mono text-emerald-400 font-bold block">Edited Deliverable Location</span>
                    <span className="text-[10px] block font-mono text-slate-400 truncate">{selectedAdminTask.editedFilePath || "No local folder set"}</span>
                    {selectedAdminTask.editedFileLink && (
                      <a
                        href={selectedAdminTask.editedFileLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[9.5px] text-blue-400 font-bold flex items-center gap-1 hover:underline pt-0.5"
                      >
                        <ExternalLink className="h-3 w-3" /> View Shared Cloud Assets
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[9.5px] uppercase font-mono text-pink-400 font-bold block">Copy writing & Caption Panel</span>
                  <div>
                    <span className="text-[9.5px] font-mono text-slate-550 block">Body Copy:</span>
                    <p className="text-slate-300 text-[10.5px] bg-slate-900 border border-slate-850 p-2 rounded-lg leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap mt-1">
                      {selectedAdminTask.captionText || "Pending social copywriting desk."}
                    </p>
                  </div>
                  {selectedAdminTask.hashtags && (
                    <div>
                      <span className="text-[9.5px] font-mono text-slate-550 block">Hashtags:</span>
                      <p className="text-slate-400 text-[10px] mt-0.5 font-mono">{selectedAdminTask.hashtags}</p>
                    </div>
                  )}
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[9.5px] uppercase font-mono text-slate-400 font-bold block">Workflow Stage Overrides</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: TaskStage.PLANNING, label: "To Brief" },
                      { id: TaskStage.EDITING, label: "To Editing" },
                      { id: TaskStage.WRITING, label: "To Copy" },
                      { id: TaskStage.PUBLISHING, label: "To Publish" },
                      { id: TaskStage.COMPLETED, label: "Set Competed" }
                    ].map(stageBtn => (
                      <button
                        key={stageBtn.id}
                        type="button"
                        onClick={() => handleStageChange(selectedAdminTask.id, stageBtn.id)}
                        disabled={adminSaving}
                        className={`py-1.5 px-2 text-[10.5px] font-bold rounded-lg border transition-all cursor-pointer ${
                          selectedAdminTask.stage === stageBtn.id
                            ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/40"
                            : "bg-slate-900 border-slate-800 hover:border-slate-650 hover:bg-slate-850 text-slate-400"
                        }`}
                      >
                        {stageBtn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[9.5px] uppercase font-mono text-slate-400 font-bold block">Campaign Priority Override</span>
                  <select
                    value={selectedAdminTask.priority || "Medium"}
                    onChange={async (e) => {
                      const updatedPriority = e.target.value;
                      if (!onUpdateTask) return;
                      setAdminSaving(true);
                      try {
                        await onUpdateTask(selectedAdminTask.id, {
                          priority: updatedPriority,
                          $actionUserName: "Administrator",
                          $actionUserRole: "Dashboard",
                          $actionDetails: `Priority updated to "${updatedPriority}" by Administrator.`,
                        });
                        triggerToast("success", `Priority updated to ${updatedPriority}`);
                        setSelectedAdminTask(prev => prev ? { ...prev, priority: updatedPriority } : null);
                      } catch {
                        triggerToast("error", "Priority update failed.");
                      } finally {
                        setAdminSaving(false);
                      }
                    }}
                    disabled={adminSaving}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Low">🟢 Low Priority</option>
                    <option value="Medium">🟡 Medium Priority</option>
                    <option value="High">🟠 High Priority</option>
                    <option value="Urgent">🔴 Urgent Priority</option>
                  </select>
                </div>
              </div>

            </div>

            {/* Revisions timeline list inside admin modal */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
              <span className="text-[9.5px] uppercase font-mono text-amber-500 font-bold block flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin-slow" /> Revision & Remake Logs Timeline ({selectedAdminTask.revisions?.length || 0})
              </span>
              
              {selectedAdminTask.revisions && selectedAdminTask.revisions.length > 0 ? (
                <div className="space-y-2 max-h-24 overflow-y-auto pr-1">
                  {selectedAdminTask.revisions.map((rev, idx) => (
                    <div key={rev.id || idx} className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg text-[10px] leading-relaxed">
                      <div className="flex justify-between text-[9px] text-slate-500 pb-1 mb-1 border-b border-slate-950">
                        <span>Requested by: <strong>{rev.requestedBy}</strong></span>
                        <span>{new Date(rev.requestedAt).toLocaleString()}</span>
                      </div>
                      <p className="text-amber-200">Re-do instructions: "{rev.reason}"</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 italic pl-1">No revision cycles logged on this deliverable.</p>
              )}
            </div>

            {/* Quick Staff reassignment & Redo command box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end bg-slate-950 p-3.5 rounded-2xl border border-dashed border-slate-800 text-xs">
              
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-450 text-amber-400">Trigger Custom Administrative Revision</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Enter visual or copy remake instructions..."
                    value={adminRevisionText}
                    onChange={(e) => setAdminRevisionText(e.target.value)}
                    className="flex-1 bg-slate-905 bg-slate-900 border border-slate-800 rounded-lg px-2 text-[10.5px] text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAdminRequestRevision(selectedAdminTask)}
                    disabled={adminSaving || !adminRevisionText.trim()}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-[10.5px] rounded-lg cursor-pointer disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    Send Back
                  </button>
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => handleDeleteCampaign(selectedAdminTask.id)}
                  disabled={adminSaving}
                  className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/20 text-rose-300 font-bold rounded-lg text-[10px] inline-flex items-center gap-1.5 cursor-pointer shadow transition-all duration-150"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Permanently Delete Campaign
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

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
