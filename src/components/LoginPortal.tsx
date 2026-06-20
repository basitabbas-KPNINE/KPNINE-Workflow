import React, { useState } from "react";
import { AgencyUser, RoleType } from "../types";
import { Key, Shield, ChevronRight, User } from "lucide-react";

export interface DepartmentProfile {
  id: string;
  name: string;
  role: RoleType;
  avatar: string;
  passcode: string;
  description: string;
}

export const AGENCY_DEPARTMENTS: DepartmentProfile[] = [
  { id: "planner_dept", name: "Planning & Strategy Hub", role: "Planner", avatar: "📋", passcode: "planner", description: "Maintains strategist briefs, campaign launchers & goals" },
  { id: "editor_dept", name: "Video Production Desk", role: "Editor", avatar: "🎬", passcode: "editor", description: "Video editing room - cuts footage, short reels & video files" },
  { id: "designer_dept", name: "Creative Design Desk", role: "Designer", avatar: "🎨", passcode: "designer", description: "Graphic layout room - designs story layout, carousels & logos" },
  { id: "writer_dept", name: "Copy & Caption Desk", role: "Writer", avatar: "✍️", passcode: "writer", description: "Editorial writing desk - creates copywriting text with Gemini AI" },
  { id: "publisher_dept", name: "Publishing Hub", role: "Publisher", avatar: "🚀", passcode: "publisher", description: "Publishing desk - releases campaigns & updates Google spreadsheet" },
  { id: "director_dept", name: "Studio Insights Hub", role: "Dashboard", avatar: "📈", passcode: "insights", description: "Executive telemetry panel - D3 bottle-necks, slack logs & configs" },
];

interface LoginPortalProps {
  onLogin: (user: AgencyUser) => void;
}

