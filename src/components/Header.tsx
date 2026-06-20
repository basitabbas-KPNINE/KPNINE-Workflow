import React from "react";
import { RoleType, UserProfile } from "../types";
import { Compass, Users, Sparkles, CheckCircle, Clock, Sun, Moon } from "lucide-react";

interface HeaderProps {
  currentRole: RoleType;
  onRoleChange: (role: RoleType) => void;
  stats: {
    planning: number;
    editing: number;
    writing: number;
    publishing: number;
    completed: number;
  };
  onResetSeed: () => void;
  loggedInUser?: any;
  onLogout?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const usersList: UserProfile[] = [
  { id: "u-planner-profile", name: "Planning & Strategy", role: "Planner", avatar: "📋" },
  { id: "u-editors-profile", name: "Video Production", role: "Editor", avatar: "🎬" },
  { id: "u-designer-profile", name: "Graphic Design", role: "Designer", avatar: "🎨" },
  { id: "u-writers-profile", name: "Copy & Captions", role: "Writer", avatar: "✍️" },
  { id: "u-publishing-profile", name: "Publishing Hub", role: "Publisher", avatar: "🚀" },
  { id: "u-dashboard-view", name: "Studio Insights", role: "Dashboard", avatar: "📈" },
];

export default function Header({ 
  currentRole, onRoleChange, stats, onResetSeed, loggedInUser, onLogout, darkMode, onToggleDarkMode 
}: HeaderProps) {
  
  const headerBg = darkMode 
    ? "border-b border-zinc-850 bg-zinc-900 text-zinc-100 shadow-md" 
    : "border-b border-slate-200 bg-white shadow-sm text-slate-800";

  const textPrimary = darkMode ? "text-white" : "text-slate-900";
  const textSecondary = darkMode ? "text-zinc-400" : "text-slate-500";
  const bgCard = darkMode ? "bg-zinc-950 border-zinc-850" : "bg-slate-50 border-slate-200";
  const bgInnerCard = darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200";
  
  return (
    <header className={`${headerBg} px-6 py-4`}>
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-lg shadow-md shadow-indigo-200">
            SM
          </div>
          <div className="text-left">
            <h1 className={`font-sans text-xl font-bold tracking-tight ${textPrimary} flex items-center gap-1.5`}>
              SocialMedia Pipeline
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider border ${
                darkMode ? "bg-zinc-800 border-zinc-700 text-indigo-400" : "bg-slate-100 border-slate-200 text-indigo-600"
              }`}>
                v3.0
              </span>
            </h1>
            <p className={`text-xs ${textSecondary}`}>Multi-role agency workflow · SQLite powered</p>
          </div>
        </div>

        {/* Mid-Row or Right Controls: Toggler and loggedIn status */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-2 text-xs font-semibold ${
              darkMode
                ? "border-zinc-800 bg-zinc-950 hover:bg-zinc-850 text-amber-400"
                : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-indigo-605"
            }`}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-indigo-600" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            )}
          </button>

          {loggedInUser ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className={`${bgCard} px-4 py-2 rounded-2xl flex items-center gap-2.5 border`}>
                <span className={`text-2xl h-9 w-9 flex items-center justify-center rounded-lg border shadow-xs ${bgInnerCard}`}>
                  {loggedInUser.avatar}
                </span>
                <div className="text-left">
                  <span className={`text-xs font-black ${textPrimary} block leading-tight`}>{loggedInUser.name}</span>
                  <span className="text-[9.5px] text-indigo-600 dark:text-indigo-400 font-bold block font-mono mt-0.5 uppercase tracking-wide">
                    {loggedInUser.role} Desk
                  </span>
                </div>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className={`px-4 py-2 border font-bold text-xs rounded-xl transition-all cursor-pointer ${
                    darkMode 
                      ? "border-zinc-800 hover:border-red-900 bg-zinc-950 hover:bg-red-950/30 text-zinc-350 hover:text-red-400" 
                      : "border-slate-200 hover:border-red-300 bg-white hover:bg-red-50 text-slate-600 hover:text-red-650"
                  }`}
                >
                  Switch Desk
                </button>
              )}
            </div>
          ) : (
            <div className={`flex flex-col gap-1.5 md:flex-row md:items-center p-2 rounded-xl border ${bgCard}`}>
              <span className={`text-[11px] font-mono uppercase tracking-wider ${darkMode ? "text-zinc-500" : "text-slate-400"} px-2 font-bold`}>
                View as:
              </span>
              <div className="flex flex-wrap gap-1">
                {usersList.map((user) => {
                  const isActive = user.role === currentRole;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => onRoleChange(user.role)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm"
                          : darkMode
                            ? "text-zinc-450 hover:text-white hover:bg-zinc-805"
                            : "text-slate-605 hover:text-slate-900 hover:bg-slate-200/50"
                      }`}
                    >
                      <span className="text-sm">{user.avatar}</span>
                      <span>{user.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Stats Bar */}
      <div className={`mx-auto max-w-7xl mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5 p-3 rounded-xl border ${bgCard}`}>
        {[
          { label: "Planning", count: stats.planning, icon: <Clock className="h-4 w-4" />, color: "indigo" },
          { label: "Editing", count: stats.editing, icon: <Compass className="h-4 w-4" />, color: "amber" },
          { label: "Writing", count: stats.writing, icon: <Sparkles className="h-4 w-4" />, color: "pink" },
          { label: "Publishing", count: stats.publishing, icon: <Users className="h-4 w-4" />, color: "sky" },
          { label: "Completed", count: stats.completed, icon: <CheckCircle className="h-4 w-4" />, color: "emerald", reset: true },
        ].map(({ label, count, icon, color, reset }, i) => {
          
          const colors: Record<string, string> = darkMode ? {
            indigo: "bg-indigo-950/40 text-indigo-400 border-indigo-900/60",
            amber: "bg-amber-955/40 text-amber-400 border-amber-900/60",
            pink: "bg-pink-955/40 text-pink-400 border-pink-900/60",
            sky: "bg-sky-955/30 text-sky-400 border-sky-900/60",
            emerald: "bg-emerald-955/40 text-emerald-400 border-emerald-900/60",
          } : {
            indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
            amber: "bg-amber-50 text-amber-600 border-amber-100",
            pink: "bg-pink-50 text-pink-600 border-pink-100",
            sky: "bg-sky-50 text-sky-600 border-sky-100",
            emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
          };

          const separator = i > 0 
            ? darkMode 
              ? "border-l border-zinc-800" 
              : "border-l border-slate-200"
            : "";

          return (
            <div key={label} className={`flex items-center gap-3 px-3 py-1 ${separator}`}>
              <div className={`rounded-lg p-2 border ${colors[color]}`}>{icon}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono uppercase ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{label}</span>
                  {reset && (
                    <button
                      type="button"
                      onClick={onResetSeed}
                      className={`text-[9px] font-mono hover:text-red-500 underline cursor-pointer ${
                        darkMode ? "text-zinc-500" : "text-slate-400"
                      }`}
                      title="Clear all campaigns"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className={`text-lg font-bold ${textPrimary}`}>{count}</div>
              </div>
            </div>
          );
        })}
      </div>
    </header>
  );
}
