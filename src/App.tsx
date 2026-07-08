import React, { useEffect, useState } from "react";
import Header, { usersList } from "./components/Header";
import TaskBoard from "./components/TaskBoard";
import TaskCalendar from "./components/TaskCalendar";
import RoleWorkspace from "./components/RoleWorkspace";
import NotificationFeed from "./components/NotificationFeed";
import TaskModal from "./components/TaskModal";
import LoginPortal from "./components/LoginPortal";
import { Task, TaskStage, RoleType, ActivityChange, AgencyUser } from "./types";
import { RefreshCw, Sparkles, Sliders, CheckSquare, Layers, HelpCircle, Bell, Clock } from "lucide-react";

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<ActivityChange[]>([]);
  const [currentRole, setCurrentRole] = useState<RoleType>("Planner");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<AgencyUser | null>(null);
  
  // Theme and Calendar layout states
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("pipeline-theme");
    return saved !== "light"; // default to true (dark theme)
  });
  const [viewStyle, setViewStyle] = useState<"board" | "calendar">("board");

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("pipeline-theme", next ? "dark" : "light");
      return next;
    });
  };
  
  // Loading & State tracking
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [alertNotification, setAlertNotification] = useState<string | null>(null);

  // Filter tasks strictly for the logged-in team member if they are assigned to specific ones
  const getVisibleTasks = () => {
    if (!loggedInUser) return tasks;
    const { role, name } = loggedInUser;
    // Admin, Planners, and Dashboard/Insights see all tasks
    if (role === "Planner" || role === "Dashboard") return tasks;
    
    return tasks.filter((task) => {
      if (role === "Editor" || role === "Designer") {
        return task.assignedEditor === name;
      }
      if (role === "Writer") {
        return task.assignedWriter === name;
      }
      // Publisher sees all tasks in publishing stage
      return true;
    });
  };

  const visibleTasks = getVisibleTasks();

  // Stats calculation
  const getStats = () => {
    return {
      planning: visibleTasks.filter((t) => t.stage === TaskStage.PLANNING).length,
      editing: visibleTasks.filter((t) => t.stage === TaskStage.EDITING).length,
      writing: visibleTasks.filter((t) => t.stage === TaskStage.WRITING).length,
      publishing: visibleTasks.filter((t) => t.stage === TaskStage.PUBLISHING).length,
      completed: visibleTasks.filter((t) => t.stage === TaskStage.COMPLETED).length,
    };
  };

  // 1. Fetch campaigns and activities list from API routes
  const fetchData = async (showLoadingIndicator = false) => {
    if (showLoadingIndicator) setIsRefreshing(true);
    try {
      const [tasksRes, activitiesRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/activities"),
      ]);

      if (tasksRes.ok && activitiesRes.ok) {
        const tasksData: Task[] = await tasksRes.json();
        const activitiesData: ActivityChange[] = await activitiesRes.json();
        
        // Detect if recent handoffs occurred for our active role to show visual notifications
        checkForNewHandoffs(tasksData, tasks);

        setTasks(tasksData);
        setActivities(activitiesData);
      }
    } catch (error) {
      console.error("Critical: Error communicating with Full-Stack Express backend:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Detect pipeline changes and trigger toast notifications!
  const checkForNewHandoffs = (newTasks: Task[], oldTasks: Task[]) => {
    if (oldTasks.length === 0) return;
    
    // Find tasks that changed to a stage that correlates with current role
    newTasks.forEach((task) => {
      const match = oldTasks.find((t) => t.id === task.id);
      if (match && match.stage !== task.stage) {
        const roleForStage: Record<TaskStage, RoleType> = {
          [TaskStage.PLANNING]: "Planner",
          [TaskStage.EDITING]: "Editor",
          [TaskStage.WRITING]: "Writer",
          [TaskStage.PUBLISHING]: "Publisher",
          [TaskStage.COMPLETED]: "Publisher"
        };

        const targetRole = roleForStage[task.stage];
        if (targetRole === currentRole) {
          triggerToastAlert(`🔔 Handoff Alert: "${task.title}" has been advanced to your queue (${currentRole})!`);
        }
      }
    });
  };

  const triggerToastAlert = (msg: string) => {
    setAlertNotification(msg);
    // Dismiss after 4s
    setTimeout(() => {
      setAlertNotification(null);
    }, 4500);
  };

  // Load database files initially and set up 6-second polling loop for multi-employee simultaneous updates!
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [currentRole]);

  // Load task detail changes if currently active details modal is open
  useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find((t) => t.id === selectedTask.id);
      if (updated) {
        setSelectedTask(updated);
      }
    }
  }, [tasks]);

  // 2. Client form action triggers
  const handleAddTask = async (taskData: any) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskData,
          userId: loggedInUser?.id || "u-planner",
          userName: loggedInUser?.name || "Basit",
          userRole: currentRole,
        }),
      });

      if (res.ok) {
        triggerToastAlert("✅ Campaign created and launched successfully!");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTask = async (id: string, updates: any) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updates,
          $actionUserId: loggedInUser?.id || "u-anon",
          $actionUserName: loggedInUser?.name || "Anonymous Creator",
          $actionUserRole: currentRole,
        }),
      });

      if (res.ok) {
        triggerToastAlert("🚀 Stage updated and handoff sent successfully!");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        triggerToastAlert("🗑️ Campaign design campaign deleted");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Reset database back to seed campaigns
  const handleResetSeeds = async () => {
    if (confirm("Reset current Agency database back to original starting Seed campaigns? This will overwrite your sessions edits.")) {
      try {
        const res = await fetch("/api/reset", { method: "POST" });
        if (res.ok) {
          triggerToastAlert("📋 Database reset back to default campaigns successfully!");
          fetchData();
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const filteredMyTasks = loggedInUser ? visibleTasks.filter((task) => {
    const role = loggedInUser.role;
    
    if (role === "Editor") {
      return task.stage === TaskStage.EDITING && (task.format === "Video" || task.format === "Long Video" || task.format === "Short Video" || !task.format);
    }
    if (role === "Designer") {
      return task.stage === TaskStage.EDITING && (task.format === "Graphic" || task.format === "Carousel");
    }
    if (role === "Writer") {
      return task.stage === TaskStage.WRITING;
    }
    if (role === "Publisher") {
      return task.stage === TaskStage.PUBLISHING;
    }
    return false;
  }) : [];

  if (!loggedInUser) {
    return <LoginPortal onLogin={(user) => { setLoggedInUser(user); setCurrentRole(user.role); }} />;
  }

  const isCreativeDesk = ["Editor", "Designer", "Writer", "Publisher"].includes(loggedInUser.role);

  return (
    <div className={`min-h-screen font-sans antialiased flex flex-col transition-colors duration-200 ${
      darkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-slate-800"
    }`}>
      
      {/* 1. Header Toggler */}
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        stats={getStats()}
        onResetSeed={handleResetSeeds}
        loggedInUser={loggedInUser}
        onLogout={() => setLoggedInUser(null)}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* Main Body container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Dynamic handoff alert popup toast */}
        {alertNotification && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-teal-500 text-zinc-950 px-5 py-3 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-3.5 border border-teal-400 animate-bounce">
            <span className="text-sm">🔔</span>
            <span className="font-sans font-semibold text-[13px]">{alertNotification}</span>
            <button 
              onClick={() => setAlertNotification(null)}
              className="hover:bg-teal-600/30 font-bold px-1.5 py-0.5 rounded text-[10px] uppercase font-mono tracking-widest cursor-pointer"
            >
              Ok
            </button>
          </div>
        )}

        {/* ----------------- MULTI-PAGE SINGLE DEDICATED VIEW IMPLEMENTATIONS ----------------- */}

        {/* CASE A: ADMIN / STUDIO INSIGHTS DASHBOARD */}
        {loggedInUser.role === "Dashboard" && (
          <div className="space-y-6 animate-fade-in">
            <div className={`p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border ${
              darkMode 
                ? "bg-zinc-900 border-zinc-800" 
                : "bg-white border-slate-200 shadow-sm text-slate-800"
            }`}>
              <div>
                <h2 className={`text-base font-bold flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-800"}`}>
                  <span className="text-lg">📈</span> Studio Insights Executive Dashboard
                </h2>
                <p className={`text-xs mt-1 font-sans ${darkMode ? "text-zinc-400" : "text-slate-550"}`}>
                  Real-time bottleneck telemetry, spreadsheet connectors, and live communication webhooks.
                </p>
              </div>
              <button
                onClick={() => fetchData(true)}
                disabled={isRefreshing}
                className={`px-3.5 py-1.5 font-mono font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer text-xs border ${
                  darkMode
                    ? "bg-zinc-950 border-zinc-800 hover:bg-zinc-850 text-zinc-200"
                    : "bg-slate-50 border-slate-205 hover:bg-slate-100 text-slate-700"
                }`}
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin text-teal-450" : ""}`} />
                Refresh Analytics
              </button>
            </div>

            <RoleWorkspace
              activeRole={currentRole}
              tasks={tasks}
              activities={activities}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onTasksImported={fetchData}
              loggedInUser={loggedInUser}
              darkMode={darkMode}
              selectedTask={selectedTask}
            />
          </div>
        )}

        {/* CASE B: CREATIVE DEPARTMENT WORKSPACE (Editor, Designer, Writer, Publisher) */}
        {isCreativeDesk && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Simple Branded Department Panel Header */}
            <div className={`border p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              darkMode 
                ? "bg-gradient-to-br from-indigo-950/20 via-zinc-900 to-zinc-900 border-zinc-850 text-white" 
                : "bg-white border-slate-200 shadow-sm text-slate-800"
            }`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{loggedInUser.avatar}</span>
                  <h2 className={`text-base font-bold font-sans uppercase tracking-wide ${darkMode ? "text-white" : "text-slate-805"}`}>
                    {loggedInUser.name} &bull; {loggedInUser.role} Desk
                  </h2>
                </div>
                <p className={`text-xs mt-1.5 font-sans ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
                  Manage active deliverables assigned to you, execute quick handoffs, and monitor recent notifications.
                </p>
              </div>

              <button
                onClick={() => fetchData(true)}
                disabled={isRefreshing}
                className={`px-3.5 py-1.5 rounded-xl font-mono text-[11px] font-bold flex items-center gap-1.5 border cursor-pointer self-start ${
                  darkMode
                    ? "hover:bg-zinc-805 border-zinc-850 bg-zinc-900 text-zinc-300"
                    : "hover:bg-slate-200 border-slate-250 bg-slate-100 text-slate-700"
                }`}
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin text-teal-450" : ""}`} />
                Sync Desk DB
              </button>
            </div>

            {/* Structured 3-Column layout: Assigned Queue | Submission Form | Deadlines & notification feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Side: Tasks queue and submission form */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* 1. Queue list of tasks assigned to this creator */}
                <div className={`border rounded-2xl p-5 space-y-4 ${
                  darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200 shadow-xs"
                }`}>
                  <div className={`flex items-center justify-between border-b pb-3 ${
                    darkMode ? "border-zinc-850" : "border-slate-105"
                  }`}>
                    <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono ${
                      darkMode ? "text-zinc-300" : "text-slate-700"
                    }`}>
                      <CheckSquare className="h-4 w-4 text-indigo-400" /> Active Assigned Campaigns ({filteredMyTasks.length})
                    </h3>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      *Click campaign to review details
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {filteredMyTasks.length === 0 ? (
                      <div className={`sm:col-span-2 border border-dashed rounded-xl p-8 text-center ${
                        darkMode ? "border-zinc-800 bg-zinc-950/45" : "border-slate-200 bg-slate-50/50"
                      }`}>
                        <span className="text-2xl">🙌</span>
                        <p className="text-zinc-550 text-xs mt-1.5 font-sans">
                          All caught up! No campaigns currently waiting for your attention.
                        </p>
                      </div>
                    ) : (
                      filteredMyTasks.map((task) => {
                        const createdAtTime = new Date(task.createdAt).getTime();
                        const hoursDiff = (Date.now() - createdAtTime) / 3600000;
                        const isOverdue = hoursDiff > 24;

                        return (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className={`group p-4 rounded-xl text-left cursor-pointer transition-all relative flex flex-col justify-between border ${
                              darkMode 
                                ? "bg-zinc-955 border-zinc-850 hover:border-zinc-700" 
                                : "bg-slate-50 border-slate-200 hover:border-slate-350"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className={`text-[10px] font-black uppercase tracking-wide truncate max-w-[125px] ${
                                  darkMode ? "text-zinc-500" : "text-slate-400"
                                }`}>
                                  {task.clientName}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono leading-none font-bold uppercase tracking-wider border ${
                                  darkMode 
                                    ? "bg-zinc-900 border-zinc-800 text-indigo-450" 
                                    : "bg-slate-100 border-slate-200 text-indigo-650"
                                }`}>
                                  {task.format}
                                </span>
                              </div>
                              <h4 className={`text-xs font-black transition-colors uppercase tracking-tight ${
                                darkMode ? "text-white group-hover:text-indigo-400" : "text-slate-801 group-hover:text-indigo-600"
                              }`}>
                                {task.title}
                              </h4>
                              <p className={`text-[10.5px] line-clamp-2 leading-relaxed font-sans ${
                                darkMode ? "text-zinc-400" : "text-slate-500"
                              }`}>
                                {task.description}
                              </p>

                              {/* Task Deadline Badge */}
                              {task.deadline && (
                                <div className={`flex items-center gap-1.5 text-[9.5px] font-mono px-2 py-1 rounded-lg border w-fit ${
                                  darkMode 
                                    ? "bg-indigo-950/20 border-indigo-900/40 text-indigo-400" 
                                    : "bg-indigo-50 border-indigo-100 text-indigo-755 font-semibold"
                                }`}>
                                  <span>Due: {task.deadline}</span>
                                </div>
                              )}
                            </div>

                            <div className={`mt-4 pt-2.5 border-t flex items-center justify-between text-[10px] font-mono ${
                              darkMode ? "border-zinc-900" : "border-slate-150"
                            }`}>
                              <span className="text-zinc-500">Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                              <div className={`flex items-center gap-1 ${isOverdue ? "text-rose-450 font-bold" : "text-emerald-500"}`}>
                                <Clock className="h-3.5 w-3.5" />
                                <span>{isOverdue ? "Overdue" : "Due: Immediately"}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 2. Submissions Action Center form */}
                <RoleWorkspace
                  activeRole={loggedInUser.role}
                  tasks={tasks}
                  activities={activities}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onTasksImported={fetchData}
                  loggedInUser={loggedInUser}
                  darkMode={darkMode}
                  selectedTask={selectedTask}
                />
              </div>

              {/* Right Side: Activity log notifications filtered specifically for their desk updates */}
              <div className="lg:col-span-1 space-y-4">
                <NotificationFeed
                  activities={activities.filter(
                    (act) => act.userRole === loggedInUser.role || act.action === "created" || act.userName === loggedInUser.name
                  )}
                  darkMode={darkMode}
                />
              </div>

            </div>
          </div>
        )}
            {/* CASE C: STRATEGY & PLANNING (Planner Role) */}
        {loggedInUser.role === "Planner" && (
          <div className="space-y-6 animate-fade-in">
            {/* Collaborative Departments Welcome Center */}
            <div className={`p-6 rounded-2xl space-y-6 relative overflow-hidden border ${
              darkMode 
                ? "bg-zinc-900 border-zinc-800 text-white" 
                : "bg-white border-slate-200 shadow-sm text-slate-850"
            }`}>
              <div className={`relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 ${
                darkMode ? "border-zinc-850" : "border-slate-150"
              }`}>
                <div>
                  <h2 className={`text-base font-bold flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-800"}`}>
                    <Sparkles className="h-4.5 w-4.5 text-teal-500" />
                    Creative Planner Workspace
                  </h2>
                  <p className={`text-xs mt-1 leading-normal ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
                    Orchestrate agency content pipelines, create briefs, assign teams, and view the entire pipeline below.
                  </p>
                </div>
                
                <button
                  onClick={() => fetchData(true)}
                  disabled={isRefreshing}
                  className={`px-3.5 py-2 rounded-xl font-mono text-xs flex items-center gap-2 border cursor-pointer transition-colors ${
                    darkMode
                      ? "hover:bg-zinc-850 border-zinc-800 bg-zinc-900 text-zinc-350"
                      : "hover:bg-slate-100 border-slate-250 bg-slate-50 text-slate-700 font-semibold"
                  }`}
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin text-teal-450" : ""}`} />
                  Sync Board {isRefreshing ? "Syncing..." : ""}
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10 text-left">
                {[
                  { title: "Video Editor", team: "Yasir / Ammar / Zainab", icon: "🎬", color: "text-amber-500" },
                  { title: "Designer", team: "Adila", icon: "🎨", color: "text-emerald-500" },
                  { title: "Writer", team: "Fatima Malik", icon: "✍️", color: "text-pink-500" },
                  { title: "Publisher", team: "Basit", icon: "🚀", color: "text-sky-500" }
                ].map((item) => (
                  <div key={item.title} className={`p-3 rounded-lg border ${
                    darkMode ? "bg-zinc-950 border-zinc-850" : "bg-slate-50 border-slate-150"
                  }`}>
                    <span className="text-md">{item.icon}</span>
                    <h4 className={`text-[10px] font-bold uppercase tracking-wider font-mono mt-0.5 ${item.color}`}>{item.title}</h4>
                    <p className={`text-[10px] leading-tight block mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-500"}`}>Assigned: {item.team}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Master Kanban Pipeline Board */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 px-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className={`font-bold font-sans text-xs uppercase tracking-wider flex items-center gap-1.5 ${
                    darkMode ? "text-zinc-350" : "text-slate-800"
                  }`}>
                    <Layers className="h-4 w-4 text-zinc-500" /> Master Design Pipeline
                  </h3>
                  
                  {/* View Style Switcher Tabs */}
                  <div className={`flex rounded-lg p-0.5 border ${
                    darkMode ? "bg-zinc-950 border-zinc-850" : "bg-slate-200/60 border-slate-250"
                  }`}>
                    <button
                      type="button"
                      onClick={() => setViewStyle("board")}
                      className={`px-3 py-1 font-sans font-bold text-[10.5px] rounded-md transition-all cursor-pointer ${
                        viewStyle === "board"
                          ? darkMode
                            ? "bg-zinc-805 text-indigo-400 border border-zinc-700 shadow-sm"
                            : "bg-white text-indigo-650 border border-slate-150 shadow-xs"
                          : darkMode
                            ? "text-zinc-500 hover:text-zinc-300"
                            : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      📋 Board View
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewStyle("calendar")}
                      className={`px-3 py-1 font-sans font-bold text-[10.5px] rounded-md transition-all cursor-pointer ${
                        viewStyle === "calendar"
                          ? darkMode
                            ? "bg-zinc-805 text-indigo-400 border border-zinc-700 shadow-sm"
                            : "bg-white text-indigo-650 border border-slate-150 shadow-xs"
                          : darkMode
                            ? "text-zinc-500 hover:text-zinc-300"
                            : "text-slate-500 hover:text-slate-705"
                      }`}
                    >
                      📅 Calendar View
                    </button>
                  </div>
                </div>

                <span className={`text-[10.5px] font-sans ${darkMode ? "text-zinc-500" : "text-slate-500"}`}>
                  💡 Click any campaign card to review, edit or delete files.
                </span>
              </div>
              
              {isLoading ? (
                <div className="h-48 flex flex-col items-center justify-center border border-zinc-850 rounded-2xl bg-zinc-900/40">
                  <LoaderIndicator />
                </div>
              ) : viewStyle === "calendar" ? (
                <TaskCalendar
                  tasks={visibleTasks}
                  onCardClick={setSelectedTask}
                  darkMode={darkMode}
                />
              ) : (
                <TaskBoard
                  tasks={visibleTasks}
                  onCardClick={setSelectedTask}
                  activeRole={currentRole}
                  darkMode={darkMode}
                />
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-3">
              <div className="lg:col-span-2">
                <RoleWorkspace
                  activeRole={currentRole}
                  tasks={visibleTasks}
                  activities={activities}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onTasksImported={fetchData}
                  loggedInUser={loggedInUser}
                  darkMode={darkMode}
                  selectedTask={selectedTask}
                />
              </div>

              <div className="lg:col-span-1">
                <NotificationFeed activities={activities} />
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Campaign Details Drawer/Side panel */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onDeleteTask={handleDeleteTask}
          activeRole={currentRole}
          activities={activities}
        />
      )}

      {/* Simple neat Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-5 text-center mt-12 text-xs text-zinc-650">
        <p className="text-zinc-650 font-sans">
          SocialMedia Agency Workflow Pipeline &bull; Interactive Multi-Desk Terminal
        </p>
      </footer>

    </div>
  );
}

// Micro loader component
function LoaderIndicator() {
  return (
    <div className="flex flex-col items-center gap-2">
      <RefreshCw className="h-6 w-6 text-teal-400 animate-spin" />
      <span className="text-xs text-zinc-500 tracking-wider font-semibold">Synchronizing Studio Pipeline Data...</span>
    </div>
  );
}

