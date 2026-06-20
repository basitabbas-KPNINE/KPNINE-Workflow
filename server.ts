import express from "express";
import path from "path";
import fs from "fs";
import { DatabaseSync } from "node:sqlite";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { exec } from "child_process";
import { buildXlsx, SheetDef } from "./src/xlsxBuilder";
import { sendSlackDM, sendSlackWebhook } from "./src/slackDM";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DATABASE_PATH || path.join(process.cwd(), "pipeline.db");

// ─── SQLite Setup ────────────────────────────────────────────────────────────

let db: DatabaseSync;

function getDB(): DatabaseSync {
  if (!db) {
    // Ensure parent directory exists for SQLite file
    const dbDir = path.dirname(DB_FILE);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    db = new DatabaseSync(DB_FILE);
    db.exec(`PRAGMA journal_mode=WAL;`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        stage TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Seed default settings if missing
    const existing = db.prepare("SELECT value FROM settings WHERE key = 'slack'").get() as any;
    if (!existing) {
      db.prepare("INSERT INTO settings (key, value) VALUES ('slack', ?)").run(
        JSON.stringify({ webhookUrl: "", enabled: false, memberId: "", logs: [] })
      );
    }
  }
  return db;
}

// ─── DB Helpers ──────────────────────────────────────────────────────────────

function getAllTasks(): any[] {
  const rows = getDB().prepare("SELECT data FROM tasks ORDER BY created_at DESC").all() as any[];
  return rows.map((r) => JSON.parse(r.data));
}

function getTaskById(id: string): any | null {
  const row = getDB().prepare("SELECT data FROM tasks WHERE id = ?").get(id) as any;
  return row ? JSON.parse(row.data) : null;
}

function upsertTask(task: any): void {
  getDB()
    .prepare(`
      INSERT INTO tasks (id, data, created_at, updated_at, stage)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at, stage=excluded.stage
    `)
    .run(task.id, JSON.stringify(task), task.createdAt, task.updatedAt, task.stage);
}

function deleteTask(id: string): boolean {
  const result = getDB().prepare("DELETE FROM tasks WHERE id = ?").run(id) as any;
  getDB().prepare("DELETE FROM activities WHERE task_id = ?").run(id);
  return result.changes > 0;
}

function getAllActivities(): any[] {
  const rows = getDB().prepare("SELECT data FROM activities ORDER BY created_at DESC LIMIT 200").all() as any[];
  return rows.map((r) => JSON.parse(r.data));
}

function insertActivity(activity: any): void {
  getDB()
    .prepare("INSERT INTO activities (id, task_id, data, created_at) VALUES (?, ?, ?, ?)")
    .run(activity.id, activity.taskId, JSON.stringify(activity), activity.timestamp);
}

function getSlackSettings(): any {
  const row = getDB().prepare("SELECT value FROM settings WHERE key = 'slack'").get() as any;
  return row ? JSON.parse(row.value) : { webhookUrl: "", enabled: false, memberId: "", logs: [] };
}

function saveSlackSettings(settings: any): void {
  getDB()
    .prepare("INSERT INTO settings (key, value) VALUES ('slack', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    .run(JSON.stringify(settings));
}

// ─── Slack Dispatcher ────────────────────────────────────────────────────────

async function dispatchSlackNotification(params: {
  event: string;
  clientName: string;
  title: string;
  stage: string;
  actorName: string;
  actorRole: string;
  assignedPerson: string;
  additionalDetails?: string;
  assignedPersonSlackId?: string; // DM this specific person
}) {
  const settings = getSlackSettings();
  const webhookUrl = settings.webhookUrl || process.env.SLACK_WEBHOOK_URL || "";
  const botToken = settings.botToken || process.env.SLACK_BOT_TOKEN || "";
  const isEnabled = settings.enabled === true || (!!webhookUrl && settings.enabled !== false);

  const timestamp = new Date().toISOString();
  const emojiMap: Record<string, string> = {
    created: "📋", footage_added: "📹", edit_submitted: "🎬",
    caption_written: "✍️", published: "🚀", updated: "🔄", message: "💬",
  };
  const emoji = emojiMap[params.event] || "🔔";
  const channelMention = settings.memberId ? `<@${settings.memberId}> ` : "";
  const mainMsg = `${channelMention}${emoji} *${params.clientName}* — "${params.title}" advanced to *${params.stage.toUpperCase()}*`;

  const blocks = [
    { type: "header", text: { type: "plain_text", text: `${emoji} Campaign Workflow Update`, emoji: true } },
    { type: "section", text: { type: "mrkdwn", text: `*Client:* ${params.clientName}\n*Campaign:* *${params.title}*` } },
    { type: "divider" },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Stage:*\n\`${params.stage.toUpperCase()}\`` },
        { type: "mrkdwn", text: `*Assigned To:*\n${params.assignedPerson || "N/A"}` },
      ],
    },
    { type: "section", text: { type: "mrkdwn", text: `*Details:*\n${params.additionalDetails || "Workflow advanced."}` } },
    { type: "context", elements: [{ type: "mrkdwn", text: `_By ${params.actorName} (${params.actorRole}) at ${new Date().toLocaleTimeString()}_` }] },
  ];

  const logEntry: any = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp,
    message: `${emoji} [${params.stage.toUpperCase()}] ${params.clientName} — ${params.title}`,
    success: false, error: "", dmSent: false,
  };

  if (isEnabled) {
    // 1. Try DM to the assigned person if botToken + their Slack ID available
    if (botToken && params.assignedPersonSlackId) {
      const dmText = `👋 Hey! You have a new task:\n*${params.clientName} — ${params.title}*\n${params.additionalDetails || ""}`;
      const dmResult = await sendSlackDM(params.assignedPersonSlackId, botToken, dmText, blocks);
      logEntry.dmSent = dmResult.ok;
      if (!dmResult.ok) logEntry.error = `DM failed: ${dmResult.error}`;
    }

    // 2. Always also post to channel webhook
    if (webhookUrl) {
      const result = await sendSlackWebhook(webhookUrl, mainMsg, blocks);
      logEntry.success = result.ok;
      if (!result.ok) logEntry.error = (logEntry.error ? logEntry.error + " | " : "") + `Webhook: ${result.error}`;
      else logEntry.success = true;
    } else if (!botToken) {
      logEntry.success = true;
      logEntry.error = "Simulated (no webhook configured)";
    }
  } else {
    logEntry.success = true;
    logEntry.error = "Slack disabled";
  }

  const fresh = getSlackSettings();
  if (!fresh.logs) fresh.logs = [];
  fresh.logs.unshift(logEntry);
  if (fresh.logs.length > 30) fresh.logs = fresh.logs.slice(0, 30);
  saveSlackSettings(fresh);
}

