var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_node_sqlite = require("node:sqlite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_child_process = require("child_process");

// src/xlsxBuilder.ts
function escapeXml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}
function colLetter(n) {
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + n % 26) + s;
    n = Math.floor(n / 26);
  }
  return s;
}
function cellRef(col, row) {
  return `${colLetter(col)}${row}`;
}
function buildSheetXml(headers, rows) {
  const totalCols = headers.length;
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>`;
  xml += `<row r="1">`;
  headers.forEach((h, ci) => {
    xml += `<c r="${cellRef(ci + 1, 1)}" t="inlineStr" s="1"><is><t>${escapeXml(h)}</t></is></c>`;
  });
  xml += `</row>`;
  rows.forEach((row, ri) => {
    xml += `<row r="${ri + 2}">`;
    row.forEach((cell, ci) => {
      const val = cell ?? "";
      if (typeof val === "number") {
        xml += `<c r="${cellRef(ci + 1, ri + 2)}"><v>${val}</v></c>`;
      } else {
        xml += `<c r="${cellRef(ci + 1, ri + 2)}" t="inlineStr"><is><t>${escapeXml(String(val))}</t></is></c>`;
      }
    });
    xml += `</row>`;
  });
  xml += `</sheetData></worksheet>`;
  return xml;
}
var crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    t[i] = c;
  }
  return t;
})();
function crc32(buf) {
  let crc = 4294967295;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 255] ^ crc >>> 8;
  return (crc ^ 4294967295) >>> 0;
}
function deflateSync(buf) {
  const zlib = require("zlib");
  return zlib.deflateRawSync(buf, { level: 6 });
}
function uint16LE(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
}
function uint32LE(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n);
  return b;
}
function buildZip(files) {
  const entries = [];
  let offset = 0;
  const localParts = [];
  for (const file of files) {
    const data = Buffer.from(file.content, "utf8");
    const compressed = deflateSync(data);
    const crc = crc32(data);
    const nameBytes = Buffer.from(file.name, "utf8");
    const local = Buffer.concat([
      Buffer.from([80, 75, 3, 4]),
      // signature
      uint16LE(20),
      // version needed
      uint16LE(0),
      // flags
      uint16LE(8),
      // compression: deflate
      uint16LE(0),
      // mod time
      uint16LE(0),
      // mod date
      uint32LE(crc),
      uint32LE(compressed.length),
      uint32LE(data.length),
      uint16LE(nameBytes.length),
      uint16LE(0),
      // extra length
      nameBytes,
      compressed
    ]);
    entries.push({ name: file.name, data, compressed, crc, offset });
    offset += local.length;
    localParts.push(local);
  }
  const cdParts = [];
  for (const e of entries) {
    const nameBytes = Buffer.from(e.name, "utf8");
    cdParts.push(Buffer.concat([
      Buffer.from([80, 75, 1, 2]),
      // signature
      uint16LE(20),
      uint16LE(20),
      // versions
      uint16LE(0),
      // flags
      uint16LE(8),
      // deflate
      uint16LE(0),
      uint16LE(0),
      // time/date
      uint32LE(e.crc),
      uint32LE(e.compressed.length),
      uint32LE(e.data.length),
      uint16LE(nameBytes.length),
      uint16LE(0),
      uint16LE(0),
      // extra, comment
      uint16LE(0),
      uint16LE(0),
      // disk, attr
      uint32LE(0),
      // ext attr
      uint32LE(e.offset),
      // local header offset
      nameBytes
    ]));
  }
  const cdBuf = Buffer.concat(cdParts);
  const cdOffset = offset;
  const eocd = Buffer.concat([
    Buffer.from([80, 75, 5, 6]),
    uint16LE(0),
    uint16LE(0),
    uint16LE(entries.length),
    uint16LE(entries.length),
    uint32LE(cdBuf.length),
    uint32LE(cdOffset),
    uint16LE(0)
  ]);
  return Buffer.concat([...localParts, cdBuf, eocd]);
}
function buildXlsx(sheets) {
  const styleXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts><font><b/><sz val="11"/></font><font><sz val="11"/></font></fonts>
<fills><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs>
  <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
</styleSheet>`;
  const sheetRels = sheets.map((_, i) => ({
    id: `rId${i + 1}`,
    name: `sheet${i + 1}.xml`,
    sheetName: _.name
  }));
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
${sheetRels.map((s, i) => `<sheet name="${escapeXml(s.sheetName)}" sheetId="${i + 1}" r:id="${s.id}"/>`).join("\n")}
</sheets>
</workbook>`;
  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheetRels.map((s) => `<Relationship Id="${s.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/${s.name}"/>`).join("\n")}
<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${sheetRels.map((s) => `<Override PartName="/xl/worksheets/${s.name}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("\n")}
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  const files = [
    { name: "[Content_Types].xml", content: contentTypesXml },
    { name: "_rels/.rels", content: rootRelsXml },
    { name: "xl/workbook.xml", content: workbookXml },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRelsXml },
    { name: "xl/styles.xml", content: styleXml }
  ];
  sheets.forEach((sheet, i) => {
    files.push({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      content: buildSheetXml(sheet.headers, sheet.rows)
    });
  });
  return buildZip(files);
}

