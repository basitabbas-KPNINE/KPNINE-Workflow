import React, { useState } from "react";
import { Task } from "../types";
import { ChevronLeft, ChevronRight, Calendar, Info } from "lucide-react";

interface TaskCalendarProps {
  tasks: Task[];
  onCardClick: (task: Task) => void;
  darkMode?: boolean;
}

export default function TaskCalendar({ tasks, onCardClick, darkMode = true }: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper arrays
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Calculate days in month
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Build grid cells
  const cells: Array<{ date: Date | null; isToday: boolean }> = [];
  
  // Padding for first day of month
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push({ date: null, isToday: false });
  }

  const today = new Date();

  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    const itemDate = new Date(year, month, d);
    const isToday = 
      today.getDate() === d && 
      today.getMonth() === month && 
      today.getFullYear() === year;

    cells.push({ date: itemDate, isToday });
  }

  // Helper to format date into YYYY-MM-DD in local timezone
  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const textStyle = darkMode ? "text-zinc-100" : "text-slate-800";
  const bgStyle = darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200 shadow-xs";
  const headerBg = darkMode ? "bg-zinc-950 border-zinc-850" : "bg-slate-50 border-slate-200";

  return (
    <div id="project-calendar" className={`rounded-2xl border p-4 sm:p-5 transition-all ${bgStyle}`}>
      {/* Calendar Header with navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-indigo-500/15 rounded-lg flex items-center justify-center text-indigo-400">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <h3 className={`text-sm font-bold font-sans ${textStyle}`}>
              {monthNames[month]} {year}
            </h3>
            <p className="text-[10px] text-zinc-500 font-sans">Campaign Due Dates & Milestones</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className={`p-1.5 rounded-lg border hover:bg-zinc-800 transition-colors cursor-pointer ${
              darkMode ? "border-zinc-800 hover:bg-zinc-800/60" : "border-slate-200 hover:bg-slate-100"
            }`}
          >
            <ChevronLeft className={`h-4 w-4 ${darkMode ? "text-zinc-400" : "text-slate-650"}`} />
          </button>
          <button
            type="button"
            onClick={() => setCurrentDate(new Date())}
            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border font-mono transition-colors cursor-pointer ${
              darkMode 
                ? "border-zinc-800 bg-zinc-950 text-indigo-400 hover:bg-zinc-850" 
                : "border-slate-200 bg-slate-50 text-indigo-600 hover:bg-slate-100"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className={`p-1.5 rounded-lg border hover:bg-zinc-800 transition-colors cursor-pointer ${
              darkMode ? "border-zinc-800 hover:bg-zinc-800/60" : "border-slate-200 hover:bg-slate-100"
            }`}
          >
            <ChevronRight className={`h-4 w-4 ${darkMode ? "text-zinc-400" : "text-slate-650"}`} />
          </button>
        </div>
      </div>

      {/* Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {daysOfWeek.map((day) => (
          <div key={day} className={`text-[10.5px] font-bold uppercase tracking-wide font-sans py-1.5 ${
            darkMode ? "text-zinc-500" : "text-slate-500"
          }`}>
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (!cell.date) {
            return (
              <div
                key={`empty-${index}`}
                className={`min-h-[75px] sm:min-h-[92px] rounded-lg border border-transparent ${
                  darkMode ? "bg-zinc-950/20 opacity-25" : "bg-slate-100/50 opacity-40"
                }`}
              />
            );
          }

          const dateKey = formatDateKey(cell.date);
          const dayTasks = tasks.filter((t) => t.deadline === dateKey);

          return (
            <div
              key={dateKey}
              className={`min-h-[75px] sm:min-h-[92px] rounded-lg p-1.5 border flex flex-col justify-between transition-all group ${
                cell.isToday
                  ? darkMode
                    ? "bg-indigo-950/20 border-indigo-600 ring-1 ring-indigo-600/20"
                    : "bg-indigo-50 border-indigo-400 ring-1 ring-indigo-50"
                  : darkMode
                    ? "bg-zinc-950 border-zinc-900 hover:border-zinc-800"
                    : "bg-slate-50 border-slate-200 hover:border-slate-350"
              }`}
            >
              <div className="flex items-center justify-between pointer-events-none">
                <span
                  className={`text-[10px] font-bold leading-none h-5 w-5 flex items-center justify-center rounded-full font-mono ${
                    cell.isToday
                      ? "bg-indigo-600 text-white"
                      : darkMode
                        ? "text-zinc-400 group-hover:text-zinc-200"
                        : "text-slate-600 group-hover:text-slate-900"
                  }`}
                >
                  {cell.date.getDate()}
                </span>
                {dayTasks.length > 0 && (
                  <span className={`text-[9.5px] font-bold font-mono ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>
                    {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
                  </span>
                )}
              </div>

              {/* Tasks List within date cell */}
              <div className="mt-1.5 space-y-1 flex-1 overflow-y-auto max-h-[50px] sm:max-h-[60px] custom-scrollbar">
                {dayTasks.map((task) => {
                  let stageColor = darkMode 
                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                    : "bg-indigo-50 text-indigo-705 border border-indigo-100";
                  if (task.stage === "editing") stageColor = darkMode 
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                    : "bg-amber-50 text-amber-705 border border-amber-150";
                  if (task.stage === "writing") stageColor = darkMode 
                    ? "bg-pink-500/10 text-pink-400 border border-pink-500/20" 
                    : "bg-pink-50 text-pink-705 border border-pink-150";
                  if (task.stage === "publishing") stageColor = darkMode 
                    ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" 
                    : "bg-sky-50 text-sky-705 border border-sky-150";
                  if (task.stage === "completed") stageColor = darkMode 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                    : "bg-emerald-50 text-emerald-705 border border-emerald-150";

                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onCardClick(task)}
                      className={`w-full text-left truncate rounded px-1.5 py-0.5 text-[9px] font-sans font-semibold cursor-pointer transition-transform duration-75 hover:scale-[1.03] block ${stageColor}`}
                      title={`${task.clientName}: ${task.title}`}
                    >
                      {task.clientName}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className={`mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-[10px] font-sans ${
        darkMode ? "border-zinc-850 text-zinc-500" : "border-slate-200 text-slate-500"
      }`}>
        <div className="flex items-center gap-1.55">
          <Info className={`h-3.5 w-3.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`} />
          <span>Click any campaign entry on the calendar to manage its files & reviews.</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500"></span> Planning</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500"></span> Editing</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-pink-500"></span> Writing</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500"></span> Publishing</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Completed</span>
        </div>
      </div>
    </div>
  );
}
