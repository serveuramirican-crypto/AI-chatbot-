"use client"

import React, { useState } from "react"
import {
  BookOpen,
  Users,
  Bot,
  Link2,
  FunctionSquare,
  Puzzle,
  Server,
  Settings2,
  GitBranch,
  Sliders,
  Code2,
  Workflow,
  Square,
  MessageSquare,
  Camera,
  Search,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Sparkles,
} from "lucide-react"

interface LibraryItem {
  icon: React.ReactNode
  label: string
  color: string
  /** dataTransfer payload — defaults to label if not set */
  dragType?: string
  description?: string
}

interface LibrarySection {
  title: string
  accentColor: string
  items: LibraryItem[]
}

const sections: LibrarySection[] = [
  {
    title: "Triggers & Inputs",
    accentColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    items: [
      {
        icon: <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />,
        label: "Chat Input",
        color: "group-hover:text-emerald-300",
        dragType: "chat_input",
        description: "Wait for visitor message",
      },
    ],
  },
  {
    title: "AI & Agents",
    accentColor: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    items: [
      {
        icon: <Bot className="h-3.5 w-3.5 text-violet-400" />,
        label: "Agentic",
        color: "group-hover:text-violet-300",
        dragType: "agent",
        description: "Autonomous AI agent step",
      },
      {
        icon: <BookOpen className="h-3.5 w-3.5 text-purple-400" />,
        label: "Playbook",
        color: "group-hover:text-purple-300",
        dragType: "playbook_reference",
        description: "Structured workflow playbook",
      },
      {
        icon: <Users className="h-3.5 w-3.5 text-indigo-400" />,
        label: "Crew",
        color: "group-hover:text-indigo-300",
        description: "Multi-agent squad handover",
      },
    ],
  },
  {
    title: "Tools & APIs",
    accentColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    items: [
      {
        icon: <Link2 className="h-3.5 w-3.5 text-sky-400" />,
        label: "API",
        color: "group-hover:text-sky-300",
        description: "Call external REST endpoint",
      },
      {
        icon: <FunctionSquare className="h-3.5 w-3.5 text-cyan-400" />,
        label: "Function",
        color: "group-hover:text-cyan-300",
        description: "Execute custom serverless task",
      },
      {
        icon: <Puzzle className="h-3.5 w-3.5 text-blue-400" />,
        label: "Integration",
        color: "group-hover:text-blue-300",
        description: "Connect 3rd party service",
      },
      {
        icon: <Server className="h-3.5 w-3.5 text-teal-400" />,
        label: "MCP",
        color: "group-hover:text-teal-300",
        description: "Model Context Protocol server",
      },
    ],
  },
  {
    title: "Logic & Flow",
    accentColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    items: [
      {
        icon: <Settings2 className="h-3.5 w-3.5 text-amber-400" />,
        label: "Set",
        color: "group-hover:text-amber-300",
        description: "Store variable in session",
      },
      {
        icon: <GitBranch className="h-3.5 w-3.5 text-orange-400" />,
        label: "Condition",
        color: "group-hover:text-orange-300",
        description: "If / Else branching logic",
      },
      {
        icon: <Sliders className="h-3.5 w-3.5 text-yellow-400" />,
        label: "Operator",
        color: "group-hover:text-yellow-300",
        description: "Mathematical & string operation",
      },
      {
        icon: <Code2 className="h-3.5 w-3.5 text-emerald-400" />,
        label: "Code",
        color: "group-hover:text-emerald-300",
        description: "Inline JavaScript execution",
      },
      {
        icon: <Workflow className="h-3.5 w-3.5 text-rose-400" />,
        label: "Workflow",
        color: "group-hover:text-rose-300",
        description: "Sub-workflow trigger",
      },
      {
        icon: <Camera className="h-3.5 w-3.5 text-purple-400" />,
        label: "Capture",
        color: "group-hover:text-purple-300",
        description: "Capture user response to context",
      },
      {
        icon: <Square className="h-3.5 w-3.5 text-red-400" />,
        label: "End",
        color: "group-hover:text-red-300",
        description: "Terminate current dialogue",
      },
    ],
  },
]

/**
 * NodeLibrary — modern floating glassmorphic palette listing available node types.
 * Supports quick search filtering, drag-and-drop, and compact/expand toggling.
 */
export default function NodeLibrary() {
  const [search, setSearch] = useState("")
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Filter sections by search query
  const filteredSections = sections
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((item) =>
        item.label.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((sec) => sec.items.length > 0)

  return (
    <div
      className={`
        transition-all duration-300 ease-in-out select-none
        rounded-2xl bg-[#0f121a]/90 backdrop-blur-xl border border-white/10
        shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden
        ${isCollapsed ? "w-14" : "w-52"}
      `}
    >
      {/* ── Top Bar / Collapse Toggle ─────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2.5">
        {!isCollapsed && (
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-bold tracking-tight text-white/90">Node Library</span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand node library" : "Collapse node library"}
          className={`flex h-6 w-6 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition ${
            isCollapsed ? "mx-auto" : ""
          }`}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* ── Search Input (visible when expanded) ─────────────────────────── */}
      {!isCollapsed && (
        <div className="px-2.5 pt-2 pb-1">
          <div className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 focus-within:border-blue-500/50 focus-within:bg-white/10 transition">
            <Search className="h-3 w-3 text-white/40 shrink-0" />
            <input
              type="text"
              placeholder="Search blocks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-[11px] text-white/90 placeholder-white/30 outline-none"
            />
          </div>
        </div>
      )}

      {/* ── Scrollable Items List ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-220px)] p-1.5 space-y-2">
        {filteredSections.map((section, si) => (
          <div key={si} className="space-y-0.5">
            {/* Section Title */}
            {!isCollapsed && (
              <div className="px-2 pt-1 pb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  {section.title}
                </span>
              </div>
            )}

            {/* Items */}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <div
                  key={item.label}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("actionType", item.dragType ?? item.label)
                  }
                  title={`${item.label}${item.description ? ` — ${item.description}` : ""}`}
                  className={`
                    group flex items-center rounded-xl p-1.5 text-xs font-medium text-white/80
                    hover:bg-white/10 hover:text-white transition-all cursor-grab active:cursor-grabbing
                    ${isCollapsed ? "justify-center" : "gap-2.5"}
                  `}
                >
                  {/* Icon Badge */}
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/5 group-hover:bg-white/15 group-hover:border-white/20 transition-all shadow-xs">
                    {item.icon}
                  </div>

                  {/* Label */}
                  {!isCollapsed && (
                    <div className="flex flex-1 items-center justify-between min-w-0 pr-1">
                      <span className={`truncate text-xs font-medium ${item.color} transition-colors`}>
                        {item.label}
                      </span>
                      <GripVertical className="h-3 w-3 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
