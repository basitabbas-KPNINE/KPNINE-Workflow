import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Task, ActivityChange, TaskStage } from "../types";
import { Clock, AlertTriangle, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";

interface D3BottleneckChartProps {
  tasks: Task[];
  activities: ActivityChange[];
}

interface StageData {
  id: string;
  name: string;
  avgHours: number;
  completedCount: number;
  color: string;
  isBottleneck: boolean;
}

export default function D3BottleneckChart({ tasks, activities }: D3BottleneckChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stageData, setStageData] = useState<StageData[]>([]);
  const [dimensions, setDimensions] = useState({ width: 450, height: 260 });
  
  // Custom tooltips state
  const [hoveredStage, setHoveredStage] = useState<StageData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Calculate Average Durations Per Stage
  useEffect(() => {
    // Stage configurations
    const stages = [
      { id: "planning", name: "Campaign Planning", color: "#6366f1" },
      { id: "editing", name: "Media Editing", color: "#f59e0b" },
      { id: "writing", name: "Content Copywriting", color: "#ec4899" },
      { id: "publishing", name: "Publishing & Verification", color: "#0ea5e9" }
    ];

    const stageDurations: Record<string, number[]> = {
      planning: [],
      editing: [],
      writing: [],
      publishing: []
    };

    // Calculate durations from either activities log (primary high-resolution) or task fields (fallback)
    // 1. Group activities by task ID
    const taskActivities: Record<string, ActivityChange[]> = {};
    activities.forEach(act => {
      if (act.taskId) {
        if (!taskActivities[act.taskId]) {
          taskActivities[act.taskId] = [];
        }
        taskActivities[act.taskId].push(act);
      }
    });

    // 2. Extract transitions
    tasks.forEach(task => {
      const id = task.id;
      const acts = (taskActivities[id] || []).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Find timestamps
      let createdTime = new Date(task.createdAt).getTime();
      let footageTime: number | null = task.videographerSubmittedAt ? new Date(task.videographerSubmittedAt).getTime() : null;
      let editedTime: number | null = task.editorSubmittedAt ? new Date(task.editorSubmittedAt).getTime() : null;
      let writtenTime: number | null = task.writerSubmittedAt ? new Date(task.writerSubmittedAt).getTime() : null;
      let publishedTime: number | null = task.publisherSubmittedAt ? new Date(task.publisherSubmittedAt).getTime() : null;

      // Scan activities for high precision fallback
      acts.forEach(act => {
        const time = new Date(act.timestamp).getTime();
        if (act.action === "created") {
          createdTime = time;
        } else if (act.action === "footage_added" || act.action === "sheet_imported") {
          footageTime = time;
        } else if (act.action === "edit_submitted") {
          editedTime = time;
        } else if (act.action === "caption_written") {
          writtenTime = time;
        } else if (act.action === "published") {
          publishedTime = time;
        }
      });

      // Duration calculations:
      // A. PLANNING: Created to Footage-Addition / Editing start
      if (footageTime && footageTime > createdTime) {
        stageDurations.planning.push((footageTime - createdTime) / 3600000);
      } else if (task.rawFootageLink) {
        // Fallback: campaign has raw footage, assume past planning stage
        // Let's assume average is 1.5 hours or calculate based on updatedAt
        const updateT = new Date(task.updatedAt).getTime();
        const plannedHours = Math.max(0.5, (updateT - createdTime) / 3600000);
        stageDurations.planning.push(Math.min(24, plannedHours)); // cap at 24 hrs fallback
      } else if (task.stage !== TaskStage.PLANNING) {
        // Bypassed planning stage, count minimal prep hours
        stageDurations.planning.push(0.2); // 12 minutes
      }

      // B. EDITING: Footage Added to Edited Master Submission
      if (editedTime && (footageTime || createdTime)) {
        const editStart = footageTime || createdTime;
        if (editedTime > editStart) {
          stageDurations.editing.push((editedTime - editStart) / 3600000);
        }
      } else if (task.editedFileLink) {
        const editStart = footageTime || createdTime;
        const submitT = new Date(task.updatedAt).getTime();
        if (submitT > editStart) {
          stageDurations.editing.push(Math.min(48, (submitT - editStart) / 3600000));
        }
      }

      // C. WRITING: Edited Submission to Writer Caption Submission
      if (writtenTime && (editedTime || createdTime)) {
        const writeStart = editedTime || createdTime;
        if (writtenTime > writeStart) {
          stageDurations.writing.push((writtenTime - writeStart) / 3600000);
        }
      } else if (task.captionText) {
        const writeStart = editedTime || createdTime;
        const submitT = new Date(task.updatedAt).getTime();
        if (submitT > writeStart) {
          stageDurations.writing.push(Math.min(24, (submitT - writeStart) / 3600000));
        }
      }

      // D. PUBLISHING: Caption Written to Live publication
      if (publishedTime && (writtenTime || createdTime)) {
        const pubStart = writtenTime || createdTime;
        if (publishedTime > pubStart) {
          stageDurations.publishing.push((publishedTime - pubStart) / 3600000);
        }
      } else if (task.publishedLink) {
        const pubStart = writtenTime || createdTime;
        const submitT = new Date(task.updatedAt).getTime();
        if (submitT > pubStart) {
          stageDurations.publishing.push(Math.min(12, (submitT - pubStart) / 3600000));
        }
      }
    });

    // Compute averages
    const processedStages = stages.map(s => {
      const times = stageDurations[s.id] || [];
      const completedCount = times.length;
      
      // Benchmarks to display if no data has been registered yet (interactive realism)
      const benchmarkHours: Record<string, number> = {
        planning: 1.8,
        editing: 4.2,
        writing: 2.5,
        publishing: 1.2
      };

      const avgHours = completedCount > 0 
        ? d3.mean(times) || 0.1 
        : benchmarkHours[s.id]; // healthy dashboard baseline

      return {
        id: s.id,
        name: s.name,
        avgHours: parseFloat(avgHours.toFixed(1)),
        completedCount,
        color: s.color,
        isBottleneck: false
      };
    });

    // Find the highest average duration to mark as primary bottleneck!
    let maxHours = 0;
    let bottleneckIndex = -1;
    processedStages.forEach((stage, idx) => {
      if (stage.avgHours > maxHours) {
        maxHours = stage.avgHours;
        bottleneckIndex = idx;
      }
    });

    if (bottleneckIndex !== -1) {
      processedStages[bottleneckIndex].isBottleneck = true;
    }

    setStageData(processedStages);
  }, [tasks, activities]);

  // Handle visual element scaling on resize
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      setDimensions({
        width: Math.max(300, width),
        height: 240
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // D3 Draw logic in SVG
  useEffect(() => {
    if (!svgRef.current || stageData.length === 0) return;

    // Clear previous elements
    const svgElement = d3.select(svgRef.current);
    svgElement.selectAll("*").remove();

    const { width, height } = dimensions;
    const margin = { top: 15, right: 35, bottom: 35, left: 140 };

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Create main drawing group
    const g = svgElement
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Define x and y scales
    const maxVal = d3.max(stageData, (d: any) => d.avgHours) as any;
    const xScale = d3.scaleLinear()
      .domain([0, (maxVal as number) * 1.15 || 5])
      .range([0, chartWidth]);

    const yScale = d3.scaleBand()
      .domain(stageData.map(d => d.name))
      .range([0, chartHeight])
      .padding(0.35);

    // Grid lines
    g.append("g")
      .attr("class", "grid-lines")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(5)
          .tickSize(-chartHeight)
          .tickFormat(() => "")
      )
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line")
        .attr("stroke", "#334155")
        .attr("stroke-dasharray", "3,3")
      );

    // Create custom linear gradient for normal vs bottleneck bars
    const defs = svgElement.append("defs");

    // Regular Gradient (Indigo to blue)
    const regularGrad = defs.append("linearGradient")
      .attr("id", "regular-bar-grad")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");
    regularGrad.append("stop").attr("offset", "0%").attr("stop-color", "#6366f1");
    regularGrad.append("stop").attr("offset", "100%").attr("stop-color", "#3b82f6");

    // Bottleneck Gradient (Orange to Red)
    const bottleneckGrad = defs.append("linearGradient")
      .attr("id", "bottleneck-bar-grad")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");
    bottleneckGrad.append("stop").attr("offset", "0%").attr("stop-color", "#f97316");
    bottleneckGrad.append("stop").attr("offset", "100%").attr("stop-color", "#ef4444");

    // Left Y Axis
    g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale).tickSize(0))
      .call(g => g.select(".domain").attr("stroke", "#475569"))
      .call(g => g.selectAll(".tick text")
        .attr("fill", "#94a3b8")
        .attr("font-size", "11px")
        .attr("font-family", "Inter, sans-serif")
        .attr("font-weight", 500)
        .attr("dx", "-10px")
      );

    // Bottom X Axis
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `${d}h`))
      .call(g => g.select(".domain").attr("stroke", "#475569"))
      .call(g => g.selectAll(".tick text")
        .attr("fill", "#64748b")
        .attr("font-size", "10px")
        .attr("font-family", "JetBrains Mono, monospace")
        .attr("dy", "10px")
      );

    // Draw bars
    const bars = g.selectAll(".bar")
      .data(stageData)
      .enter()
      .append("g")
      .attr("class", "bar-group")
      .style("cursor", "pointer");

    bars.append("rect")
      .attr("class", "bar")
      .attr("y", (d: any) => yScale(d.name) || 0)
      .attr("x", 0)
      .attr("height", yScale.bandwidth())
      .attr("rx", 5) // clean rounded corners
      .attr("ry", 5)
      .attr("fill", (d: any) => d.isBottleneck ? "url(#bottleneck-bar-grad)" : "url(#regular-bar-grad)")
      .attr("opacity", 0.9)
      .on("mouseenter", function (event, d: any) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("opacity", 1)
          .attr("stroke", d.isBottleneck ? "#fecdd3" : "#dbeafe")
          .attr("stroke-width", 1.5);

        setHoveredStage(d);
        const [mx, my] = d3.pointer(event, svgRef.current);
        setTooltipPos({ x: mx + 15, y: my - 10 });
      })
      .on("mousemove", function (event) {
        const [mx, my] = d3.pointer(event, svgRef.current);
        setTooltipPos({ x: mx + 15, y: my - 10 });
      })
      .on("mouseleave", function (event, d: any) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("opacity", 0.9)
          .attr("stroke", "none");
        
        setHoveredStage(null);
      })
      // Animated bar expansion entrance transition!
      .attr("width", 0)
      .transition()
      .duration(800)
      .delay((d, i) => i * 120)
      .attr("width", (d: any) => Math.max(12, xScale(d.avgHours)));

    // Add value text label inside or right next to each bar
    bars.append("text")
      .attr("class", "bar-label")
      .attr("y", (d: any) => (yScale(d.name) || 0) + yScale.bandwidth() / 2 + 4)
      .attr("fill", "#ffffff")
      .attr("font-size", "10px")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-weight", "bold")
      .attr("x", 0) // initial position for transition matching
      .transition()
      .duration(850)
      .delay((d, i) => i * 120)
      .attr("x", (d: any) => {
        const rectW = xScale(d.avgHours);
        return rectW > 45 ? rectW - 40 : rectW + 8;
      })
      .attr("fill", (d: any) => {
        const rectW = xScale(d.avgHours);
        return rectW > 45 ? "#ffffff" : d.isBottleneck ? "#f97316" : "#6366f1";
      })
      .text((d: any) => `${d.avgHours}h`);

  }, [stageData, dimensions]);

  // Find structural bottleneck details
  const currentBottleneck = stageData.find(s => s.isBottleneck);

  // Recommendations mapping to optimize the specific active bottleneck
  const getBottleneckTip = (id: string) => {
    switch(id) {
      case "planning":
        return "Improve client brief clarity with ready-to-use content ingestion widgets to speed up raw assets setup.";
      case "editing":
        return "Introduce shared pre-saved audio elements to help editors complete cutdowns instantly.";
      case "writing":
        return "Double down on Google Gemini Assistance templates to write first-draft social hooks instantaneously.";
      case "publishing":
        return "Set automated publication rules or schedule sheets backups during non-peak agency hours.";
      default:
        return "Analyze manual approval workflows to minimize campaign transition delays.";
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col relative" ref={containerRef}>
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3.5">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400" /> Stage Bottleneck Analytics (D3.js)
          </h4>
          <p className="text-[10px] text-slate-400 mt-1 font-sans">
            Real-time average campaign transition times mapped across historical changes.
          </p>
        </div>
        
        {currentBottleneck && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/15 rounded-lg text-[10px] font-mono text-amber-400 self-start sm:self-center">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
            <span>Bottleneck: {currentBottleneck.name}</span>
          </div>
        )}
      </div>

      {/* SVG Canvas Stage */}
      <div className="relative w-full overflow-hidden flex justify-center items-center py-1">
        <svg ref={svgRef} className="block select-none"></svg>

        {/* Dynamic HTML Tooltip Overlaid inside container */}
        {hoveredStage && (
          <div 
            className="absolute z-10 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-200 pointer-events-none shadow-xl max-w-xs transition-all duration-75 space-y-1 font-sans"
            style={{ 
              left: `${tooltipPos.x}px`, 
              top: `${tooltipPos.y}px`,
              transform: "translate(-10px, -110%)"
            }}
          >
            <div className="flex items-center gap-1.5 border-b border-slate-900 pb-1 font-bold">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: hoveredStage.color }} />
              <span className="text-white">{hoveredStage.name}</span>
            </div>
            <div>
              Average Time: <strong className="text-indigo-300">{hoveredStage.avgHours} Hours</strong>
            </div>
            <div className="text-[10px] text-slate-500">
              {hoveredStage.completedCount > 0 
                ? `Calculated from ${hoveredStage.completedCount} workflow events.` 
                : "Seeded reference baseline (pending new actions)."}
            </div>
            {hoveredStage.isBottleneck && (
              <span className="text-[9.5px] text-rose-400 font-bold flex items-center gap-0.5 pt-0.5">
                🚨 Primary Workflow Bottleneck
              </span>
            )}
          </div>
        )}
      </div>

      {/* Insight Analysis Panel */}
      {currentBottleneck ? (
        <div className="bg-slate-950 p-3 rounded-xl border border-rose-950/20 text-[10.5px] space-y-1.5">
          <span className="font-bold text-rose-400 flex items-center gap-1 font-mono uppercase tracking-wide">
            <AlertCircle className="h-3.5 w-3.5 text-rose-500" /> Operational Insights:
          </span>
          <p className="text-slate-300 leading-relaxed font-sans">
            Campaigns spend the most duration in the <strong className="text-white">{currentBottleneck.name}</strong> stage, averaging <strong className="text-amber-400">{currentBottleneck.avgHours} hours</strong> from entry to exit.
          </p>
          <div className="flex gap-2 items-start bg-slate-900/50 p-2 rounded-lg border border-slate-900/80 mt-1">
            <Sparkles className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <span className="text-zinc-300 text-[10px] leading-relaxed">
              <strong>Recommendation:</strong> {getBottleneckTip(currentBottleneck.id)}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-[10px] flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>Workflow is running at optimal efficiency. Keep up the high delivery!</span>
        </div>
      )}

    </div>
  );
}