// ─── Gemini AI ───────────────────────────────────────────────────────────────

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// ─── API Routes ──────────────────────────────────────────────────────────────

// Tasks
app.get("/api/tasks", (_req, res) => res.json(getAllTasks()));

app.post("/api/tasks", (req, res) => {
  const task = {
    id: "task-" + Date.now(),
    clientName: req.body.clientName || "Unnamed Client",
    title: req.body.title || "Untitled",
    description: req.body.description || "",
    format: req.body.format || "Video",
    stage: req.body.stage || "planning",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignedEditor: req.body.assignedEditor || "Yasir",
    assignedWriter: req.body.assignedWriter || "Fatima Malik",
    videographerName: req.body.videographerName || "Basit",
    isViewedByNextRole: false,
    ...req.body,
  };

  upsertTask(task);

  const activity = {
    id: "act-" + Date.now(),
    taskId: task.id,
    taskTitle: task.title,
    clientName: task.clientName,
    userId: req.body.userId || "u-sys",
    userName: req.body.userName || "Planner",
    userRole: req.body.userRole || "Planner",
    action: "created",
    timestamp: new Date().toISOString(),
    details: `Created "${task.title}" for ${task.clientName}.`,
  };
  insertActivity(activity);

  dispatchSlackNotification({
    event: "created",
    clientName: task.clientName,
    title: task.title,
    stage: task.stage,
    actorName: req.body.userName || "Planner",
    actorRole: req.body.userRole || "Planner",
    assignedPerson: task.assignedEditor,
    additionalDetails: `Campaign created. Advanced to *${task.stage.toUpperCase()}* queue.`,
  }).catch(console.error);

  res.status(201).json(task);
});