// src/slackDM.ts
async function sendSlackDM(memberId, botToken, message, blocks) {
  try {
    const openRes = await fetch("https://slack.com/api/conversations.open", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${botToken}` },
      body: JSON.stringify({ users: memberId })
    });
    const openData = await openRes.json();
    if (!openData.ok) return { ok: false, error: openData.error };
    const channelId = openData.channel?.id;
    const postRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${botToken}` },
      body: JSON.stringify({ channel: channelId, text: message, blocks })
    });
    const postData = await postRes.json();
    return { ok: postData.ok, error: postData.error };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
async function sendSlackWebhook(webhookUrl, text, blocks) {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, blocks })
    });
    return { ok: res.ok, error: res.ok ? void 0 : `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// server.ts
import_dotenv.default.config();
var app = (0, import_express.default)();
app.use(import_express.default.json({ limit: "10mb" }));
var PORT = process.env.PORT || 3e3;
var DB_FILE = import_path.default.join(process.cwd(), "pipeline.db");
var db;
function getDB() {
  if (!db) {
    db = new import_node_sqlite.DatabaseSync(DB_FILE);
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
    const existing = db.prepare("SELECT value FROM settings WHERE key = 'slack'").get();
    if (!existing) {
      db.prepare("INSERT INTO settings (key, value) VALUES ('slack', ?)").run(
        JSON.stringify({ webhookUrl: "", enabled: false, memberId: "", logs: [] })
      );
    }
  }
  return db;
}
function getAllTasks() {
  const rows = getDB().prepare("SELECT data FROM tasks ORDER BY created_at DESC").all();
  return rows.map((r) => JSON.parse(r.data));
}
function getTaskById(id) {
  const row = getDB().prepare("SELECT data FROM tasks WHERE id = ?").get(id);
  return row ? JSON.parse(row.data) : null;
}
function upsertTask(task) {
  getDB().prepare(`
      INSERT INTO tasks (id, data, created_at, updated_at, stage)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at, stage=excluded.stage
    `).run(task.id, JSON.stringify(task), task.createdAt, task.updatedAt, task.stage);
}
function deleteTask(id) {
  const result = getDB().prepare("DELETE FROM tasks WHERE id = ?").run(id);
  getDB().prepare("DELETE FROM activities WHERE task_id = ?").run(id);
  return result.changes > 0;
}
function getAllActivities() {
  const rows = getDB().prepare("SELECT data FROM activities ORDER BY created_at DESC LIMIT 200").all();
  return rows.map((r) => JSON.parse(r.data));
}
function insertActivity(activity) {
  getDB().prepare("INSERT INTO activities (id, task_id, data, created_at) VALUES (?, ?, ?, ?)").run(activity.id, activity.taskId, JSON.stringify(activity), activity.timestamp);
}
function getSlackSettings() {
  const row = getDB().prepare("SELECT value FROM settings WHERE key = 'slack'").get();
  return row ? JSON.parse(row.value) : { webhookUrl: "", enabled: false, memberId: "", logs: [] };
}
function saveSlackSettings(settings) {
  getDB().prepare("INSERT INTO settings (key, value) VALUES ('slack', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(settings));
}
async function dispatchSlackNotification(params) {
  const settings = getSlackSettings();
  const webhookUrl = settings.webhookUrl || process.env.SLACK_WEBHOOK_URL || "";
  const botToken = settings.botToken || process.env.SLACK_BOT_TOKEN || "";
  const isEnabled = settings.enabled === true || !!webhookUrl && settings.enabled !== false;
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const emojiMap = {
    created: "\u{1F4CB}",
    footage_added: "\u{1F4F9}",
    edit_submitted: "\u{1F3AC}",
    caption_written: "\u270D\uFE0F",
    published: "\u{1F680}",
    updated: "\u{1F504}",
    message: "\u{1F4AC}"
  };
  const emoji = emojiMap[params.event] || "\u{1F514}";
  const channelMention = settings.memberId ? `<@${settings.memberId}> ` : "";
  const mainMsg = `${channelMention}${emoji} *${params.clientName}* \u2014 "${params.title}" advanced to *${params.stage.toUpperCase()}*`;
  const blocks = [
    { type: "header", text: { type: "plain_text", text: `${emoji} Campaign Workflow Update`, emoji: true } },
    { type: "section", text: { type: "mrkdwn", text: `*Client:* ${params.clientName}
*Campaign:* *${params.title}*` } },
    { type: "divider" },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Stage:*
\`${params.stage.toUpperCase()}\`` },
        { type: "mrkdwn", text: `*Assigned To:*
${params.assignedPerson || "N/A"}` }
      ]
    },
    { type: "section", text: { type: "mrkdwn", text: `*Details:*
${params.additionalDetails || "Workflow advanced."}` } },
    { type: "context", elements: [{ type: "mrkdwn", text: `_By ${params.actorName} (${params.actorRole}) at ${(/* @__PURE__ */ new Date()).toLocaleTimeString()}_` }] }
  ];
  const logEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp,
    message: `${emoji} [${params.stage.toUpperCase()}] ${params.clientName} \u2014 ${params.title}`,
    success: false,
    error: "",
    dmSent: false
  };
  if (isEnabled) {
    if (botToken && params.assignedPersonSlackId) {
      const dmText = `\u{1F44B} Hey! You have a new task:
*${params.clientName} \u2014 ${params.title}*
${params.additionalDetails || ""}`;
      const dmResult = await sendSlackDM(params.assignedPersonSlackId, botToken, dmText, blocks);
      logEntry.dmSent = dmResult.ok;
      if (!dmResult.ok) logEntry.error = `DM failed: ${dmResult.error}`;
    }
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
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    aiClient = new import_genai.GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}
app.get("/api/tasks", (_req, res) => res.json(getAllTasks()));
app.post("/api/tasks", (req, res) => {
  const task = {
    id: "task-" + Date.now(),
    clientName: req.body.clientName || "Unnamed Client",
    title: req.body.title || "Untitled",
    description: req.body.description || "",
    format: req.body.format || "Video",
    stage: req.body.stage || "planning",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    assignedEditor: req.body.assignedEditor || "Yasir",
    assignedWriter: req.body.assignedWriter || "Fatima Malik",
    videographerName: req.body.videographerName || "Basit",
    isViewedByNextRole: false,
    ...req.body
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
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    details: `Created "${task.title}" for ${task.clientName}.`
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
    additionalDetails: `Campaign created. Advanced to *${task.stage.toUpperCase()}* queue.`
  }).catch(console.error);
  res.status(201).json(task);
});
app.put("/api/tasks/:id", (req, res) => {
  const existing = getTaskById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Task not found" });
  const previousStage = existing.stage;
  const updated = { ...existing, ...req.body, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  upsertTask(updated);
  let actionSlug = "updated";
  if (req.body.stage && req.body.stage !== previousStage) {
    const map = {
      editing: "footage_added",
      writing: "edit_submitted",
      publishing: "caption_written",
      completed: "published"
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
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    details: req.body.$actionDetails || `Updated "${updated.title}".`
  };
  insertActivity(activity);
  if (req.body.stage && req.body.stage !== previousStage) {
    const assignMap = {
      editing: updated.assignedEditor,
      writing: updated.assignedWriter,
      publishing: "Publisher",
      completed: "Everyone \u{1F389}"
    };
    dispatchSlackNotification({
      event: actionSlug,
      clientName: updated.clientName,
      title: updated.title,
      stage: updated.stage,
      actorName: req.body.$actionUserName || "System",
      actorRole: req.body.$actionUserRole || "System",
      assignedPerson: assignMap[updated.stage] || "N/A",
      additionalDetails: req.body.$actionDetails
    }).catch(console.error);
  }
  res.json(updated);
});
app.delete("/api/tasks/:id", (req, res) => {
  if (!deleteTask(req.params.id)) return res.status(404).json({ error: "Not found" });
  res.json({ success: true });
});
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
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    details: req.body.details || ""
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
    additionalDetails: activity.details || "Test notification from pipeline."
  }).catch(console.error);
  res.status(201).json(activity);
});
app.get("/api/settings", (_req, res) => {
  const s = getSlackSettings();
  res.json({
    slackWebhookUrl: s.webhookUrl,
    slackEnabled: s.enabled,
    slackMemberId: s.memberId,
    slackBotToken: s.botToken ? "\u2022\u2022\u2022\u2022\u2022\u2022" : "",
    hasBotToken: !!s.botToken,
    lastSlackLogs: s.logs || []
  });
});
app.post("/api/settings", (req, res) => {
  const current = getSlackSettings();
  const updated = {
    webhookUrl: typeof req.body.slackWebhookUrl === "string" ? req.body.slackWebhookUrl : current.webhookUrl,
    enabled: typeof req.body.slackEnabled === "boolean" ? req.body.slackEnabled : current.enabled,
    memberId: typeof req.body.slackMemberId === "string" ? req.body.slackMemberId : current.memberId,
    // Only update botToken if a real value sent (not masked "••••••")
    botToken: typeof req.body.slackBotToken === "string" && req.body.slackBotToken && !req.body.slackBotToken.includes("\u2022") ? req.body.slackBotToken : current.botToken || "",
    logs: current.logs || []
  };
  saveSlackSettings(updated);
  res.json({
    slackWebhookUrl: updated.webhookUrl,
    slackEnabled: updated.enabled,
    slackMemberId: updated.memberId,
    hasBotToken: !!updated.botToken,
    lastSlackLogs: updated.logs
  });
});
app.post("/api/settings/clear-logs", (_req, res) => {
  const s = getSlackSettings();
  s.logs = [];
  saveSlackSettings(s);
  res.json({ success: true });
});
app.post("/api/open-folder", (req, res) => {
  const { path: folderPath } = req.body;
  if (!folderPath || typeof folderPath !== "string") {
    return res.status(400).json({ error: "No path provided" });
  }
  const safe = folderPath.trim();
  if (!/^([A-Za-z]:\\|\\\\)/.test(safe) && !safe.startsWith("/")) {
    return res.status(400).json({ error: "Invalid path format" });
  }
  const cmd = process.platform === "win32" ? `explorer "${safe.replace(/\//g, "\\")}"` : process.platform === "darwin" ? `open "${safe}"` : `xdg-open "${safe}"`;
  (0, import_child_process.exec)(cmd, (err) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ success: true });
  });
});
app.get("/api/export/xlsx", async (_req, res) => {
  const tasks = getAllTasks();
  const acts = getAllActivities();
  const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const allSheet = {
    name: "All Campaigns",
    headers: ["ID", "Client", "Title", "Format", "Stage", "Created", "Editor", "Writer", "Revisions", "Published Platforms"],
    rows: tasks.map((t) => [
      t.id,
      t.clientName,
      t.title,
      t.format,
      t.stage,
      t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "",
      t.assignedEditor || "",
      t.assignedWriter || "",
      t.revisionCount || 0,
      (t.submissions || []).map((s) => s.platform).join(", ") || t.publishedPlatform || ""
    ])
  };
  const planningSheet = {
    name: "Planning",
    headers: ["ID", "Client", "Title", "Format", "Brief", "Assigned Editor", "Assigned Writer", "Raw Footage Path", "Created"],
    rows: tasks.filter((t) => t.stage === "planning" || t.createdAt).map((t) => [
      t.id,
      t.clientName,
      t.title,
      t.format,
      (t.description || "").replace(/\n/g, " "),
      t.assignedEditor || "",
      t.assignedWriter || "",
      t.rawFootagePath || t.rawFootageLink || "",
      t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ""
    ])
  };
  const editingSheet = {
    name: "Video Editors",
    headers: ["ID", "Client", "Title", "Format", "Editor", "Edit Path", "Edit Link", "Notes", "Submitted At", "Revisions"],
    rows: tasks.filter((t) => ["editing", "writing", "publishing", "completed"].includes(t.stage)).map((t) => [
      t.id,
      t.clientName,
      t.title,
      t.format,
      t.editorName || t.assignedEditor || "",
      t.editedFilePath || "",
      t.editedFileLink || "",
      (t.editorNotes || "").replace(/\n/g, " "),
      t.editorSubmittedAt ? new Date(t.editorSubmittedAt).toLocaleDateString() : "",
      t.revisionCount || 0
    ])
  };
  const writingSheet = {
    name: "Writers",
    headers: ["ID", "Client", "Title", "Writer", "Caption", "Hashtags", "Writer Notes", "Submitted At"],
    rows: tasks.filter((t) => t.captionText).map((t) => [
      t.id,
      t.clientName,
      t.title,
      t.writerName || t.assignedWriter || "",
      (t.captionText || "").replace(/\n/g, " "),
      t.hashtags || "",
      (t.writerNotes || "").replace(/\n/g, " "),
      t.writerSubmittedAt ? new Date(t.writerSubmittedAt).toLocaleDateString() : ""
    ])
  };
  const publishedSheet = {
    name: "Published",
    headers: ["Client", "Title", "Platform", "Status", "Live URL", "Publisher Notes", "Published At"],
    rows: tasks.filter((t) => t.stage === "completed" || t.submissions?.length).flatMap((t) => {
      if (t.submissions?.length) {
        return t.submissions.map((s) => [
          t.clientName,
          t.title,
          s.platform,
          s.status || "published",
          s.link || "",
          (s.notes || "").replace(/\n/g, " "),
          s.publishedAt ? new Date(s.publishedAt).toLocaleDateString() : ""
        ]);
      }
      return [[
        t.clientName,
        t.title,
        t.publishedPlatform || "",
        "published",
        t.publishedLink || "",
        (t.publisherNotes || "").replace(/\n/g, " "),
        t.publisherSubmittedAt ? new Date(t.publisherSubmittedAt).toLocaleDateString() : ""
      ]];
    })
  };
  const revisionSheet = {
    name: "Revisions",
    headers: ["Client", "Title", "Revision #", "Requested By", "Stage", "Reason", "Requested At"],
    rows: tasks.filter((t) => t.revisions?.length).flatMap(
      (t) => (t.revisions || []).map((r, i) => [
        t.clientName,
        t.title,
        i + 1,
        r.requestedBy || "",
        r.stage || "",
        (r.reason || "").replace(/\n/g, " "),
        r.requestedAt ? new Date(r.requestedAt).toLocaleDateString() : ""
      ])
    )
  };
  const activitySheet = {
    name: "Activity Log",
    headers: ["Task", "Client", "User", "Role", "Action", "Details", "Timestamp"],
    rows: acts.slice(0, 500).map((a) => [
      a.taskTitle,
      a.clientName,
      a.userName,
      a.userRole,
      a.action,
      (a.details || "").replace(/\n/g, " "),
      a.timestamp ? new Date(a.timestamp).toLocaleString() : ""
    ])
  };
  try {
    const xlsx = buildXlsx([allSheet, planningSheet, editingSheet, writingSheet, publishedSheet, revisionSheet, activitySheet]);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="pipeline-${date}.xlsx"`);
    res.send(xlsx);
  } catch (err) {
    res.status(500).json({ error: "Excel generation failed", details: err.message });
  }
});
app.get("/api/export/csv", (_req, res) => {
  const tasks = getAllTasks();
  const headers = ["Campaign ID", "Client Name", "Title", "Format", "Stage", "Created", "Editor", "Writer", "Caption", "Hashtags", "Platform", "Published Link", "Notes"];
  const rows = tasks.map((t) => [
    t.id,
    t.clientName,
    t.title,
    t.format,
    t.stage,
    t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "",
    t.assignedEditor || "",
    t.assignedWriter || "",
    (t.captionText || "").replace(/\n/g, " "),
    (t.hashtags || "").replace(/\n/g, " "),
    t.publishedPlatform || "",
    t.publishedLink || "",
    (t.publisherNotes || "").replace(/\n/g, " ")
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="pipeline-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});
app.get("/api/export/activities-csv", (_req, res) => {
  const acts = getAllActivities();
  const headers = ["ID", "Task", "Client", "User", "Role", "Action", "Timestamp", "Details"];
  const rows = acts.map((a) => [
    a.id,
    a.taskTitle,
    a.clientName,
    a.userName,
    a.userRole,
    a.action,
    a.timestamp,
    (a.details || "").replace(/\n/g, " ")
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="activities-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});
app.post("/api/tasks/bulk-import", (req, res) => {
  const imported = req.body.tasks;
  if (!Array.isArray(imported)) return res.status(400).json({ error: "Expected tasks array" });
  getDB().exec("DELETE FROM tasks");
  for (const task of imported) upsertTask({ ...task, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  const act = {
    id: "act-import-" + Date.now(),
    taskId: "all",
    taskTitle: "CSV Import",
    clientName: "Import",
    userId: "u-sys",
    userName: "System",
    userRole: "Dashboard",
    action: "csv_imported",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    details: `Imported ${imported.length} campaigns from CSV.`
  };
  insertActivity(act);
  res.json({ success: true, count: imported.length });
});
app.get("/api/settings/team", (_req, res) => {
  const row = getDB().prepare("SELECT value FROM settings WHERE key = 'team'").get();
  res.json(row ? JSON.parse(row.value) : { members: [] });
});
app.post("/api/settings/team", (req, res) => {
  getDB().prepare("INSERT INTO settings (key, value) VALUES ('team', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(req.body));
  res.json({ success: true });
});
app.post("/api/reset", (_req, res) => {
  getDB().exec("DELETE FROM tasks; DELETE FROM activities;");
  res.json({ success: true, message: "Database cleared." });
});
app.post("/api/ai/caption", async (req, res) => {
  const { clientName, title, description, format, editorNotes } = req.body;
  const client = getGeminiClient();
  if (!client) {
    setTimeout(() => {
      res.json({
        captions: [
          { style: "Hook-Focused", text: `Stop scrolling! \u{1F6A8} ${clientName} just dropped "${title}" \u2014 and it's exactly what you needed to see. Check link in bio! \u2728` },
          { style: "Short & Punchy", text: `${title} by ${clientName}. \u{1F62E}\u200D\u{1F4A8} Tap the link! #Trending` },
          { style: "Aesthetic & Relatable", text: `Taking a moment to appreciate this. \u2615\uFE0F ${description || `Brought to you by ${clientName}`}. What do you think? \u{1F447}` }
        ],
        hashtags: `#${clientName.replace(/\s+/g, "").toLowerCase()} #${title.replace(/\s+/g, "").toLowerCase()} #socialmedia #content #agency`
      });
    }, 800);
    return;
  }
  try {
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Write 3 social media captions + hashtags for:
Client: ${clientName}
Title: ${title}
Brief: ${description}
Format: ${format}
Notes: ${editorNotes || "none"}`,
      config: {
        systemInstruction: "You are an elite social media copywriter. Write engaging, culturally-aware captions with emojis, hooks, and relevant hashtags. Avoid corporate speak.",
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            captions: {
              type: import_genai.Type.ARRAY,
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  style: { type: import_genai.Type.STRING },
                  text: { type: import_genai.Type.STRING }
                },
                required: ["style", "text"]
              }
            },
            hashtags: { type: import_genai.Type.STRING }
          },
          required: ["captions", "hashtags"]
        }
      }
    });
    res.json(JSON.parse(response.text));
  } catch (err) {
    res.status(500).json({ error: "AI generation failed", details: err.message });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => res.sendFile(import_path.default.join(distPath, "index.html")));
  }
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`
\u{1F680} Social Media Pipeline running on http://localhost:${PORT}`);
    console.log(`\u{1F4E6} Database: ${DB_FILE}`);
    console.log(`\u{1F30D} Environment: ${process.env.NODE_ENV || "development"}
`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
