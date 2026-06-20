import React from "react";
import { ActivityChange } from "../types";
import { Bell, Clock, Info, CheckCircle, ArrowRight, Clipboard } from "lucide-react";

interface NotificationFeedProps {
  activities: ActivityChange[];
  onClearStats?: () => void;
  darkMode?: boolean;
}

export default function NotificationFeed({ activities, darkMode }: NotificationFeedProps) {
  
  const getAvatar = (role: string) => {
    switch (role) {
      case 'Planner': return "👩‍💼";
      case 'Videographer': return "📹";
      case 'Editor': return "🎬";
      case 'Writer': return "✍️";
      case 'Publisher': return "🚀";
      default: return "🤖";
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'footage_added':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'edit_submitted':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      case 'caption_written':
        return 'text-pink-400 bg-pink-500/10 border-pink-500/20';
      case 'published':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      default:
        return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  return (
    <div className={`p-4 rounded-2xl shadow-lg flex flex-col h-full max-h-[500px] border transition-colors ${
      darkMode 
        ? "bg-zinc-900 border-zinc-800 text-zinc-100" 
        : "bg-white border-slate-200 text-slate-800"
    }`}>
      
      {/* Feed title */}
      <div className={`flex items-center justify-between border-b pb-3 mb-3 ${
        darkMode ? "border-zinc-850" : "border-slate-150"
      }`}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="h-4.5 w-4.5 text-teal-500" />
            <span className="absolute -top-1.5 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
          </div>
          <div>
            <h3 className={`font-sans font-bold text-xs uppercase tracking-wider ${
              darkMode ? "text-white" : "text-slate-800 font-extrabold"
            }`}>
              Studio Notification Alerts
            </h3>
            <p className={`text-[10px] font-sans ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
              Live handoffs & progress logs list
            </p>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
          darkMode ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-600 border border-slate-200"
        }`}>
          Last {Math.min(activities.length, 15)} logs
        </span>
      </div>

      {/* Notifications list */}
      <div className="space-y-2.5 overflow-y-auto flex-1 pr-1.5 scrollbar-thin">
        {activities.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-center">
            <span className="text-xl">💤</span>
            <p className="text-zinc-505 text-xs mt-1 font-sans">No recent activity logs.</p>
          </div>
        ) : (
          activities.slice(0, 15).map((act) => (
            <div 
              key={act.id} 
              className={`group p-3 rounded-xl border transition-colors flex items-start gap-2.5 text-left ${
                darkMode 
                  ? "bg-zinc-950 border-zinc-850/60 hover:border-zinc-800"
                  : "bg-slate-50 border-slate-150 hover:border-slate-250"
              }`}
            >
              {/* Profile Avatar */}
              <div 
                className={`h-7 w-7 rounded-lg flex items-center justify-center text-sm shadow-sm flex-shrink-0 border ${
                  darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-205"
                }`}
                title={`${act.userName} (${act.userRole})`}
              >
                {getAvatar(act.userRole)}
              </div>

              {/* Msg Details */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold block ${
                    darkMode ? "text-zinc-500" : "text-slate-450"
                  }`}>
                    {act.userName} • <span className="opacity-75">{act.userRole}</span>
                  </span>
                  
                  {/* Age */}
                  <span className={`text-[9px] font-mono flex items-center gap-0.5 ${
                    darkMode ? "text-zinc-600" : "text-slate-400"
                  }`}>
                    <Clock className="h-2 w-2" />
                    {(() => {
                      const seconds = Math.round((Date.now() - new Date(act.timestamp).getTime()) / 1000);
                      if (seconds < 60) return "now";
                      const minutes = Math.round(seconds / 60);
                      if (minutes < 60) return `${minutes}m`;
                      const hours = Math.round(minutes / 60);
                      if (hours < 24) return `${hours}h`;
                      return `${Math.round(hours / 24)}d`;
                    })()}
                  </span>
                </div>

                {/* Campaign Tag */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] font-mono px-1 rounded truncate max-w-[120px] ${
                    darkMode ? "bg-zinc-900 border border-zinc-850 text-zinc-400" : "bg-white border-slate-200 text-slate-600 font-semibold"
                  }`}>
                    {act.clientName}
                  </span>
                  <span className="text-zinc-505 text-[10px]">→</span>
                  <span className={`text-[11px] font-bold truncate max-w-[150px] ${
                    darkMode ? "text-zinc-200" : "text-slate-800"
                  }`}>
                    {act.taskTitle}
                  </span>
                </div>

                {/* Specific descriptive note */}
                <p className={`text-[11px] font-sans leading-relaxed pt-1 whitespace-pre-wrap break-words ${
                  darkMode ? "text-zinc-400" : "text-slate-650"
                }`}>
                  {act.details}
                </p>

                {/* Action Badge */}
                <div className="pt-1.5">
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[8.5px] uppercase font-mono font-bold border ${getActionColor(act.action)}`}>
                    {act.action.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