app.put("/api/tasks/:id", (req, res) => {
  const existing = getTaskById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Task not found" });

  const previousStage = existing.stage;
  const updated = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
  upsertTask(updated);

  let actionSlug = "updated";
  if (req.body.stage && req.body.stage !== previousStage) {
    const map: Record<string, string> = {
      editing: "footage_added", writing: "edit_submitted",
      publishing: "caption_written", completed: "published",
    };
    actionSlug = map[req.body.stage] || "updated";
  }

  const activity = {
    id: "act-" + Date.now(),
    taskId: updated.id,
    taskTitle: updated.title,
    clientName: updated.clientName,
    userId: req.body.$actionUserId || "u-sys",
    userName: req.body.$actionUserName || "System",
    userRole: req.body.$actionUserRole || "System",
    action: actionSlug,
    timestamp: new Date().toISOString(),
    details: req.body.$actionDetails || `Updated "${updated.title}".`,
  };
  insertActivity(activity);

  if (req.body.stage && req.body.stage !== previousStage) {
    const assignMap: Record<string, string> = {
      editing: updated.assignedEditor,
      writing: updated.assignedWriter,
      publishing: "Publisher",
      completed: "Everyone 🎉",
    };
    dispatchSlackNotification({
      event: actionSlug,
      clientName: updated.clientName,
      title: updated.title,
      stage: updated.stage,
      actorName: req.body.$actionUserName || "System",
      actorRole: req.body.$actionUserRole || "System",
      assignedPerson: assignMap[updated.stage] || "N/A",
      additionalDetails: req.body.$actionDetails,
    }).catch(console.error);
  }

  res.json(updated);
});

app.delete("/api/tasks/:id", (req, res) => {
  if (!deleteTask(req.params.id)) return res.status(404).json({ error: "Not found" });
  res.json({ success: true });
});

// Activities
app.get("/api/activities", (_req, res) => res.json(getAllActivities()));

app.post("/api/activities", (req, res) => {
  const activity = {
    id: "act-" + Date.now(),
    taskId: req.body.taskId || "",
    taskTitle: req.body.taskTitle || "General",
    clientName: req.body.clientName || "N/A",
    userId: req.body.userId || "u-anon",
    userName: req.body.userName || "Anonymous",
    userRole: req.body.userRole || "Editor",
    action: req.body.action || "message",
    timestamp: new Date().toISOString(),
    details: req.body.details || "",
  };
  insertActivity(activity);

  dispatchSlackNotification({
    event: "updated",
    clientName: activity.clientName,
    title: activity.taskTitle,
    stage: "test",
    actorName: activity.userName,
    actorRole: activity.userRole,
    assignedPerson: "Slack Channel",
    additionalDetails: activity.details || "Test notification from pipeline.",
  }).catch(console.error);

  res.status(201).json(activity);
});

// Settings (Slack)
app.get("/api/settings", (_req, res) => {
  const s = getSlackSettings();
  res.json({
    slackWebhookUrl: s.webhookUrl, slackEnabled: s.enabled,
    slackMemberId: s.memberId, slackBotToken: s.botToken ? "••••••" : "",
    hasBotToken: !!s.botToken, lastSlackLogs: s.logs || [],
  });
});

app.post("/api/settings", (req, res) => {
  const current = getSlackSettings();
  const updated = {
    webhookUrl: typeof req.body.slackWebhookUrl === "string" ? req.body.slackWebhookUrl : current.webhookUrl,
    enabled: typeof req.body.slackEnabled === "boolean" ? req.body.slackEnabled : current.enabled,
    memberId: typeof req.body.slackMemberId === "string" ? req.body.slackMemberId : current.memberId,
    // Only update botToken if a real value sent (not masked "••••••")
    botToken: (typeof req.body.slackBotToken === "string" && req.body.slackBotToken && !req.body.slackBotToken.includes("•"))
      ? req.body.slackBotToken : (current.botToken || ""),
    logs: current.logs || [],
  };
  saveSlackSettings(updated);
  res.json({
    slackWebhookUrl: updated.webhookUrl, slackEnabled: updated.enabled,
    slackMemberId: updated.memberId, hasBotToken: !!updated.botToken,
    lastSlackLogs: updated.logs,
  });
});

app.post("/api/settings/clear-logs", (_req, res) => {
  const s = getSlackSettings();
  s.logs = [];
  saveSlackSettings(s);
  res.json({ success: true });
});

