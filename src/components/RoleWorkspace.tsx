import React, { useState, useRef, useEffect } from "react";
import { Task, TaskStage, RoleType, ActivityChange, Revision } from "../types";
import Dashboard from "./Dashboard";
import {
  Plus, Send, Sparkles, Copy, Check, ExternalLink, Loader2,
  FolderOpen, RefreshCw, AlertTriangle, RotateCcw, ChevronDown, ChevronUp
} from "lucide-react";

// ─── Team Config (edit these to match your actual staff) ─────────────────────
export const TEAM_MEMBERS = {
  editors: ["Yasir", "Ammar", "Zainab"],
  designers: ["Adila"],
  writers: ["Fatima Malik"],
  planners: ["Fatima Malik", "Basit"],
  publishers: ["Basit"],
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface RoleWorkspaceProps {
  activeRole: RoleType;
  tasks: Task[];
  activities?: ActivityChange[];
  onAddTask: (taskData: any) => Promise<void>;
  onUpdateTask: (id: string, updates: any) => Promise<void>;
  onTasksImported?: () => Promise<void>;
  loggedInUser?: any;
  darkMode?: boolean;
  selectedTask?: Task | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Opens a local folder path in Windows File Explorer via a server endpoint
function openLocalFolder(path: string) {
  if (!path) return;
  
  // 1. Dispatch custom event so the UI can instantly copy to clipboard and show instructions
  const event = new CustomEvent("open-local-folder", { detail: { path } });
  window.dispatchEvent(event);

  // 2. Direct-trigger custom URI handler for 1-click opening on Windows
  try {
    const encodedPath = encodeURIComponent(path);
    const link = document.createElement("a");
    link.href = `local-folder://${encodedPath}`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  } catch (err) {
    console.error("Custom protocol launch error:", err);
  }

  // 3. Fallback request to local server integration if running locally
  fetch("/api/open-folder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  }).catch(() => {
    // Fail silently in cloud environments
  });
}

// ─── Revision Request Modal ───────────────────────────────────────────────────
function RevisionModal({ task, onClose, onSubmit, userName }: {
  task: Task; onClose: () => void;
  onSubmit: (reason: string) => Promise<void>; userName: string;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    await onSubmit(reason.trim());
    setSubmitting(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h3 className="font-bold text-slate-800">Request Revision</h3>
        </div>
        <p className="text-xs text-slate-500">
          Campaign: <strong>{task.clientName} — {task.title}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Reason for revision *</label>
            <textarea
              rows={4}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe what needs to be changed or redone..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !reason.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              Send Back for Revision
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Local Path Input ─────────────────────────────────────────────────────────
function LocalPathInput({ label, value, onChange, placeholder, darkMode = true }: {
  label: string; value: string;
  onChange: (v: string) => void; placeholder: string;
  darkMode?: boolean;
}) {
  const lblClass = darkMode ? "text-zinc-400" : "text-slate-600";
  const inpClass = darkMode 
    ? "flex-1 bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-xl text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
    : "flex-1 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500";
  const btnClass = darkMode
    ? "px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 cursor-pointer flex items-center gap-1 text-xs font-semibold transition-colors"
    : "px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-600 cursor-pointer flex items-center gap-1 text-xs font-semibold transition-colors";

  return (
    <div>
      <label className={`block text-xs font-semibold mb-1 ${lblClass}`}>{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inpClass}
        />
        {value && (
          <button
            type="button"
            onClick={() => openLocalFolder(value)}
            title="Open folder in File Explorer"
            className={btnClass}
          >
            <FolderOpen className="h-3.5 w-3.5" /> Open
          </button>
        )}
      </div>
      <p className="text-[10px] text-zinc-500 mt-1">e.g. D:\Footage\GymBhai\Video4 or \\server\share\projects</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RoleWorkspace({
  activeRole, tasks, activities = [], onAddTask, onUpdateTask, onTasksImported, loggedInUser, darkMode = true, selectedTask
}: RoleWorkspaceProps) {

  const DEFAULT_CLIENTS = [
    "Roshan Zindagi","GymBhai","Powerlifting","Diabesity.Life","The Quarterdeck","TSC.Challenges Club",
    "Dr Ahmad Shahzad","Dr Ali Asad Khan","Dr Aman Ullah Bhalli","Dr Amir Shoukat","Dr Ashfaq Ali",
    "Dr Asif Islam","Dr Asim Munir Alvi","Dr Azmat Ali Khan","Dr Bilad Ul Islam","Dr Col Shakeel Mirza",
    "Dr Madeeha Nazar","Dr Mehboob Qadir","Dr Muhammad Usman","Dr Munir Azher Ch","Dr Qamar Sajjad",
    "Dr Salahudin Rind","Dr Shaista Kanwal","Dr Tahir Rasool","Dr Usman Musharraf",
    "Dr Mehmood Ulassan","Dr Shair Zaman Kakar","LDF"
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

  // ── Planner state ──
  const [plannerClient, setPlannerClient] = useState("");
  const [customPlannerClient, setCustomPlannerClient] = useState("");
  const [isCustomClientMode, setIsCustomClientMode] = useState(false);
  const [saveCustomClientOption, setSaveCustomClientOption] = useState(true);
  const [plannerPriority, setPlannerPriority] = useState<"Low" | "Medium" | "High" | "Urgent">("Medium");

  async function handleDeleteCustomClient() {
    if (!plannerClient) return;
    if (!window.confirm(`Are you sure you want to delete "${plannerClient}" from the saved clients list?`)) return;
    try {
      const res = await fetch("/api/custom-clients/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: plannerClient })
      });
      if (res.ok) {
        const data = await res.json();
        setCustomClients(data);
        setPlannerClient("");
      }
    } catch (err) {
      console.error("Error deleting custom client:", err);
    }
  }
  const [plannerStage, setPlannerStage] = useState<TaskStage>(TaskStage.EDITING);
  const [plannerDeadline, setPlannerDeadline] = useState("");
  const [plannerFormat, setPlannerFormat] = useState<"Video" | "Graphic" | "Carousel">("Video");
  const [plannerEditor, setPlannerEditor] = useState(TEAM_MEMBERS.editors[0]);
  const [plannerWriter, setPlannerWriter] = useState(TEAM_MEMBERS.writers[0]);
  const [plannerBrief, setPlannerBrief] = useState("");
  const [plannerRawPath, setPlannerRawPath] = useState("");
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // ── Planning queue state (allows Planners to manage tasks in planning stage) ──
  const [selectedPlanningTaskId, setSelectedPlanningTaskId] = useState("");
  const [lockedPlanningTask, setLockedPlanningTask] = useState<Task | null>(null);
  const [planningRawLink, setPlanningRawLink] = useState("");
  const [planningRawPath, setPlanningRawPath] = useState("");
  const [planningFootageNotes, setPlanningFootageNotes] = useState("");
  const [isDeployingPlanning, setIsDeployingPlanning] = useState(false);

  // ── Editor/Designer state — LOCKED so polling can't reset ──
  const [selectedEditorTaskId, setSelectedEditorTaskId] = useState("");
  const [lockedEditorTask, setLockedEditorTask] = useState<Task | null>(null);
  const [editedPath, setEditedPath] = useState("");
  const [editedLink, setEditedLink] = useState("");
  const [editorNotes, setEditorNotes] = useState("");
  const [isDeliverEdit, setIsDeliverEdit] = useState(false);
  const [editorRevisionTask, setEditorRevisionTask] = useState<Task | null>(null);

  // ── Writer state — LOCKED ──
  const [selectedWriterTaskId, setSelectedWriterTaskId] = useState("");
  const [lockedWriterTask, setLockedWriterTask] = useState<Task | null>(null);
  const [captionText, setCaptionText] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [writerNotes, setWriterNotes] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isSubmittingWriter, setIsSubmittingWriter] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [writerRevisionTask, setWriterRevisionTask] = useState<Task | null>(null);

  // ── Publisher state — LOCKED ──
  const [selectedPubTaskId, setSelectedPubTaskId] = useState("");
  const [lockedPubTask, setLockedPubTask] = useState<Task | null>(null);
  const [isSubmittingPub, setIsSubmittingPub] = useState(false);
  const [pubSuccess, setPubSuccess] = useState("");
  const [publishPlacements, setPublishPlacements] = useState<Record<string, { enabled: boolean; link: string; notes: string; status: string }>>({
    Instagram: { enabled: false, link: "", notes: "", status: "published" },
    TikTok: { enabled: false, link: "", notes: "", status: "published" },
    YouTube: { enabled: false, link: "", notes: "", status: "published" },
    Facebook: { enabled: false, link: "", notes: "", status: "published" },
    LinkedIn: { enabled: false, link: "", notes: "", status: "published" },
  });

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [folderHelpPath, setFolderHelpPath] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenFolderEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ path: string }>;
      const path = customEvent.detail?.path;
      if (path) {
        navigator.clipboard.writeText(path).catch((err) => {
          console.error("Clipboard write failed", err);
        });
        setFolderHelpPath(path);
      }
    };

    window.addEventListener("open-local-folder", handleOpenFolderEvent);
    return () => {
      window.removeEventListener("open-local-folder", handleOpenFolderEvent);
    };
  }, []);

  // Reset all local form selection states when activeRole changes to prevent cross-role state leakage!
  useEffect(() => {
    setSelectedPlanningTaskId("");
    setLockedPlanningTask(null);
    setPlanningRawLink("");
    setPlanningRawPath("");
    setPlanningFootageNotes("");

    setSelectedEditorTaskId("");
    setLockedEditorTask(null);
    setEditedLink("");
    setEditedPath("");
    setEditorNotes("");
    
    setSelectedWriterTaskId("");
    setLockedWriterTask(null);
    setCaptionText("");
    setHashtags("");
    setWriterNotes("");
    setAiSuggestions(null);

    setSelectedPubTaskId("");
    setLockedPubTask(null);
    setPubSuccess("");
  }, [activeRole]);

  // Synchronize card clicking in the main workspace queue to auto-select in forms!
  useEffect(() => {
    if (selectedTask) {
      if (activeRole === "Planner" && selectedTask.stage === TaskStage.PLANNING) {
        handlePlanningTaskSelect(selectedTask.id);
      } else if (activeRole === "Editor" || activeRole === "Designer") {
        const matchesFormat = activeRole === "Editor" 
          ? (selectedTask.format === "Video" || !selectedTask.format)
          : (selectedTask.format === "Graphic" || selectedTask.format === "Carousel");

        if (selectedTask.stage === TaskStage.EDITING && matchesFormat) {
          handleEditorTaskSelect(selectedTask.id);
        }
      } else if (activeRole === "Writer") {
        if (selectedTask.stage === TaskStage.WRITING) {
          handleWriterTaskSelect(selectedTask.id);
        }
      } else if (activeRole === "Publisher") {
        if (selectedTask.stage === TaskStage.PUBLISHING) {
          handlePubTaskSelect(selectedTask.id);
        }
      }
    }
  }, [selectedTask]);

  function handleCopy(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  }

  // When planner selects a task from the active planning queue
  function handlePlanningTaskSelect(taskId: string) {
    setSelectedPlanningTaskId(taskId);
    const found = tasks.find((t) => t.id === taskId) || null;
    setLockedPlanningTask(found);
    setPlanningRawLink(found?.rawFootageLink || "");
    setPlanningRawPath(found?.rawFootagePath || "");
    setPlanningFootageNotes(found?.footageNotes || "");
  }

  // When editor selects a task, LOCK it into local state
  function handleEditorTaskSelect(taskId: string) {
    setSelectedEditorTaskId(taskId);
    const found = tasks.find((t) => t.id === taskId) || null;
    setLockedEditorTask(found);
    setEditedLink(found?.editedFileLink || "");
    setEditedPath(found?.editedFilePath || "");
    setEditorNotes(found?.editorNotes || "");
  }

  // When writer selects a task, LOCK it
  function handleWriterTaskSelect(taskId: string) {
    setSelectedWriterTaskId(taskId);
    const found = tasks.find((t) => t.id === taskId) || null;
    setLockedWriterTask(found);
    setCaptionText(found?.captionText || "");
    setHashtags(found?.hashtags || "");
    setWriterNotes(found?.writerNotes || "");
    setAiSuggestions(null);
  }

  // When publisher selects a task, LOCK it — DO NOT update from polling
  function handlePubTaskSelect(taskId: string) {
    setSelectedPubTaskId(taskId);
    const found = tasks.find((t) => t.id === taskId) || null;
    setLockedPubTask(found);
    setPubSuccess("");
    // Reset placements fresh
    const fresh: typeof publishPlacements = {
      Instagram: { enabled: false, link: "", notes: "", status: "published" },
      TikTok: { enabled: false, link: "", notes: "", status: "published" },
      YouTube: { enabled: false, link: "", notes: "", status: "published" },
      Facebook: { enabled: false, link: "", notes: "", status: "published" },
      LinkedIn: { enabled: false, link: "", notes: "", status: "published" },
    };
    if (found?.submissions?.length) {
      found.submissions.forEach((s) => {
        if (s.platform in fresh) {
          fresh[s.platform] = { enabled: true, link: s.link || "", notes: s.notes || "", status: "published" };
        }
      });
    }
    setPublishPlacements(fresh);
  }

  // ── Planner Submit ──
  async function handlePlannerSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalClient = isCustomClientMode ? customPlannerClient.trim() : plannerClient;
    if (!finalClient || !plannerDeadline || !plannerBrief) return;
    setIsSubmittingTask(true);
    try {
      if (isCustomClientMode && saveCustomClientOption) {
        try {
          const clientRes = await fetch("/api/custom-clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientName: finalClient })
          });
          if (clientRes.ok) {
            const updatedCustoms = await clientRes.json();
            setCustomClients(updatedCustoms);
          }
        } catch (clientErr) {
          console.error("Error saving custom client", clientErr);
        }
      }
      await onAddTask({
        clientName: finalClient,
        title: `${plannerFormat} (${plannerDeadline})`,
        format: plannerFormat,
        assignedEditor: plannerEditor,
        assignedWriter: plannerWriter,
        description: plannerBrief,
        rawFootagePath: plannerRawPath,
        stage: plannerStage,
        priority: plannerPriority,
        userName: loggedInUser?.name || "Planner",
        userRole: "Planner",
        deadline: plannerDeadline,
      });
      setPlannerClient("");
      setCustomPlannerClient("");
      setIsCustomClientMode(false);
      setPlannerStage(TaskStage.EDITING);
      setPlannerDeadline("");
      setPlannerBrief("");
      setPlannerRawPath("");
      setPlannerPriority("Medium");
    } finally {
      setIsSubmittingTask(false);
    }
  }

  // ── Planner Deploy (Advances task in PLANNING stage to EDITING) ──
  async function handlePlanningDeploy(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlanningTaskId) return;
    setIsDeployingPlanning(true);
    try {
      await onUpdateTask(selectedPlanningTaskId, {
        rawFootageLink: planningRawLink,
        rawFootagePath: planningRawPath,
        footageNotes: planningFootageNotes,
        stage: TaskStage.EDITING,
        videographerSubmittedAt: new Date().toISOString(),
        $actionUserName: loggedInUser?.name || "Planner",
        $actionUserRole: "Planner",
        $actionDetails: `Campaign "${lockedPlanningTask?.title}" deployed from Planning stage to Visual Editing. Raw footage links verified.`,
      });
      setSelectedPlanningTaskId("");
      setLockedPlanningTask(null);
      setPlanningRawLink("");
      setPlanningRawPath("");
      setPlanningFootageNotes("");
    } finally {
      setIsDeployingPlanning(false);
    }
  }

  // ── Editor/Designer Submit ──
  async function handleEditorSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEditorTaskId || (!editedLink && !editedPath)) return;
    setIsDeliverEdit(true);
    const isDesigner = activeRole === "Designer";
    try {
      await onUpdateTask(selectedEditorTaskId, {
        editedFileLink: editedLink,
        editedFilePath: editedPath,
        editorName: loggedInUser?.name || (isDesigner ? "Designer" : "Editor"),
        editorNotes,
        editorSubmittedAt: new Date().toISOString(),
        stage: TaskStage.WRITING,
        $actionUserName: loggedInUser?.name || (isDesigner ? "Designer" : "Editor"),
        $actionUserRole: isDesigner ? "Designer" : "Editor",
        $actionDetails: `${isDesigner ? "Design" : "Edit"} completed for "${lockedEditorTask?.title}". Sent to writer.`,
      });
      setSelectedEditorTaskId(""); setLockedEditorTask(null);
      setEditedLink(""); setEditedPath(""); setEditorNotes("");
    } finally {
      setIsDeliverEdit(false);
    }
  }

  // ── Writer Submit ──
  async function handleWriterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedWriterTaskId || !captionText) return;
    setIsSubmittingWriter(true);
    try {
      await onUpdateTask(selectedWriterTaskId, {
        captionText, hashtags, writerNotes,
        writerName: loggedInUser?.name || "Writer",
        writerSubmittedAt: new Date().toISOString(),
        stage: TaskStage.PUBLISHING,
        $actionUserName: loggedInUser?.name || "Writer",
        $actionUserRole: "Writer",
        $actionDetails: `Caption written for "${lockedWriterTask?.title}". Sent to publisher.`,
      });
      setSelectedWriterTaskId(""); setLockedWriterTask(null);
      setCaptionText(""); setHashtags(""); setWriterNotes(""); setAiSuggestions(null);
    } finally {
      setIsSubmittingWriter(false);
    }
  }

  // ── Publisher Submit ──
  async function handlePublisherSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPubTaskId) return;

    const submissions = Object.entries(publishPlacements)
      .filter(([_, d]) => d.enabled && d.link.trim())
      .map(([platform, d]) => ({
        platform, link: d.link.trim(), notes: d.notes.trim(),
        status: d.status, publishedAt: new Date().toISOString(),
      }));

    if (submissions.length === 0) {
      alert("Check at least one platform and enter its live URL.");
      return;
    }

    setIsSubmittingPub(true);
    try {
      await onUpdateTask(selectedPubTaskId, {
        submissions,
        publishedPlatform: submissions[0].platform,
        publishedLink: submissions[0].link,
        publisherNotes: submissions.map((s) => `${s.platform}: ${s.status}`).join(", "),
        publisherSubmittedAt: new Date().toISOString(),
        stage: TaskStage.COMPLETED,
        $actionUserName: loggedInUser?.name || "Publisher",
        $actionUserRole: "Publisher",
        $actionDetails: `Published "${lockedPubTask?.title}" on ${submissions.length} platform(s): ${submissions.map((s) => s.platform).join(", ")}`,
      });
      setPubSuccess(`✅ "${lockedPubTask?.title}" published on ${submissions.length} platform(s)!`);
      // Clear after 4 seconds
      setTimeout(() => {
        setSelectedPubTaskId(""); setLockedPubTask(null); setPubSuccess("");
        setPublishPlacements({
          Instagram: { enabled: false, link: "", notes: "", status: "published" },
          TikTok: { enabled: false, link: "", notes: "", status: "published" },
          YouTube: { enabled: false, link: "", notes: "", status: "published" },
          Facebook: { enabled: false, link: "", notes: "", status: "published" },
          LinkedIn: { enabled: false, link: "", notes: "", status: "published" },
        });
      }, 4000);
    } finally {
      setIsSubmittingPub(false);
    }
  }

  // ── Revision Request ──
  async function handleRevisionRequest(task: Task, reason: string, sendBackTo: TaskStage) {
    const revision: Revision = {
      id: "rev-" + Date.now(),
      requestedBy: loggedInUser?.name || "Unknown",
      requestedAt: new Date().toISOString(),
      reason,
      stage: task.stage,
    };
    const existing = task.revisions || [];
    await onUpdateTask(task.id, {
      stage: sendBackTo,
      revisions: [...existing, revision],
      revisionCount: (task.revisionCount || 0) + 1,
      $actionUserName: loggedInUser?.name || "Team",
      $actionUserRole: activeRole,
      $actionDetails: `🔄 Revision requested by ${loggedInUser?.name}: "${reason}"`,
    });
  }

  // ── AI Caption ──
  async function triggerAiAssist() {
    if (!selectedWriterTaskId || !lockedWriterTask) return;
    setIsAiGenerating(true); setAiSuggestions(null);
    try {
      const res = await fetch("/api/ai/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: lockedWriterTask.clientName,
          title: lockedWriterTask.title,
          description: lockedWriterTask.description,
          format: lockedWriterTask.format,
          editorNotes: lockedWriterTask.editorNotes,
        }),
      });
      if (res.ok) setAiSuggestions(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsAiGenerating(false); }
  }

  // Filter lists
  const editingTasks = tasks.filter((t) => {
    if (t.stage !== TaskStage.EDITING) return false;
    if (activeRole === "Editor") return t.format === "Video" || !t.format;
    if (activeRole === "Designer") return t.format === "Graphic" || t.format === "Carousel";
    return true;
  });
  const writingTasks = tasks.filter((t) => t.stage === TaskStage.WRITING);
  const publishingTasks = tasks.filter((t) => t.stage === TaskStage.PUBLISHING);

  if (activeRole === "Dashboard") {
    return (
      <Dashboard
        tasks={tasks}
        activities={activities}
        onTasksImported={onTasksImported || (async () => {})}
        onUpdateTask={onUpdateTask}
        onAddTask={onAddTask}
        currentRole={activeRole}
      />
    );
  }

  return (
    <div className={`rounded-2xl p-6 transition-all ${
      darkMode 
        ? "bg-zinc-900 border border-zinc-800 text-zinc-100" 
        : "bg-white border border-slate-200 shadow-sm text-slate-800"
    }`}>

      {/* Header */}
      <div className={`flex items-center gap-3.5 mb-6 border-b pb-4 ${
        darkMode ? "border-zinc-800" : "border-slate-200"
      }`}>
        <div className={`h-10 w-10 flex items-center justify-center rounded-xl text-xl ${
          darkMode ? "bg-zinc-950 border border-zinc-800" : "bg-blue-50 border border-blue-100"
        }`}>
          {activeRole === "Planner" ? "📋" : activeRole === "Editor" ? "🎬" :
           activeRole === "Designer" ? "🎨" : activeRole === "Writer" ? "✍️" : "🚀"}
        </div>
        <div>
          <h2 className={`text-sm font-bold ${darkMode ? "text-zinc-100" : "text-slate-900"}`}>
            {activeRole === "Designer" ? "Graphic Designer" : activeRole} Workspace
            {loggedInUser && <span className="text-blue-500 font-normal ml-1.5">— {loggedInUser.name}</span>}
          </h2>
          <p className={`text-xs ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Complete your task and advance it through the pipeline.</p>
        </div>
      </div>

      {/* ═══════════════════ PLANNER ═══════════════════ */}
      {activeRole === "Planner" && (
        <form onSubmit={handlePlannerSubmit} className="space-y-4 max-w-3xl mx-auto">
          <div className={`p-4 rounded-xl border space-y-4 ${
            darkMode ? "bg-zinc-900/50 border-zinc-850" : "bg-slate-50 border-slate-200"
          }`}>
            <h3 className={`text-xs font-mono uppercase tracking-wider font-bold ${
              darkMode ? "text-indigo-400" : "text-indigo-600"
            }`}>
              📝 New Campaign Brief
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className={`block text-xs font-semibold ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>
                    Client Name *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomClientMode(!isCustomClientMode)}
                    className="text-[10px] text-indigo-500 hover:underline font-bold focus:outline-none"
                  >
                    {isCustomClientMode ? "Choose Existing" : "+ Add New Client"}
                  </button>
                </div>
                {isCustomClientMode ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      required
                      placeholder="Enter new client brand/account name..."
                      value={customPlannerClient}
                      onChange={(e) => setCustomPlannerClient(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none ${
                        darkMode 
                          ? "bg-zinc-950 border border-zinc-850 text-zinc-100 focus:border-indigo-500" 
                          : "bg-white border border-slate-200 text-slate-800 focus:border-blue-500"
                      }`}
                    />
                    <label className="flex items-center gap-1.5 cursor-pointer select-none mt-1">
                      <input
                        type="checkbox"
                        checked={saveCustomClientOption}
                        onChange={(e) => setSaveCustomClientOption(e.target.checked)}
                        className="rounded border-zinc-800 bg-zinc-950 text-indigo-500 focus:ring-0 focus:ring-offset-0 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className={`text-[10px] font-medium ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>💾 Save client for future use</span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <select 
                      value={plannerClient} 
                      onChange={(e) => setPlannerClient(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none ${
                        darkMode 
                          ? "bg-zinc-950 border border-zinc-800 text-zinc-100 focus:border-indigo-500" 
                          : "bg-white border border-slate-200 text-slate-800 focus:border-blue-500"
                      }`} 
                      required
                    >
                      <option value="">-- Choose Client --</option>
                      {allClients.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {plannerClient && customClients.includes(plannerClient) && (
                      <button
                        type="button"
                        onClick={handleDeleteCustomClient}
                        className="text-[10px] text-rose-500 hover:underline font-semibold block text-left mt-1"
                      >
                        🗑️ Delete from saved clients
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>
                  Project Deadline *
                </label>
                <input 
                  type="date"
                  value={plannerDeadline} 
                  onChange={(e) => setPlannerDeadline(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none ${
                    darkMode 
                      ? "bg-zinc-950 border border-zinc-800 text-zinc-100 focus:border-indigo-500" 
                      : "bg-white border border-slate-200 text-slate-800 focus:border-blue-500"
                  }`} 
                  required 
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>
                  Format
                </label>
                <select 
                  value={plannerFormat} 
                  onChange={(e) => setPlannerFormat(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none ${
                    darkMode 
                      ? "bg-zinc-950 border border-zinc-800 text-zinc-100 focus:border-indigo-505" 
                      : "bg-white border border-slate-200 text-slate-800 focus:border-blue-500"
                  }`}
                >
                  <option value="Video">Video / Reel / Short</option>
                  <option value="Carousel">Instagram Carousel</option>
                  <option value="Graphic">Graphic / Image</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>
                  Starting Workflow Stage
                </label>
                <select 
                  value={plannerStage} 
                  onChange={(e) => setPlannerStage(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none ${
                    darkMode 
                      ? "bg-zinc-950 border border-zinc-800 text-zinc-100 focus:border-indigo-500" 
                      : "bg-white border border-slate-200 text-slate-800 focus:border-blue-500"
                  }`}
                >
                  <option value={TaskStage.PLANNING}>1. Brief & Review (Planning)</option>
                  <option value={TaskStage.EDITING}>2. Visual Editing (Editing)</option>
                  <option value={TaskStage.WRITING}>3. Social Copy (Writing)</option>
                  <option value={TaskStage.PUBLISHING}>4. Publish Ready (Publishing)</option>
                  <option value={TaskStage.COMPLETED}>5. Out Live (Completed)</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>
                  Priority Level
                </label>
                <select 
                  value={plannerPriority} 
                  onChange={(e) => setPlannerPriority(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none ${
                    darkMode 
                      ? "bg-zinc-950 border border-zinc-800 text-zinc-100 focus:border-indigo-500" 
                      : "bg-white border border-slate-200 text-slate-800 focus:border-blue-500"
                  }`}
                >
                  <option value="Low">🟢 Low</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="High">🟠 High</option>
                  <option value="Urgent">🔴 Urgent</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>
                    Assign Editor/Designer
                  </label>
                  <select 
                    value={plannerEditor} 
                    onChange={(e) => setPlannerEditor(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none ${
                      darkMode 
                        ? "bg-zinc-950 border border-zinc-800 text-zinc-100 focus:border-indigo-500" 
                        : "bg-white border border-slate-200 text-slate-800 focus:border-blue-500"
                    }`}
                  >
                    {plannerFormat === "Video"
                      ? TEAM_MEMBERS.editors.map((n) => <option key={n} value={n}>{n}</option>)
                      : TEAM_MEMBERS.designers.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>
                    Assign Writer
                  </label>
                  <select 
                    value={plannerWriter} 
                    onChange={(e) => setPlannerWriter(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none ${
                      darkMode 
                        ? "bg-zinc-950 border border-zinc-800 text-zinc-100 focus:border-indigo-500" 
                        : "bg-white border border-slate-200 text-slate-800 focus:border-blue-500"
                    }`}
                  >
                    {TEAM_MEMBERS.writers.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>
                Creative Brief *
              </label>
              <textarea 
                placeholder="Detail layout, audio, pacing, key messages, visual style..."
                rows={3} 
                value={plannerBrief} 
                onChange={(e) => setPlannerBrief(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none resize-none ${
                  darkMode 
                    ? "bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-650 focus:border-indigo-500" 
                    : "bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500"
                }`} 
                required 
              />
            </div>

            <LocalPathInput
              label="Raw Footage Folder Path (optional)"
              value={plannerRawPath}
              onChange={setPlannerRawPath}
              placeholder="D:\Footage\GymBhai\Video4"
              darkMode={darkMode}
            />
          </div>

          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={isSubmittingTask || (isCustomClientMode ? !customPlannerClient.trim() : !plannerClient) || !plannerDeadline || !plannerBrief}
              className={`px-4 py-2 text-white rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md ${
                darkMode 
                  ? "bg-indigo-650 hover:bg-indigo-600 shadow-indigo-950/40" 
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-105"
              }`}
            >
              {isSubmittingTask ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> 
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> 
                  Deploy to Team Board
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ═══════════════════ EDITOR ═══════════════════ */}
      {activeRole === "Editor" && (
        <div>
          {editingTasks.length === 0 ? (
            <EmptyQueue msg="No video edits in your queue right now." darkMode={darkMode} />
          ) : (
            <form onSubmit={handleEditorSubmit} className="space-y-4">
              <div className={`p-4 rounded-xl border space-y-4 ${
                darkMode ? "bg-zinc-900/50 border-zinc-850" : "bg-slate-50 border-slate-200"
              }`}>
                <h3 className={`text-xs font-mono uppercase tracking-wider font-bold ${
                  darkMode ? "text-indigo-400" : "text-indigo-700"
                }`}>🎬 Video Editor Desk</h3>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>Select Campaign *</label>
                  <select value={selectedEditorTaskId} onChange={(e) => handleEditorTaskSelect(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs focus:outline-none ${
                      darkMode 
                        ? "bg-zinc-950 border border-zinc-800 text-zinc-100 focus:border-indigo-500" 
                        : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                    }`} required>
                    <option value="">-- {editingTasks.length} pending --</option>
                    {editingTasks.map((t) => (
                      <option key={t.id} value={t.id} className={darkMode ? "bg-zinc-950 text-zinc-100" : "bg-white text-slate-800"}>
                        {t.clientName} — {t.title} ({t.format})
                      </option>
                    ))}
                  </select>
                </div>

                {lockedEditorTask && (
                  <>
                    <BriefCard task={lockedEditorTask} darkMode={darkMode} />

                    <LocalPathInput
                      label="Completed Edit — Local Folder Path *"
                      value={editedPath}
                      onChange={setEditedPath}
                      placeholder="D:\Edits\GymBhai\Video4_Final"
                      darkMode={darkMode}
                    />

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>Or Cloud Link (Drive/Dropbox)</label>
                      <input type="url" placeholder="https://drive.google.com/..."
                        value={editedLink} onChange={(e) => setEditedLink(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                        className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none ${
                          darkMode 
                            ? "bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-700 focus:border-indigo-500" 
                            : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500"
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>Notes for Writer</label>
                      <textarea placeholder="Typography, audio used, thumbnail ideas..." rows={2}
                        value={editorNotes} onChange={(e) => setEditorNotes(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none resize-none ${
                          darkMode 
                            ? "bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-700 focus:border-indigo-500" 
                            : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500"
                        }`} />
                    </div>

                    {lockedEditorTask.revisionCount ? (
                      <RevisionBadge count={lockedEditorTask.revisionCount} revisions={lockedEditorTask.revisions || []} darkMode={darkMode} />
                    ) : null}
                  </>
                )}
              </div>

              {lockedEditorTask && (
                <div className="flex justify-end gap-2">
                  <button type="submit" disabled={isDeliverEdit || (!editedLink && !editedPath)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-100">
                    <Send className="h-3 w-3" /> Submit Edit → Writer
                  </button>
                </div>
              )}
            </form>
          )}
          {editorRevisionTask && (
            <RevisionModal task={editorRevisionTask} userName={loggedInUser?.name || "Editor"}
              onClose={() => setEditorRevisionTask(null)}
              onSubmit={(reason) => handleRevisionRequest(editorRevisionTask, reason, TaskStage.PLANNING)} />
          )}
        </div>
      )}

      {/* ═══════════════════ DESIGNER ═══════════════════ */}
      {activeRole === "Designer" && (
        <div>
          {editingTasks.length === 0 ? (
            <EmptyQueue msg="No design projects in your queue." darkMode={darkMode} />
          ) : (
            <form onSubmit={handleEditorSubmit} className="space-y-4">
              <div className={`p-4 rounded-xl border space-y-4 ${
                darkMode ? "bg-zinc-900/50 border-zinc-850" : "bg-slate-50 border-slate-200"
              }`}>
                <h3 className={`text-xs font-mono uppercase tracking-wider font-bold ${
                  darkMode ? "text-emerald-400" : "text-emerald-700"
                }`}>🎨 Designer Desk</h3>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>Select Design Project *</label>
                  <select value={selectedEditorTaskId} onChange={(e) => handleEditorTaskSelect(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs focus:outline-none ${
                      darkMode 
                        ? "bg-zinc-950 border border-zinc-800 text-zinc-100 focus:border-emerald-500" 
                        : "bg-white border-slate-200 text-slate-800 focus:border-emerald-500"
                    }`} required>
                    <option value="">-- {editingTasks.length} pending --</option>
                    {editingTasks.map((t) => (
                      <option key={t.id} value={t.id} className={darkMode ? "bg-zinc-950 text-zinc-100" : "bg-white text-slate-800"}>
                        {t.clientName} — {t.title} ({t.format})
                      </option>
                    ))}
                  </select>
                </div>

                {lockedEditorTask && (
                  <>
                    <BriefCard task={lockedEditorTask} darkMode={darkMode} />

                    <LocalPathInput
                      label="Completed Design — Local Folder Path"
                      value={editedPath}
                      onChange={setEditedPath}
                      placeholder="D:\Designs\GymBhai\Carousel4"
                      darkMode={darkMode}
                    />

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>Or Cloud Link (Canva/Figma/Drive)</label>
                      <input type="url" placeholder="https://canva.com/design/..."
                        value={editedLink} onChange={(e) => setEditedLink(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                        className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none ${
                          darkMode 
                            ? "bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-700 focus:border-emerald-500" 
                            : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500"
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>Notes for Writer</label>
                      <textarea placeholder="Color scheme, carousel flow, layout themes..." rows={2}
                        value={editorNotes} onChange={(e) => setEditorNotes(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none resize-none ${
                          darkMode 
                            ? "bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-700 focus:border-emerald-500" 
                            : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500"
                        }`} />
                    </div>
                  </>
                )}
              </div>

              {lockedEditorTask && (
                <div className="flex justify-end">
                  <button type="submit" disabled={isDeliverEdit || (!editedLink && !editedPath)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50">
                    <Send className="h-3 w-3" /> Submit Design → Writer
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      )}

      {/* ═══════════════════ WRITER ═══════════════════ */}
      {activeRole === "Writer" && (
        <div>
          {writingTasks.length === 0 ? (
            <EmptyQueue msg="No campaigns waiting for captions." darkMode={darkMode} />
          ) : (
            <form onSubmit={handleWriterSubmit} className="space-y-4">
              <div className={`p-4 rounded-xl border space-y-4 ${
                darkMode ? "bg-zinc-900/50 border-zinc-850" : "bg-slate-50 border-slate-200"
              }`}>
                <h3 className={`text-xs font-mono uppercase tracking-wider font-bold ${
                  darkMode ? "text-pink-400" : "text-pink-700"
                }`}>✍️ Copy Writer Desk</h3>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>Select Campaign *</label>
                  <select value={selectedWriterTaskId} onChange={(e) => handleWriterTaskSelect(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs focus:outline-none ${
                      darkMode 
                        ? "bg-zinc-950 border border-zinc-800 text-zinc-100 focus:border-pink-500" 
                        : "bg-white border-slate-200 text-slate-800 focus:border-pink-500"
                    }`} required>
                    <option value="">-- {writingTasks.length} pending --</option>
                    {writingTasks.map((t) => (
                      <option key={t.id} value={t.id} className={darkMode ? "bg-zinc-950 text-zinc-100" : "bg-white text-slate-800"}>
                        {t.clientName} — {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                {lockedWriterTask && (
                  <>
                    <BriefCard task={lockedWriterTask} showEdit darkMode={darkMode} />

                    {/* AI Assist */}
                    <div className="flex items-center justify-between">
                      <label className={`block text-xs font-semibold ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>Caption *</label>
                      <button type="button" onClick={triggerAiAssist} disabled={isAiGenerating}
                        className={`text-[10px] px-2 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 ${
                          darkMode 
                            ? "bg-purple-900/40 hover:bg-purple-900/60 border border-purple-800 text-purple-300" 
                            : "bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700"
                        }`}>
                        {isAiGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        {isAiGenerating ? "Generating..." : "AI Suggest"}
                      </button>
                    </div>

                    {aiSuggestions && (
                      <div className={`space-y-2 p-3 rounded-xl border ${
                        darkMode ? "bg-purple-950/25 border-purple-900" : "bg-purple-50 border-purple-200"
                      }`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-purple-400" : "text-purple-600"}`}>AI Suggestions — click to use</p>
                        {aiSuggestions.captions?.map((c: any, i: number) => (
                          <button key={i} type="button"
                            onClick={() => { setCaptionText(c.text); setHashtags(aiSuggestions.hashtags || ""); }}
                            className={`w-full text-left p-2.5 rounded-lg cursor-pointer transition-colors space-y-1 border ${
                              darkMode 
                                ? "bg-zinc-950 border-purple-950 hover:border-purple-800" 
                                : "bg-white border-purple-200 hover:border-purple-400"
                            }`}>
                            <span className="text-[9px] font-bold text-purple-500 uppercase">{c.style}</span>
                            <p className={`text-[11px] leading-relaxed ${darkMode ? "text-zinc-200" : "text-slate-705"}`}>{c.text}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    <textarea placeholder="Write the social media caption here..." rows={4}
                      value={captionText} onChange={(e) => setCaptionText(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none resize-none ${
                        darkMode 
                          ? "bg-zinc-950 border border-zinc-805 text-zinc-100 placeholder-zinc-700 focus:border-pink-500" 
                          : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-pink-500"
                      }`} required />

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>Hashtags</label>
                      <input type="text" placeholder="#brand #socialmedia #trending"
                        value={hashtags} onChange={(e) => setHashtags(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                        className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none ${
                          darkMode 
                            ? "bg-zinc-950 border border-zinc-805 text-zinc-100 placeholder-zinc-700 focus:border-pink-500" 
                            : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-pink-500"
                        }`} />
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>Notes for Publisher</label>
                      <input type="text" placeholder="Best posting time, tag client account, etc."
                        value={writerNotes} onChange={(e) => setWriterNotes(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                        className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none ${
                          darkMode 
                            ? "bg-zinc-950 border border-zinc-805 text-zinc-100 placeholder-zinc-700 focus:border-pink-500" 
                            : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-pink-500"
                        }`} />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button type="button" onClick={() => setWriterRevisionTask(lockedWriterTask)}
                        className={`text-xs flex items-center gap-1 cursor-pointer font-semibold ${
                          darkMode ? "text-amber-500 hover:text-amber-400" : "text-amber-600 hover:text-amber-700"
                        }`}>
                        <RotateCcw className="h-3 w-3" /> Request Revision from Editor
                      </button>
                    </div>
                  </>
                )}
              </div>

              {lockedWriterTask && (
                <div className="flex justify-end">
                  <button type="submit" disabled={isSubmittingWriter || !captionText}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50">
                    <Send className="h-3 w-3" /> Submit Copy → Publisher
                  </button>
                </div>
              )}
            </form>
          )}
          {writerRevisionTask && (
            <RevisionModal task={writerRevisionTask} userName={loggedInUser?.name || "Writer"}
              onClose={() => setWriterRevisionTask(null)}
              onSubmit={(reason) => handleRevisionRequest(writerRevisionTask, reason, TaskStage.EDITING)} />
          )}
        </div>
      )}

      {/* ═══════════════════ PUBLISHER ═══════════════════ */}
      {activeRole === "Publisher" && (
        <div>
          {publishingTasks.length === 0 && !lockedPubTask ? (
            <EmptyQueue msg="No campaigns ready to publish." darkMode={darkMode} />
          ) : (
            <form onSubmit={handlePublisherSubmit} className="space-y-4">
              <div className={`p-4 rounded-xl border space-y-4 ${
                darkMode ? "bg-zinc-900/50 border-zinc-850" : "bg-slate-50 border-slate-200"
              }`}>
                <h3 className={`text-xs font-mono uppercase tracking-wider font-bold ${
                  darkMode ? "text-sky-450" : "text-sky-705"
                }`}>🚀 Publisher Desk</h3>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>Select Campaign *</label>
                  <select value={selectedPubTaskId} onChange={(e) => handlePubTaskSelect(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs focus:outline-none ${
                      darkMode 
                        ? "bg-zinc-950 border border-zinc-800 text-zinc-100 focus:border-sky-500" 
                        : "bg-white border-slate-200 text-slate-800 focus:border-sky-500"
                    }`} required>
                    <option value="">-- {publishingTasks.length} ready to publish --</option>
                    {publishingTasks.map((t) => (
                      <option key={t.id} value={t.id} className={darkMode ? "bg-zinc-950 text-zinc-100" : "bg-white text-slate-800"}>
                        {t.clientName} — {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Show form using LOCKED task — never collapses from polling */}
                {lockedPubTask && (
                  <>
                    {/* Content preview */}
                    <div className={`rounded-xl border p-4 space-y-3 text-xs ${
                      darkMode ? "bg-zinc-950 border-zinc-850" : "bg-white border-slate-200"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-bold ${darkMode ? "text-zinc-100" : "text-slate-700"}`}>{lockedPubTask.clientName} — {lockedPubTask.title}</span>
                        {lockedPubTask.revisionCount ? <RevisionBadge count={lockedPubTask.revisionCount} revisions={lockedPubTask.revisions || []} darkMode={darkMode} /> : null}
                      </div>

                      {/* File access */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {lockedPubTask.editedFilePath && (
                          <button type="button" onClick={() => openLocalFolder(lockedPubTask.editedFilePath!)}
                            className={`flex items-center gap-2 px-3 py-2 border rounded-lg font-semibold cursor-pointer transition-colors ${
                              darkMode 
                                ? "bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800" 
                                : "bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-707"
                            }`}>
                            <FolderOpen className="h-3.5 w-3.5 text-blue-500" /> Open Edited Files
                          </button>
                        )}
                        {lockedPubTask.editedFileLink && (
                          <a href={lockedPubTask.editedFileLink} target="_blank" rel="noreferrer"
                            className={`flex items-center gap-2 px-3 py-2 border rounded-lg font-semibold ${
                              darkMode 
                                ? "bg-indigo-950/40 border-indigo-900 hover:bg-indigo-900/60 text-indigo-300" 
                                : "bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700"
                            }`}>
                            <ExternalLink className="h-3.5 w-3.5" /> Open Cloud Link
                          </a>
                        )}
                      </div>

                      {/* Caption + Hashtags */}
                      {lockedPubTask.captionText && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-semibold ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>Caption</span>
                            <button type="button" onClick={() => handleCopy(lockedPubTask.captionText || "", "caption")}
                              className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 cursor-pointer">
                              {copiedField === "caption" ? <><Check className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
                            </button>
                          </div>
                          <div className={`border rounded-lg p-3 text-[11px] leading-relaxed max-h-28 overflow-y-auto whitespace-pre-wrap ${
                            darkMode 
                              ? "bg-zinc-900/50 border-zinc-850 text-zinc-200" 
                              : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}>
                            {lockedPubTask.captionText}
                          </div>
                        </div>
                      )}
                      {lockedPubTask.hashtags && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-semibold ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>Hashtags</span>
                            <button type="button" onClick={() => handleCopy(lockedPubTask.hashtags || "", "hashtags")}
                              className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 cursor-pointer">
                              {copiedField === "hashtags" ? <><Check className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
                            </button>
                          </div>
                          <div className="text-[11px] text-blue-500 font-semibold leading-relaxed">{lockedPubTask.hashtags}</div>
                        </div>
                      )}
                      {lockedPubTask.writerNotes && (
                        <div className={`border rounded-lg p-2.5 text-[11px] ${
                          darkMode 
                            ? "bg-amber-950/20 border-amber-900/50 text-amber-300" 
                            : "bg-amber-50 border-amber-200 text-amber-800"
                        }`}>
                          <strong>Writer notes:</strong> {lockedPubTask.writerNotes}
                        </div>
                      )}
                    </div>

                    {/* Platform checkboxes — persistent, won't collapse */}
                    <div className="space-y-3">
                      <label className={`block text-xs font-bold uppercase tracking-wide ${darkMode ? "text-zinc-300" : "text-slate-700"}`}>Select Platforms & Enter Live Links</label>
                      {Object.entries(publishPlacements).map(([platform, data]) => {
                        const emoji = { Instagram: "📸", TikTok: "🎵", YouTube: "🎥", Facebook: "👥", LinkedIn: "👔" }[platform] || "🌐";
                        return (
                          <div key={platform} className={`rounded-xl border p-3 space-y-2.5 transition-colors ${
                            data.enabled 
                              ? darkMode 
                                ? "bg-sky-950/20 border-sky-800 text-white" 
                                : "bg-sky-50 border-sky-200" 
                              : darkMode 
                                ? "bg-zinc-950 border-zinc-850 text-zinc-300" 
                                : "bg-white border-slate-200"
                          }`}>
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" checked={data.enabled}
                                  onChange={(e) => setPublishPlacements((prev) => ({
                                    ...prev, [platform]: { ...prev[platform], enabled: e.target.checked }
                                  }))}
                                  className="h-4 w-4 rounded border-slate-300 text-sky-600 cursor-pointer" />
                                <span className={`text-xs font-bold ${darkMode ? "text-zinc-200" : "text-slate-800"}`}>{emoji} {platform}</span>
                              </label>
                              {data.enabled && (
                                <select value={data.status}
                                  onChange={(e) => setPublishPlacements((prev) => ({
                                    ...prev, [platform]: { ...prev[platform], status: e.target.value }
                                  }))}
                                  className={`text-[10px] font-bold border rounded-lg px-2 py-1 focus:outline-none cursor-pointer ${
                                    darkMode 
                                      ? "bg-zinc-900 border-zinc-805 text-zinc-100 placeholder-zinc-700" 
                                      : "bg-white border-slate-200 text-slate-800"
                                  }`}>
                                  <option value="published">✅ Published</option>
                                  <option value="scheduled">🕐 Scheduled</option>
                                  <option value="draft">📝 Draft Saved</option>
                                </select>
                              )}
                            </div>
                            {data.enabled && (
                              <div className="space-y-1.5 pl-6">
                                <input type="url" placeholder={`${platform} post URL`}
                                  value={data.link}
                                  onChange={(e) => setPublishPlacements((prev) => ({
                                    ...prev, [platform]: { ...prev[platform], link: e.target.value }
                                  }))}
                                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                                  className={`w-full px-3 py-1.5 rounded-lg text-xs focus:outline-none ${
                                    darkMode 
                                      ? "bg-zinc-900 border-zinc-800 text-zinc-100 placeholder-zinc-750 focus:border-sky-505" 
                                      : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-sky-400"
                                  }`} />
                                <input type="text" placeholder="Optional notes (e.g. tagged client, posted at 6pm)"
                                  value={data.notes}
                                  onChange={(e) => setPublishPlacements((prev) => ({
                                    ...prev, [platform]: { ...prev[platform], notes: e.target.value }
                                  }))}
                                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                                  className={`w-full px-3 py-1.5 rounded-lg text-xs focus:outline-none ${
                                    darkMode 
                                      ? "bg-zinc-900 border-zinc-800 text-zinc-100 placeholder-zinc-750 focus:border-sky-505" 
                                      : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-sky-400"
                                  }`} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {pubSuccess && (
                <div className={`border rounded-xl px-4 py-3 text-xs font-semibold flex items-center gap-2 ${
                  darkMode ? "bg-emerald-950/20 border-emerald-900 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-705"
                }`}>
                  <Check className="h-4 w-4" /> {pubSuccess}
                </div>
              )}

              {lockedPubTask && !pubSuccess && (
                <div className="flex justify-end gap-2">
                  <button type="button"
                    onClick={() => { setSelectedPubTaskId(""); setLockedPubTask(null); }}
                    className={`px-4 py-2 border rounded-xl font-bold text-xs cursor-pointer transition-colors ${
                      darkMode 
                        ? "bg-zinc-900 border-zinc-800 text-zinc-3 w-max hover:bg-zinc-800" 
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}>
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmittingPub}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md">
                    {isSubmittingPub ? <><Loader2 className="h-3 w-3 animate-spin" /> Publishing...</> : <><Send className="h-3 w-3" /> Mark as Published</>}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      )}

      {/* ─── Local Folder Connector Guide & Setup Modal ─── */}
      {folderHelpPath && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-fade-in relative text-left">
            <button 
              type="button" 
              onClick={() => setFolderHelpPath(null)}
              className="absolute top-4 right-4 text-slate-450 hover:text-white transition-colors cursor-pointer text-lg font-bold"
            >
              ×
            </button>

            <div className="flex items-center gap-3.5 mb-4">
              <div className="h-10 w-10 bg-indigo-500/15 rounded-xl flex items-center justify-center text-indigo-400">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-sans">Open Local Folder</h3>
                <p className="text-[11px] text-zinc-400 font-sans mt-0.5">Seamlessly access local production directories on Windows</p>
              </div>
            </div>

            <p className="text-xs text-zinc-350 mb-3 font-sans">
              Currently trying to open the following local path:
            </p>

            <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-850 font-mono text-xs text-zinc-350 break-all select-all flex items-start gap-2 mb-4">
              <span className="text-indigo-400 select-none">📁</span>
              <div>{folderHelpPath}</div>
            </div>

            <div className="space-y-4 text-xs text-zinc-300">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl flex items-start gap-2.5">
                <span className="text-emerald-400 text-sm leading-none mt-0.5">📋</span>
                <div>
                  <p className="font-semibold text-emerald-400">Path Copied to Clipboard!</p>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    Simply press <kbd className="bg-zinc-800 text-zinc-100 px-1.5 py-0.5 rounded text-[10px] font-mono border border-zinc-700">Win + R</kbd> on your keyboard, paste (<kbd className="bg-zinc-800 text-zinc-100 px-1.5 py-0.5 rounded text-[10px] font-mono border border-zinc-700">Ctrl + V</kbd>), and press <kbd className="bg-zinc-800 text-zinc-100 px-1.5 py-0.5 rounded text-[10px] font-mono border border-zinc-700">Enter</kbd> to open Windows File Explorer instantly!
                  </p>
                </div>
              </div>

              <div className="border border-zinc-800 bg-zinc-900/50 rounded-xl p-4">
                <h4 className="font-bold text-zinc-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-mono mb-2">
                  🚀 Enable direct 1-Click opening
                </h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  To open local folders directly by clicking the "Open" buttons on this system, download and run our 1-click secure setup script once to register the safe <code className="text-indigo-400 font-mono bg-zinc-950 px-1 py-0.5 rounded">local-folder://</code> protocol handler.
                </p>
                <div className="mt-3.5 flex items-center gap-3">
                  <a 
                    href="/api/download-launcher" 
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 transition-colors text-white font-semibold text-xs rounded-xl cursor-pointer shadow-md shadow-indigo-600/10"
                  >
                    📥 Download 1-Click Installer
                  </a>
                  <span className="text-[10px] text-zinc-500">Run as Administrator once</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-zinc-850 flex justify-end">
              <button
                type="button"
                onClick={() => setFolderHelpPath(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Small helper components ──────────────────────────────────────────────────

function EmptyQueue({ msg, darkMode = false }: { msg: string; darkMode?: boolean }) {
  return (
    <div className={`border border-dashed rounded-xl p-8 text-center ${
      darkMode ? "bg-zinc-900/40 border-zinc-800" : "bg-slate-50 border-slate-200"
    }`}>
      <p className="text-2xl mb-2">🙌</p>
      <p className={`text-xs ${darkMode ? "text-zinc-550" : "text-slate-500"}`}>{msg}</p>
    </div>
  );
}

function BriefCard({ task, showEdit, darkMode = false }: { task: Task; showEdit?: boolean; darkMode?: boolean }) {
  return (
    <div className={`rounded-lg border p-3.5 text-xs space-y-2 ${
      darkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-slate-200"
    }`}>
      <div className={`flex items-center justify-between font-bold ${darkMode ? "text-zinc-200" : "text-slate-705"}`}>
        <span>{task.clientName} — {task.title}</span>
        <span className={`text-[10px] font-mono ${darkMode ? "text-zinc-650" : "text-slate-400"}`}>{task.format}</span>
      </div>
      <p className={`italic leading-relaxed ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>{task.description}</p>
      {task.rawFootagePath && (
        <div className={`flex items-center justify-between pt-1 border-t ${darkMode ? "border-zinc-850" : "border-slate-100"}`}>
          <span className={`font-semibold ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>Raw Footage:</span>
          <button type="button" onClick={() => openLocalFolder(task.rawFootagePath!)}
            className="flex items-center gap-1 text-blue-500 hover:underline font-mono text-[11px] cursor-pointer">
            <FolderOpen className="h-3 w-3" /> Open Folder
          </button>
        </div>
      )}
      {task.rawFootageLink && !task.rawFootagePath && (
        <div className={`flex items-center justify-between pt-1 border-t ${darkMode ? "border-zinc-850" : "border-slate-100"}`}>
          <span className={`font-semibold ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>Raw Footage:</span>
          <a href={task.rawFootageLink} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-blue-500 hover:underline font-mono text-[11px]">
            Open Link <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
      {showEdit && task.editedFilePath && (
        <div className={`flex items-center justify-between pt-1 border-t ${darkMode ? "border-zinc-850" : "border-slate-100"}`}>
          <span className={`font-semibold ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>Edited File:</span>
          <button type="button" onClick={() => openLocalFolder(task.editedFilePath!)}
            className="flex items-center gap-1 text-indigo-400 hover:underline font-mono text-[11px] cursor-pointer">
            <FolderOpen className="h-3 w-3" /> Open Folder
          </button>
        </div>
      )}
      {showEdit && task.editedFileLink && !task.editedFilePath && (
        <div className={`flex items-center justify-between pt-1 border-t ${darkMode ? "border-zinc-850" : "border-slate-100"}`}>
          <span className={`font-semibold ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>Edited File:</span>
          <a href={task.editedFileLink} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-indigo-400 hover:underline font-mono text-[11px]">
            Open Link <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
      {showEdit && task.editorNotes && (
        <div className={`rounded p-2 text-[11px] border ${
          darkMode 
            ? "bg-indigo-950/20 border-indigo-900/50 text-indigo-300" 
            : "bg-indigo-50 border-indigo-100 text-indigo-700"
        }`}>
          <strong>Editor notes:</strong> {task.editorNotes}
        </div>
      )}
    </div>
  );
}

function RevisionBadge({ count, revisions, darkMode = false }: { count: number; revisions: Revision[]; darkMode?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2 py-0.5 border rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
          darkMode 
            ? "bg-amber-955/20 border-amber-900 text-amber-400" 
            : "bg-amber-100 border-amber-300 text-amber-700"
        }`}>
        <RotateCcw className="h-3 w-3" /> {count} revision{count > 1 ? "s" : ""}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {revisions.map((r) => (
            <div key={r.id} className={`border rounded-lg p-2 text-[10px] ${
              darkMode 
                ? "bg-amber-950/10 border-amber-900/45 text-amber-300" 
                : "bg-amber-50 border-amber-200 text-amber-801"
            }`}>
              <div className="font-bold">{r.requestedBy} · {new Date(r.requestedAt).toLocaleDateString()}</div>
              <div className="mt-0.5">{r.reason}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
