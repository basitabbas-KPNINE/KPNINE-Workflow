import React from "react";
import { Task, TaskStage, RoleType } from "../types";
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

interface TaskModalProps {
  task: Task | null;
  onClose: () => void;
  onDeleteTask: (id: string) => Promise<void>;
  activeRole: RoleType;
}

export default function TaskModal({ task, onClose, onDeleteTask, activeRole }: TaskModalProps) {
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
          <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-850 mb-5 text-sm">
            <span className="text-zinc-400 font-sans">Active Pipeline Stage:</span>
            {getStageBadge(task.stage)}
          </div>

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
            {((task.submissions && task.submissions.length > 0) || task.publishedLink) && (
              <div className="space-y-1">
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold">
                  5. Live URL Records
                </h3>
                <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-900 text-xs space-y-3">
                  {task.submissions && task.submissions.length > 0 ? (
                    task.submissions.map((sub: any, sIdx: number) => (
                      <div key={sIdx} className="border-b border-zinc-900/40 last:border-0 pb-3 last:pb-0 space-y-1.5 text-left">
                        <div className="flex items-center justify-between text-zinc-450 text-[10.5px]">
                          <span className="flex items-center gap-1.5">
                            <span>{sub.platform === "Instagram" ? "📸" : sub.platform === "TikTok" ? "🎵" : sub.platform === "YouTube" ? "🎥" : sub.platform === "Facebook" ? "👥" : "👔"}</span>
                            <span>Platform Placement: <strong className="text-zinc-200">{sub.platform}</strong></span>
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
                    ))
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-zinc-450 text-[11px] text-left">
                        <span>Official Platform: <strong className="text-zinc-300">{task.publishedPlatform}</strong></span>
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