// ─── Open Local Folder (Windows File Explorer) ───────────────────────────────

app.post("/api/open-folder", (req, res) => {
  const { path: folderPath } = req.body;
  if (!folderPath || typeof folderPath !== "string") {
    return res.status(400).json({ error: "No path provided" });
  }
  // Sanitize: only allow drive paths and UNC paths
  const safe = folderPath.trim();
  if (!/^([A-Za-z]:\\|\\\\)/.test(safe) && !safe.startsWith("/")) {
    return res.status(400).json({ error: "Invalid path format" });
  }
  const cmd = process.platform === "win32"
    ? `explorer "${safe.replace(/\//g, "\\")}"`
    : process.platform === "darwin"
    ? `open "${safe}"`
    : `xdg-open "${safe}"`;

  exec(cmd, (err) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ success: true });
  });
});

app.get("/api/download-launcher", (_req, res) => {
  const batContent = [
    "@echo off",
    "echo ========================================================",
    "echo   LOCAL EXPLORER CONNECTOR PROTOCOL INSTALLER",
    "echo ========================================================",
    "echo.",
    "net session >nul 2>&1",
    "if %errorLevel% NEQ 0 (",
    "    echo [ERROR] Please run this script as an Administrator!",
    "    echo Right-click this file and select \"Run as administrator\".",
    "    echo.",
    "    pause",
    "    exit /b 1",
    ")",
    "echo [1/3] Registering local-folder:// scheme in Windows Registry...",
    "reg add \"HKCR\\local-folder\" /ve /t REG_SZ /d \"URL:Local Folder Protocol\" /f >nul 2>&1",
    "reg add \"HKCR\\local-folder\" /v \"URL Protocol\" /t REG_SZ /d \"\" /f >nul 2>&1",
    "reg add \"HKCR\\local-folder\\shell\" /f >nul 2>&1",
    "reg add \"HKCR\\local-folder\\shell\\open\" /f >nul 2>&1",
    "echo [2/3] Configuring PowerShell command handler...",
    "reg add \"HKCR\\local-folder\\shell\\open\\command\" /ve /t REG_SZ /d \"powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \\\"\\$u = '%%1'; \\$p = [System.Uri]::UnescapeDataString(\\$u); if (\\$p.StartsWith('local-folder://')) { \\$p = \\$p.SubString(15) }; explorer.exe \\$p\\\"\" /f >nul 2>&1",
    "echo [3/3] Finalizing setup...",
    "echo.",
    "echo [SUCCESS] local-folder:// protocol configured successfully!",
    "echo You can now click \"Open Folder\" inside your web browser to open folders on your local computer.",
    "echo.",
    "pause"
  ].join("\r\n");

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", "attachment; filename=setup-local-folder.bat");
  res.send(batContent);
});

// ─── Multi-Sheet XLSX Export ─────────────────────────────────────────────────