export default function LoginPortal({ onLogin }: LoginPortalProps) {
  const [selectedDept, setSelectedDept] = useState<DepartmentProfile | null>(null);
  const [personName, setPersonName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) {
      setErrorMsg("Please select your department from the panel first.");
      return;
    }

    if (!personName.trim()) {
      setErrorMsg("Please enter your name to authenticate and attribute your updates.");
      return;
    }

    if (passcode.trim().toLowerCase() === selectedDept.passcode) {
      onLogin({
        id: `u-${selectedDept.role.toLowerCase()}-${Date.now()}`,
        name: personName.trim(),
        role: selectedDept.role,
        avatar: selectedDept.avatar,
        passcode: selectedDept.passcode,
        description: selectedDept.description,
      });
    } else {
      setErrorMsg(`Incorrect security passcode for ${selectedDept.name}. (Hint: use '${selectedDept.passcode}')`);
    }
  };

  const handleDeptSelect = (dept: DepartmentProfile) => {
    setSelectedDept(dept);
    setPersonName("");
    setPasscode("");
    setErrorMsg("");
  };

  const getDepartmentNames = (role: RoleType): string[] => {
    switch (role) {
      case "Planner":
        return ["Basit", "Fatima Malik"];
      case "Editor":
        return ["Yasir", "Ammar", "Zainab"];
      case "Designer":
        return ["Adila"];
      case "Writer":
        return ["Fatima Malik"];
      case "Publisher":
        return ["Basit"];
      case "Dashboard":
        return ["Basit", "Fatima Malik", "Adila", "Yasir", "Ammar", "Zainab"];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4">
      <div className="max-w-4xl w-full bg-zinc-900/50 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative text-left">
        
        {/* Left pane: Decorative & Info */}
        <div className="md:w-5/12 bg-gradient-to-br from-indigo-950/80 via-zinc-900 to-indigo-900/50 p-8 flex flex-col justify-between border-r border-zinc-805/50">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-black text-xl shadow-lg shadow-indigo-500/20">
              SM
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-white leading-tight font-sans">
                KPNINE Workflow Pipeline
              </h1>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Dynamic, collaborative workflow pipelines for multi-employee agencies. Access shared files, update campaigns, send webhook alerts, and write data to live spreadsheets.
              </p>
            </div>
          </div>

          <div className="pt-8 space-y-3">
            <div className="flex items-start gap-2.5 text-[11px] text-zinc-500">
              <Shield className="h-4 w-4 text-indigo-400 mt-0.2 flex-shrink-0" />
              <span>Attribution-driven system: Select your name upon selecting your department so your team remembers who did what in the handoff activities feed!</span>
            </div>
          </div>
        </div>

        {/* Right pane: Auth interactions */}
        <div className="md:w-7/12 p-8 flex flex-col justify-between min-h-[500px]">
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-1">Select Your Department Desk</h2>
              <p className="text-xs text-zinc-500 font-sans font-normal">Choose who you are entering as to access those specific controls</p>
            </div>

            {/* Profile Grid list of Departments */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AGENCY_DEPARTMENTS.map((dept) => {
                const isSelected = selectedDept?.id === dept.id;
                return (
                  <button
                    key={dept.id}
                    onClick={() => handleDeptSelect(dept)}
                    type="button"
                     className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-150 group cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600/15 border-indigo-505/80 text-white shadow-md shadow-indigo-600/5"
                        : "bg-zinc-900/80 border-zinc-800 text-zinc-350 hover:bg-zinc-850 hover:border-zinc-750"
                    }`}
                  >
                    <span className="text-2xl pt-0.5 bg-zinc-950/40 h-10 w-10 flex items-center justify-center rounded-lg border border-zinc-800/40">
                      {dept.avatar}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs truncate">{dept.name}</span>
                        {isSelected && <span className="text-[7.5px] bg-indigo-500 font-extrabold px-1.5 py-0.2 rounded text-white tracking-wider font-mono">SELECTED</span>}
                      </div>
                      <span className="text-[9.5px] text-indigo-400 block font-semibold leading-tight mt-0.5">{dept.role} Role</span>
                      <span className="text-[9px] text-zinc-500 block truncate mt-1 leading-normal font-sans font-normal">{dept.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Department selected details and user name */}
            {selectedDept && (
              <div className="space-y-4 border-t border-zinc-800/60 pt-5 animate-fade-in">
                
                {/* Custom Name entry field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <User className="h-3 w-3 text-indigo-400" /> Your Full Name / Employee Handler:
                  </label>
                  <select
                    required
                    value={personName}
                    onChange={(e) => {
                      setPersonName(e.target.value);
                      setErrorMsg("");
                    }}
                    className="w-full bg-zinc-950 border border-zinc-805 text-xs px-3.5 py-2.5 rounded-xl text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="">-- Select Your Name --</option>
                    {getDepartmentNames(selectedDept.role).map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <p className="text-[9.5px] text-zinc-500 font-sans leading-normal font-normal">
                    Attributes edits and Google Sheet submissions directly to you.
                  </p>
                </div>

                {/* Passcode entry field */}
                <form onSubmit={handleSubmit} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Key className="h-3 w-3 text-indigo-400" /> Class Verification Passcode:
                    </label>
                    <span className="text-[9px] text-zinc-500 font-mono">
                      Passcode hint: <code className="bg-zinc-955 border border-zinc-800 text-indigo-400 px-1.5 py-0.2 rounded font-bold font-mono">{selectedDept.passcode}</code>
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      required
                      placeholder={`Enter passcode for ${selectedDept.name}...`}
                      value={passcode}
                      onChange={(e) => {
                        setPasscode(e.target.value);
                        setErrorMsg("");
                      }}
                      className="flex-1 bg-zinc-950 border border-zinc-805 text-xs px-3.5 py-2.5 rounded-xl text-zinc-200 placeholder-zinc-700 tracking-wide focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                      type="submit"
                      className="px-5 bg-indigo-600 hover:bg-indigo-500 font-bold text-xs rounded-xl text-white transition-colors flex items-center gap-1 shadow-md shadow-indigo-600/10 cursor-pointer"
                    >
                      Enter Hub <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </form>

                {errorMsg && (
                  <div className="text-[10.5px] text-rose-450 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-center font-semibold font-sans">
                    ⚠️ {errorMsg}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-[10px] text-zinc-650 text-center font-mono mt-4 font-normal">
            Security Division &bull; SM Departmental Desk Routing &bull; v2.6.5
          </div>
        </div>
      </div>
    </div>
  );
}
