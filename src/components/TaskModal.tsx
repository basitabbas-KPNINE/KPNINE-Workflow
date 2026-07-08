import React from "react";
import { Task, TaskStage, RoleType, ActivityChange } from "../types";
import { 
  X, 
  ExternalLink, 
  Clock, 
  FileText, 
  ChevronRight, 
  Trash2, 
  ArrowRight, 
  User, 
  Clipboard,
  AlertCircle
} from "lucide-react";

interface StageDuration {
  stage: TaskStage;
  durationMs: number;
  isCurrent: boolean;
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "0m";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return "< 1m";
}

export function calculateStageDurations(task: Task, activities: ActivityChange[]): StageDuration[] {
  const now = Date.now();
  const timeline: { stage: TaskStage; timestamp: number }[] = [
    { stage: TaskStage.PLANNING, timestamp: new Date(task.createdAt).getTime() }
  ];

  if (task.videographerSubmittedAt && !isNaN(Date.parse(task.videographerSubmittedAt))) {
    timeline.push({ stage: TaskStage.EDITING, timestamp: new Date(task.videographerSubmittedAt).getTime() });
  }
  if (task.editorSubmittedAt && !isNaN(Date.parse(task.editorSubmittedAt))) {
    timeline.push({ stage: TaskStage.WRITING, timestamp: new Date(task.editorSubmittedAt).getTime() });
  }
  if (task.writerSubmittedAt && !isNaN(Date.parse(task.writerSubmittedAt))) {
    timeline.push({ stage: TaskStage.PUBLISHING, timestamp: new Date(task.writerSubmittedAt).getTime() });
  }
  if (task.publisherSubmittedAt && !isNaN(Date.parse(task.publisherSubmittedAt))) {
    timeline.push({ stage: TaskStage.COMPLETED, timestamp: new Date(task.publisherSubmittedAt).getTime() });
  }

  const taskActs = (activities || [])
    .filter(act => act.taskId === task.id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  taskActs.forEach(act => {
    const time = new Date(act.timestamp).getTime();
    if (isNaN(time)) return;

    if (act.action === "created") {
      timeline.push({ stage: TaskStage.PLANNING, timestamp: time });
    } else if (act.action === "footage_added" || act.action === "sheet_imported") {
      timeline.push({ stage: TaskStage.EDITING, timestamp: time });
    } else if (act.action === "edit_submitted") {
      timeline.push({ stage: TaskStage.WRITING, timestamp: time });
    } else if (act.action === "caption_written") {
      timeline.push({ stage: TaskStage.PUBLISHING, timestamp: time });
    } else if (act.action === "published") {
      timeline.push({ stage: TaskStage.COMPLETED, timestamp: time });
    }
  });

  // Gap filling: Ensure intermediate stages are present up to the current stage
  const stagesOrdered = [
    TaskStage.PLANNING,
    TaskStage.EDITING,
    TaskStage.WRITING,
    TaskStage.PUBLISHING,
    TaskStage.COMPLETED
  ];
  
  const currentStageIdx = stagesOrdered.indexOf(task.stage);
  const existingStages = new Set(timeline.map(t => t.stage));
  
  for (let i = 0; i <= currentStageIdx; i++) {
    const s = stagesOrdered[i];
    if (!existingStages.has(s)) {
      const createdT = new Date(task.createdAt).getTime();
      const updatedT = new Date(task.updatedAt).getTime();
      const ratio = i / Math.max(1, currentStageIdx);
      const synthTime = createdT + (updatedT - createdT) * ratio;
      timeline.push({ stage: s, timestamp: synthTime });
    }
  }

  // Sort timeline chronologically
  timeline.sort((a, b) => a.timestamp - b.timestamp);

  const durations: Record<TaskStage, number> = {
    [TaskStage.PLANNING]: 0,
    [TaskStage.EDITING]: 0,
    [TaskStage.WRITING]: 0,
    [TaskStage.PUBLISHING]: 0,
    [TaskStage.COMPLETED]: 0,
  };

  for (let i = 0; i < timeline.length; i++) {
    const current = timeline[i];
    const nextTime = (i + 1 < timeline.length) ? timeline[i + 1].timestamp : now;
    const diff = Math.max(0, nextTime - current.timestamp);
    durations[current.stage] += diff;
  }

  const currentStage = task.stage;

  return [
    { stage: TaskStage.PLANNING, durationMs: durations[TaskStage.PLANNING], isCurrent: currentStage === TaskStage.PLANNING },
    { stage: TaskStage.EDITING, durationMs: durations[TaskStage.EDITING], isCurrent: currentStage === TaskStage.EDITING },
    { stage: TaskStage.WRITING, durationMs: durations[TaskStage.WRITING], isCurrent: currentStage === TaskStage.WRITING },
    { stage: TaskStage.PUBLISHING, durationMs: durations[TaskStage.PUBLISHING], isCurrent: currentStage === TaskStage.PUBLISHING },
    { stage: TaskStage.COMPLETED, durationMs: durations[TaskStage.COMPLETED], isCurrent: currentStage === TaskStage.COMPLETED },
  ];
}

interface TaskModalProps {
  task: Task | null;
  onClose: () => void;
  onDeleteTask: (id: string) => Promise<void>;
  activeRole: RoleType;
  activities?: ActivityChange[];
}

export default function TaskModal({ task, onClose, onDeleteTask, activeRole, activities = [] }: TaskModalProps) {
  if (!task) return null;

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to permanently delete campaign "${task.title}" for ${task.clientName}?`)) {
      await onDeleteTask(task.id);
      onClose();
    }
  };

  const getStageBadge = (stage: TaskStage) => {
    switch (stage) {
      case TaskStage.PLANNING:
        return <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Planning</span>;
      case TaskStage.EDITING:
        return <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Editing Stage</span>;
      case TaskStage.WRITING:
        return <span className="bg-pink-500/10 border border-pink-500/20 text-pink-400 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Copywriting</span>;
      case TaskStage.PUBLISHING:
        return <span className="bg-sky-500/10 border border-sky-500/20 text-sky-400 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Publishing</span>;
      case TaskStage.COMPLETED:
        return <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Live ✅</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/65 backdrop-blur-xs transition-opacity px-4">
      {/* Background click close */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Main Drawer Panel */}
      <div className="relative w-full max-w-xl bg-zinc-900 border-l border-zinc-850 h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto z-10 animate-slide-in text-zinc-100">
        
        <div>
          {/* Header Row */}
          <div className="flex items-start justify-between border-b border-zinc-800 pb-4 mb-4">
            <div>
              <span className="text-[11px] font-mono font-bold text-teal-400 uppercase tracking-widest block mb-1">
                {task.clientName} Campaign
              </span>
              <h2 className="text-xl font-sans font-bold text-white tracking-tight">
                {task.title}
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={onClose} 
                className="h-8 w-8 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-950 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Current State Indicator */}
          <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-850 mb-4 text-sm">
            <span className="text-zinc-400 font-sans">Active Pipeline Stage:</span>
            {getStageBadge(task.stage)}
          </div>

          {/* Time Spent in Stage Breakdown */}
          {(() => {
            const stageDurations = calculateStageDurations(task, activities);
            const activeStages = stageDurations.filter(d => d.stage !== TaskStage.COMPLETED);
            const maxActiveDurationMs = Math.max(...activeStages.map(d => d.durationMs), 0);
            const bottleneckStage = maxActiveDurationMs > 60000 
              ? activeStages.find(d => d.durationMs === maxActiveDurationMs)?.stage 
              : null;
            const totalDurationMs = stageDurations.reduce((acc, curr) => acc + curr.durationMs, 0);

            return (
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 mb-5 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-teal-400" />
                    <span className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-bold">
                      Time Spent in Stage
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Age: {formatDuration(totalDurationMs)}
                  </span>
                </div>

                <div className="space-y-2">
                  {stageDurations.map((item) => {
                    const label = 
                      item.stage === TaskStage.PLANNING ? "Planning Brief" :
                      item.stage === TaskStage.EDITING ? "Creative Editing" :
                      item.stage === TaskStage.WRITING ? "Copywriting" :
                      item.stage === TaskStage.PUBLISHING ? "Publishing Prep" : "Completed / Live";
                    
                    const maxDurationVal = Math.max(...stageDurations.map(d => d.durationMs), 1);
                    const percentage = Math.min(100, Math.max(5, (item.durationMs / maxDurationVal) * 100));

                    const colorClass = 
                      item.stage === TaskStage.PLANNING ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/15" :
                      item.stage === TaskStage.EDITING ? "bg-amber-500/10 text-amber-400 border-amber-500/15" :
                      item.stage === TaskStage.WRITING ? "bg-pink-500/10 text-pink-400 border-pink-500/15" :
                      item.stage === TaskStage.PUBLISHING ? "bg-sky-500/10 text-sky-400 border-sky-500/15" :
                      "bg-emerald-500/10 text-emerald-400 border-emerald-500/15";

                    const barColorClass = 
                      item.stage === TaskStage.PLANNING ? "bg-indigo-500/15" :
                      item.stage === TaskStage.EDITING ? "bg-amber-500/15" :
                      item.stage === TaskStage.WRITING ? "bg-pink-500/15" :
                      item.stage === TaskStage.PUBLISHING ? "bg-sky-500/15" :
                      "bg-emerald-500/15";

                    const isBottleneck = item.stage === bottleneckStage;

                    return (
                      <div 
                        key={item.stage} 
                        className={`relative p-2.5 rounded-xl border border-zinc-900/50 bg-zinc-950/20 overflow-hidden flex items-center justify-between transition-all ${
                          item.isCurrent ? "border-zinc-800 bg-zinc-900/20" : ""
                        }`}
                      >
                        {/* background duration bar */}
                        <div 
                          className={`absolute left-0 top-0 bottom-0 ${barColorClass} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />

                        <div className="relative flex items-center gap-2 z-10">
                          <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${colorClass}`}>
                            {label}
                          </span>
                          {item.isCurrent && (
                            <span className="flex h-2 w-2 items-center justify-center">
                              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-current opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
                            </span>
                          )}
                          {isBottleneck && (
                            <span className="text-[9px] bg-red-500/10 border border-red-500/20 text-red-400 font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse" title="Stage with highest active time - Potential bottleneck">
                              ⚠️ Bottleneck
                            </span>
                          )}
                        </div>

                        <div className="relative flex items-center gap-2 z-10">
                          {item.isCurrent && (
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest animate-pulse">
                              Active
                            </span>
                          )}
                          <span className="text-xs font-mono font-bold text-zinc-200">
                            {formatDuration(item.durationMs)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="space-y-5">
            {/* 1. Planning Brief */}
            <div className="space-y-1">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold">
                1. Campaign Planning Details
              </h3>
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-900 text-xs text-zinc-300 leading-relaxed font-sans">
                <p className="font-sans whitespace-pre-wrap">{task.description || "No specific instructions provided."}</p>
                <div className="grid grid-cols-2 gap-3 mt-3.5 pt-2.5 border-t border-zinc-900 text-[11px] text-zinc-400">
                  <div>
                    <span className="text-zinc-500 font-mono block">Media Format:</span>
                    <span className="text-zinc-300 font-semibold">{task.format}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-mono block">Creation Date:</span>
                    <span className="text-zinc-300 font-semibold">{new Date(task.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-mono block">Design/Editor Assigned:</span>
                    <span className="text-zinc-300 font-semibold">{task.assignedEditor || "Unassigned"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-mono block">Copywriter Assigned:</span>
                    <span className="text-zinc-300 font-semibold">{task.assignedWriter || "Unassigned"}</span>
                  </div>
                </div>
              </div>
            </div>            {/* 2. Planning Campaign Assets */}
            {(task.rawFootageLink || task.stage === TaskStage.PLANNING) && (
              <div className="space-y-1">
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold">
                  2. Campaign Source Links
                </h3>
                <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-900 text-xs">
                  {task.rawFootageLink ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-850 p-2 rounded">
                        <span className="truncate max-w-[70%] font-mono text-[11px] text-zinc-400">
                          {task.rawFootageLink}
                        </span>
                        <a 
                          href={task.rawFootageLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-teal-400 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                        >
                          Visit Files <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      
                      {task.footageNotes && (
                        <p className="text-[11px] text-zinc-400 italic font-sans dark:text-zinc-400 bg-zinc-950 p-2 rounded border border-zinc-900">
                          <span className="font-mono text-[10px] text-zinc-500 block uppercase">Notes:</span>
                          {task.footageNotes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-[11px] italic font-sans text-center py-1">No custom source links linked during planning.</p>
                  )}
                </div>
              </div>
            )}

            {/* 3. Editor Deliverable */}
            {(task.editedFileLink || task.stage === TaskStage.EDITING) && (
              <div className="space-y-1">
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold">
                  3. Delivered Creative Edits
                </h3>
                <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-900 text-xs">
                  {task.editedFileLink ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-850 p-2 rounded">
                        <span className="truncate max-w-[70%] font-mono text-[11px] text-zinc-400">
                          {task.editedFileLink}
                        </span>
                        <a 
                          href={task.editedFileLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-indigo-400 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                        >
                          Visit File <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      
                      {task.editorNotes && (
                        <p className="text-[11px] text-zinc-400 italic bg-zinc-950 p-2 rounded border border-zinc-900">
                          <span className="font-mono text-[10px] text-zinc-500 block uppercase">Notes:</span>
                          {task.editorNotes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-[11px] italic">Editors are working on slides/timelines.</p>
                  )}
                </div>
              </div>
            )}

            {/* 4. Captions approved */}
            {(task.captionText || task.stage === TaskStage.WRITING) && (
              <div className="space-y-1">
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold">
                  4. Captions & Hashtags
                </h3>
                <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-900 text-xs space-y-2.5">
                  {task.captionText ? (
                    <div className="space-y-2.5">
                      <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-850 whitespace-pre-wrap font-sans leading-relaxed text-zinc-300">
                        {task.captionText}
                      </div>
                      {task.hashtags && (
                        <div className="text-[11px] text-teal-400 leading-relaxed font-mono">
                          {task.hashtags}
                        </div>
                      )}
                      
                      {task.writerNotes && (
                        <p className="text-[10px] text-zinc-500 font-sans italic pt-1 border-t border-zinc-900">
                          <span className="font-semibold block uppercase text-[8px] tracking-wider text-zinc-500">Publish Notes:</span>
                          {task.writerNotes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-[11px] italic">Writers are drafting caption suggestions.</p>
                  )}
                </div>
              </div>
            )}

            {/* 5. Live Publish Link */}
            {((task.submissions && task.submissions.length > 0) || task.publishedLink || task.facebookLink || task.instagramLink || task.tiktokLink || task.youtubeLink) && (
              <div className="space-y-1">
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold">
                  5. Live URL Records
                </h3>
                <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-900 text-xs space-y-3">
                  {/* Explicit Platform Links */}
                  {[
                    { platform: "Facebook", link: task.facebookLink, emoji: "👥" },
                    { platform: "Instagram", link: task.instagramLink, emoji: "📸" },
                    { platform: "TikTok", link: task.tiktokLink, emoji: "🎵" },
                    { platform: "YouTube", link: task.youtubeLink, emoji: "🎥" }
                  ].map((item, idx) => item.link ? (
                    <div key={`exp-${idx}`} className="border-b border-zinc-900/40 last:border-0 pb-3 last:pb-0 space-y-1.5 text-left">
                      <div className="flex items-center justify-between text-zinc-450 text-[10.5px]">
                        <span className="flex items-center gap-1.5">
                          <span>{item.emoji}</span>
                          <span>Platform Placement: <strong className="text-zinc-200">{item.platform}</strong></span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-850 p-2 rounded">
                        <span className="truncate max-w-[70%] font-mono text-[10.5px] text-emerald-400">
                          {item.link}
                        </span>
                        <a 
                          href={item.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold text-[10.5px]"
                        >
                          View Post <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ) : null)}

                  {/* Legacy Submissions */}
                  {task.submissions && task.submissions.length > 0 && task.submissions.map((sub: any, sIdx: number) => (
                    <div key={`sub-${sIdx}`} className="border-b border-zinc-900/40 last:border-0 pb-3 last:pb-0 space-y-1.5 text-left">
                      <div className="flex items-center justify-between text-zinc-450 text-[10.5px]">
                        <span className="flex items-center gap-1.5">
                          <span>{sub.platform === "Instagram" ? "📸" : sub.platform === "TikTok" ? "🎵" : sub.platform === "YouTube" ? "🎥" : sub.platform === "Facebook" ? "👥" : "👔"}</span>
                          <span>Platform Placement: <strong className="text-zinc-200">{sub.platform} (Legacy)</strong></span>
                        </span>
                        {sub.notes && <span className="text-zinc-500 italic max-w-[50%] truncate font-sans">({sub.notes})</span>}
                      </div>
                      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-850 p-2 rounded">
                        <span className="truncate max-w-[70%] font-mono text-[10.5px] text-emerald-400">
                          {sub.link}
                        </span>
                        <a 
                          href={sub.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold text-[10.5px]"
                        >
                          View Post <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ))}

                  {/* Legacy Single Published Link */}
                  {!task.submissions?.length && task.publishedLink && (
                    <>
                      <div className="flex items-center justify-between text-zinc-450 text-[11px] text-left">
                        <span>Official Platform: <strong className="text-zinc-300">{task.publishedPlatform} (Legacy)</strong></span>
                        <span>Completed At: <strong className="text-zinc-300">{task.publisherSubmittedAt ? new Date(task.publisherSubmittedAt).toLocaleString() : "N/A"}</strong></span>
                      </div>
                      
                      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-850 p-2 rounded">
                        <span className="truncate max-w-[70%] font-mono text-[11px] text-emerald-400">
                          {task.publishedLink}
                        </span>
                        <a 
                          href={task.publishedLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                        >
                          View Live Post <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls Footer */}
        <div className="border-t border-zinc-850 pt-4 mt-6 flex items-center justify-between">
          <button
            onClick={handleDelete}
            className="px-3.5 py-2 hover:bg-red-500/10 text-red-400 rounded-xl font-bold font-sans text-xs flex items-center gap-2 hover:text-red-300 transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
          >
            <Trash2 className="h-4 w-4" /> Delete Task
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 text-white rounded-xl font-bold font-sans text-xs hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>

      </div>
    </div>
  );
}