app.get("/api/export/xlsx", async (_req, res) => {
  const tasks = getAllTasks();
  const acts = getAllActivities();
  const date = new Date().toISOString().slice(0, 10);

  // Sheet 1: All Campaigns overview
  const allSheet: SheetDef = {
    name: "All Campaigns",
    headers: ["ID", "Client", "Title", "Format", "Stage", "Created", "Editor", "Writer", "Revisions", "Published Platforms"],
    rows: tasks.map((t) => [
      t.id, t.clientName, t.title, t.format, t.stage,
      t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "",
      t.assignedEditor || "", t.assignedWriter || "",
      t.revisionCount || 0,
      (t.submissions || []).map((s: any) => s.platform).join(", ") || t.publishedPlatform || "",
    ]),
  };

  // Sheet 2: Planning dept
  const planningSheet: SheetDef = {
    name: "Planning",
    headers: ["ID", "Client", "Title", "Format", "Brief", "Assigned Editor", "Assigned Writer", "Raw Footage Path", "Created"],
    rows: tasks.filter((t) => t.stage === "planning" || t.createdAt).map((t) => [
      t.id, t.clientName, t.title, t.format,
      (t.description || "").replace(/\n/g, " "),
      t.assignedEditor || "", t.assignedWriter || "",
      t.rawFootagePath || t.rawFootageLink || "",
      t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "",
    ]),
  };

  // Sheet 3: Video Editors
  const editingSheet: SheetDef = {
    name: "Video Editors",
    headers: ["ID", "Client", "Title", "Format", "Editor", "Edit Path", "Edit Link", "Notes", "Submitted At", "Revisions"],
    rows: tasks.filter((t) => ["editing", "writing", "publishing", "completed"].includes(t.stage)).map((t) => [
      t.id, t.clientName, t.title, t.format,
      t.editorName || t.assignedEditor || "",
      t.editedFilePath || "", t.editedFileLink || "",
      (t.editorNotes || "").replace(/\n/g, " "),
      t.editorSubmittedAt ? new Date(t.editorSubmittedAt).toLocaleDateString() : "",
      t.revisionCount || 0,
    ]),
  };

  // Sheet 4: Writers / Captions
  const writingSheet: SheetDef = {
    name: "Writers",
    headers: ["ID", "Client", "Title", "Writer", "Caption", "Hashtags", "Writer Notes", "Submitted At"],
    rows: tasks.filter((t) => t.captionText).map((t) => [
      t.id, t.clientName, t.title,
      t.writerName || t.assignedWriter || "",
      (t.captionText || "").replace(/\n/g, " "),
      t.hashtags || "",
      (t.writerNotes || "").replace(/\n/g, " "),
      t.writerSubmittedAt ? new Date(t.writerSubmittedAt).toLocaleDateString() : "",
    ]),
  };

  // Sheet 5: Published / Platform
  const publishedSheet: SheetDef = {
    name: "Published",
    headers: ["Client", "Title", "Platform", "Status", "Live URL", "Publisher Notes", "Published At"],
    rows: tasks
      .filter((t) => t.stage === "completed" || t.submissions?.length)
      .flatMap((t) => {
        if (t.submissions?.length) {
          return t.submissions.map((s: any) => [
            t.clientName, t.title, s.platform,
            s.status || "published", s.link || "",
            (s.notes || "").replace(/\n/g, " "),
            s.publishedAt ? new Date(s.publishedAt).toLocaleDateString() : "",
          ]);
        }
        return [[
          t.clientName, t.title, t.publishedPlatform || "",
          "published", t.publishedLink || "",
          (t.publisherNotes || "").replace(/\n/g, " "),
          t.publisherSubmittedAt ? new Date(t.publisherSubmittedAt).toLocaleDateString() : "",
        ]];
      }),
  };

  // Sheet 6: Revisions
  const revisionSheet: SheetDef = {
    name: "Revisions",
    headers: ["Client", "Title", "Revision #", "Requested By", "Stage", "Reason", "Requested At"],
    rows: tasks
      .filter((t) => t.revisions?.length)
      .flatMap((t) =>
        (t.revisions || []).map((r: any, i: number) => [
          t.clientName, t.title, i + 1,
          r.requestedBy || "", r.stage || "",
          (r.reason || "").replace(/\n/g, " "),
          r.requestedAt ? new Date(r.requestedAt).toLocaleDateString() : "",
        ])
      ),
  };

  // Sheet 7: Activity Log
  const activitySheet: SheetDef = {
    name: "Activity Log",
    headers: ["Task", "Client", "User", "Role", "Action", "Details", "Timestamp"],
    rows: acts.slice(0, 500).map((a) => [
      a.taskTitle, a.clientName, a.userName, a.userRole,
      a.action, (a.details || "").replace(/\n/g, " "),
      a.timestamp ? new Date(a.timestamp).toLocaleString() : "",
    ]),
  };

  try {
    const xlsx = buildXlsx([allSheet, planningSheet, editingSheet, writingSheet, publishedSheet, revisionSheet, activitySheet]);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="pipeline-${date}.xlsx"`);
    res.send(xlsx);
  } catch (err: any) {
    res.status(500).json({ error: "Excel generation failed", details: err.message });
  }
});

// Legacy CSV export (single sheet, kept for compatibility)
app.get("/api/export/csv", (_req, res) => {
  const tasks = getAllTasks();
  const headers = ["Campaign ID", "Client Name", "Title", "Format", "Stage", "Created", "Editor", "Writer", "Caption", "Hashtags", "Platform", "Published Link", "Notes"];
  const rows = tasks.map((t) => [
    t.id, t.clientName, t.title, t.format, t.stage,
    t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "",
    t.assignedEditor || "", t.assignedWriter || "",
    (t.captionText || "").replace(/\n/g, " "),
    (t.hashtags || "").replace(/\n/g, " "),
    t.publishedPlatform || "", t.publishedLink || "",
    (t.publisherNotes || "").replace(/\n/g, " "),
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="pipeline-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

// Activities CSV export
app.get("/api/export/activities-csv", (_req, res) => {
  const acts = getAllActivities();
  const headers = ["ID", "Task", "Client", "User", "Role", "Action", "Timestamp", "Details"];
  const rows = acts.map((a) => [
    a.id, a.taskTitle, a.clientName, a.userName, a.userRole,
    a.action, a.timestamp, (a.details || "").replace(/\n/g, " "),
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="activities-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

// Bulk import
app.post("/api/tasks/bulk-import", (req, res) => {
  const imported = req.body.tasks;
  if (!Array.isArray(imported)) return res.status(400).json({ error: "Expected tasks array" });
  getDB().exec("DELETE FROM tasks");
  for (const task of imported) upsertTask({ ...task, updatedAt: new Date().toISOString() });
  const act = {
    id: "act-import-" + Date.now(), taskId: "all", taskTitle: "CSV Import",
    clientName: "Import", userId: "u-sys", userName: "System", userRole: "Dashboard",
    action: "csv_imported", timestamp: new Date().toISOString(),
    details: `Imported ${imported.length} campaigns from CSV.`,
  };
  insertActivity(act);
  res.json({ success: true, count: imported.length });
});

// ─── Settings — extended with Bot Token & per-user member IDs ─────────────────

app.get("/api/settings/team", (_req, res) => {
  const row = getDB().prepare("SELECT value FROM settings WHERE key = 'team'").get() as any;
  res.json(row ? JSON.parse(row.value) : { members: [] });
});

app.post("/api/settings/team", (req, res) => {
  getDB()
    .prepare("INSERT INTO settings (key, value) VALUES ('team', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    .run(JSON.stringify(req.body));
  res.json({ success: true });
});

// Reset
app.post("/api/reset", (_req, res) => {
  getDB().exec("DELETE FROM tasks; DELETE FROM activities;");
  res.json({ success: true, message: "Database cleared." });
});

// Gemini AI
app.post("/api/ai/caption", async (req, res) => {
  const { clientName, title, description, format, editorNotes } = req.body;
  const client = getGeminiClient();

  if (!client) {
    setTimeout(() => {
      res.json({
        captions: [
          { style: "Hook-Focused", text: `Stop scrolling! 🚨 ${clientName} just dropped "${title}" — and it's exactly what you needed to see. Check link in bio! ✨` },
          { style: "Short & Punchy", text: `${title} by ${clientName}. 😮‍💨 Tap the link! #Trending` },
          { style: "Aesthetic & Relatable", text: `Taking a moment to appreciate this. ☕️ ${description || `Brought to you by ${clientName}`}. What do you think? 👇` },
        ],
        hashtags: `#${clientName.replace(/\s+/g, "").toLowerCase()} #${title.replace(/\s+/g, "").toLowerCase()} #socialmedia #content #agency`,
      });
    }, 800);
    return;
  }

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Write 3 social media captions + hashtags for:\nClient: ${clientName}\nTitle: ${title}\nBrief: ${description}\nFormat: ${format}\nNotes: ${editorNotes || "none"}`,
      config: {
        systemInstruction: "You are an elite social media copywriter. Write engaging, culturally-aware captions with emojis, hooks, and relevant hashtags. Avoid corporate speak.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            captions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  style: { type: Type.STRING },
                  text: { type: Type.STRING },
                },
                required: ["style", "text"],
              },
            },
            hashtags: { type: Type.STRING },
          },
          required: ["captions", "hashtags"],
        },
      },
    });
    res.json(JSON.parse(response.text!));
  } catch (err: any) {
    res.status(500).json({ error: "AI generation failed", details: err.message });
  }
});

// ─── Vite / Static ───────────────────────────────────────────────────────────

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`\n🚀 Social Media Pipeline running on http://localhost:${PORT}`);
    console.log(`📦 Database: ${DB_FILE}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}\n`);
  });
}

startServer();
