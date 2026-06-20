import React from "react";
import { Task, TaskStage, RoleType } from "../types";
import { motion } from "motion/react";
import { 
  Play, 
  Layers, 
  FileText, 
  Check, 
  ArrowRight, 
  Video, 
  Image, 
  FileImage, 
  Sparkles, 
  AlertCircle,
  Clock,
  Calendar
} from "lucide-react";

interface TaskBoardProps {
  tasks: Task[];
  onCardClick: (task: Task) => void;
  activeRole: RoleType;
  darkMode?: boolean;
}

export default function TaskBoard({ tasks, onCardClick, activeRole, darkMode = true }: TaskBoardProps) {
  
  // Format indicators
  const getFormatIcon = (format: Task['format']) => {
    switch (format) {
      case 'Video':
        return <Video className="h-4 w-4 text-emerald-500" />;
      case 'Carousel':
        return <Layers className="h-4 w-4 text-pink-500" />;
      case 'Graphic':
        return <Image className="h-4 w-4 text-blue-500" />;
      default:
        return <FileImage className="h-4 w-4 text-zinc-500" />;
    }
  };

  // Check if a task is "Waiting for the current persona"
  const isWaitingForMyRole = (task: Task, role: RoleType): boolean => {
    if (role === 'Planner' && task.stage === TaskStage.PLANNING) return true;
    if (role === 'Editor' && task.stage === TaskStage.EDITING) return true;
    if (role === 'Designer' && task.stage === TaskStage.EDITING) return true;
    if (role === 'Writer' && task.stage === TaskStage.WRITING) return true;
    if (role === 'Publisher' && task.stage === TaskStage.PUBLISHING) return true;
    return false;
  };

  const stagesDef = [
    {
      stage: TaskStage.PLANNING,
      title: "Planning & Footage",
      color: "border-t-indigo-600",
      bg: "bg-indigo-50/30",
      text: "text-indigo-400 border-indigo-900 bg-indigo-950/30",
      descr: "Client briefs & Raw Footage links"
    },
    {
      stage: TaskStage.EDITING,
      title: "Graphic / Video Editing",
      color: "border-t-amber-500",
      bg: "bg-amber-50/30",
      text: "text-amber-400 border-amber-900 bg-amber-950/30",
      descr: "Local drive editing & design"
    },
    {
      stage: TaskStage.WRITING,
      title: "Copy & Captions",
      color: "border-t-pink-500",
      bg: "bg-pink-50/30",
      text: "text-pink-400 border-pink-900 bg-pink-950/30",
      descr: "AI Gemini caption helpers"
    },
    {
      stage: TaskStage.PUBLISHING,
      title: "Publishing Queue",
      color: "border-t-sky-500",
      bg: "bg-sky-50/30",
      text: "text-sky-400 border-sky-900 bg-sky-950/30",
      descr: "Copy copy, pull files & post"
    },
    {
      stage: TaskStage.COMPLETED,
      title: "Completed Hub",
      color: "border-t-emerald-500",
      bg: "bg-emerald-50/30",
      text: "text-emerald-400 border-emerald-900 bg-emerald-950/30",
      descr: "Archived & Live links"
    }
  ];

  const gridBg = darkMode 
    ? "bg-zinc-950/40 p-4 rounded-2xl border border-zinc-850 shadow-sm" 
    : "bg-slate-100 p-4 rounded-2xl border border-slate-200 shadow-sm";

  const columnBg = darkMode 
    ? "bg-zinc-900/45 border-zinc-850 shadow-xs" 
    : "bg-white border-slate-200 shadow-xs";

  const textPrimary = darkMode ? "text-zinc-100" : "text-slate-800";
  const textSecondary = darkMode ? "text-zinc-500" : "text-slate-400";

  return (
    <div className={`grid grid-cols-1 gap-4 lg:grid-cols-5 ${gridBg}`}>
      {stagesDef.map((def) => {
        const stageTasks = tasks.filter((t) => t.stage === def.stage);

        return (
          <div
            key={def.stage}
            className={`flex flex-col rounded-xl border p-3 h-[680px] transition-all ${columnBg}`}
          >
            {/* Column header */}
            <div className={`border-t-2 ${def.color} pt-2 pb-3 mb-2 text-left`}>
              <div className="flex items-center justify-between">
                <h3 className={`font-sans font-bold text-xs flex items-center gap-1.5 uppercase tracking-wider ${textPrimary}`}>
                  {def.title}
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${def.text}`}>
                  {stageTasks.length}
                </span>
              </div>
              <p className={`text-[11px] font-sans mt-1 leading-tight ${textSecondary}`}>
                {def.descr}
              </p>
            </div>

            {/* Column content */}
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
              {stageTasks.length === 0 ? (
                <div className={`flex-1 flex flex-col items-center justify-center border border-dashed rounded-lg p-4 text-center ${
                  darkMode 
                    ? "border-zinc-800 bg-zinc-950/20 text-zinc-500" 
                    : "border-slate-200 bg-slate-50/50 text-slate-400"
                }`}>
                  <span className="text-xl opacity-40">📭</span>
                  <p className="text-[10px] font-sans mt-1">Empty queue</p>
                </div>
              ) : (
                stageTasks.map((task, idx) => {
                  const urgent = isWaitingForMyRole(task, activeRole);
                  
                  const cardBorderClass = urgent
                    ? "border-indigo-500 ring-1 ring-indigo-500/10"
                    : darkMode 
                      ? "border-zinc-800 hover:border-zinc-700" 
                      : "border-slate-200 hover:border-slate-300";

                  const cardBgClass = urgent
                    ? darkMode ? "bg-indigo-950/15" : "bg-indigo-50/20"
                    : darkMode ? "bg-zinc-950" : "bg-white";

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                      onClick={() => onCardClick(task)}
                      className={`group relative rounded-xl border p-3.5 text-left transition-all hover:shadow-md cursor-pointer select-none ${cardBorderClass} ${cardBgClass}`}
                    >
                      {/* Badge if it needs action now */}
                      {urgent && (
                        <span className="absolute -top-2 -right-1 flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-600 text-white font-sans font-extrabold text-[8px] uppercase tracking-wider animate-pulse shadow-sm">
                          <Sparkles className="h-2 w-2" /> Action Required
                        </span>
                      )}

                      <div className="space-y-2">
                        {/* Task metadata */}
                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] font-bold tracking-tight truncate max-w-[100px] ${
                            darkMode ? "text-zinc-400" : "text-slate-400"
                          }`} title={task.clientName}>
                            {task.clientName}
                          </span>
                          <span className={`flex items-center gap-1 text-[10px] font-medium border px-1.5 py-0.5 rounded ${
                            darkMode 
                              ? "bg-zinc-900 border-zinc-805 text-zinc-300" 
                              : "bg-slate-100 border-slate-200/60 text-slate-600"
                          }`}>
                            {getFormatIcon(task.format)}
                            <span className="text-[9px] font-sans font-semibold">{task.format}</span>
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className={`font-sans font-bold text-sm line-clamp-1 group-hover:text-indigo-500 transition-colors ${
                          darkMode ? "text-zinc-200" : "text-slate-800"
                        }`}>
                          {task.title}
                        </h4>

                        {/* Description snippet */}
                        <p className={`text-[11px] font-sans line-clamp-2 leading-relaxed ${
                          darkMode ? "text-zinc-400" : "text-slate-500"
                        }`}>
                          {task.description || "No project guidelines specified."}
                        </p>

                        {/* Deadline indicator if available */}
                        {task.deadline && (
                          <div className={`flex items-center gap-1.5 text-[9.5px] font-mono px-2 py-1 rounded-lg border ${
                            darkMode 
                              ? "bg-indigo-950/20 border-indigo-900/40 text-indigo-400" 
                              : "bg-indigo-50 border-indigo-100/80 text-indigo-650 font-semibold"
                          }`}>
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Due: {task.deadline}</span>
                          </div>
                        )}

                        {/* Stage Details progress marker */}
                        <div className={`pt-2 border-t flex items-center justify-between ${
                          darkMode ? "border-zinc-900" : "border-slate-100"
                        }`}>
                          
                          {/* Left icon indicators of accomplishments */}
                          <div className="flex items-center gap-1.5">
                            {task.rawFootageLink && (
                              <div className="h-4 w-4 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px]" title="Raw Footage Linked">📹</div>
                            )}
                            {task.editedFileLink && (
                              <div className="h-4 w-5 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px]" title="Edited Master File Ready">🎬</div>
                            )}
                            {task.captionText && (
                              <div className="h-4 w-4 rounded bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-[10px]" title="Captions Completed">✍️</div>
                            )}
                          </div>

                          {/* Age indicator */}
                          <div className={`text-[9px] font-mono flex items-center gap-1 ${
                            darkMode ? "text-zinc-500" : "text-slate-450"
                          }`}>
                            <Clock className="h-2.5 w-2.5" />
                            <span>
                              {(() => {
                                const hours = Math.round((Date.now() - new Date(task.updatedAt).getTime()) / 3600000);
                                if (hours < 1) return "Just now";
                                if (hours === 1) return "1h ago";
                                if (hours < 24) return `${hours}h ago`;
                                return `${Math.round(hours / 24)}d ago`;
                              })()}
                            </span>
                          </div>
                        </div>

                        {/* Prompt-like micro footer info */}
                        {task.stage === TaskStage.PLANNING && !task.rawFootageLink && (
                          <div className={`text-[9.5px] p-1 rounded border font-mono mt-1 font-semibold ${
                            darkMode
                              ? "bg-amber-950/15 border-amber-900/30 text-amber-500"
                              : "text-amber-750 bg-amber-50 border-amber-200/50"
                          }`}>
                            ⚠️ Awaiting Raw Footage
                          </div>
                        )}
                        
                        {task.stage === TaskStage.EDITING && (
                          <div className={`text-[9.5px] p-1 rounded border font-sans truncate font-semibold ${
                            darkMode
                              ? "bg-zinc-900 border-zinc-800 text-indigo-400"
                              : "text-indigo-750 bg-indigo-50 border-indigo-200/50"
                          }`}>
                            👤 Editor: {task.assignedEditor || "Unassigned"}
                          </div>
                        )}

                        {task.stage === TaskStage.WRITING && (
                          <div className={`text-[9.5px] p-1 rounded border font-sans flex items-center justify-between font-semibold ${
                            darkMode
                              ? "bg-pink-950/10 border-pink-900/30 text-pink-400"
                              : "text-pink-750 bg-pink-50 border-pink-200/50"
                          }`}>
                            <span>Ready for Captions</span>
                            <span className="text-[8px] bg-pink-650 text-white px-1 rounded animate-pulse font-bold">AI Assist</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
