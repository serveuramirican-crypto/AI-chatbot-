"use client"

import React from "react"
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
} from "lucide-react"

interface LibraryItem {
  icon: React.ReactNode
  label: string
  /** dataTransfer payload — defaults to label if not set */
  dragType?: string
}

interface LibrarySection {
  title?: string
  items: LibraryItem[]
}

const sections: LibrarySection[] = [
  {
    items: [
      { icon: <MessageSquare className="h-4 w-4 text-green-500" />, label: "Chat Input", dragType: "chat_input" },
      { icon: <Bot className="h-4 w-4 text-blue-500" />, label: "Agentic", dragType: "agent" },
      { icon: <BookOpen className="h-4 w-4" />, label: "Playbook", dragType: "playbook_reference" },
      { icon: <Users className="h-4 w-4" />, label: "Crew" },
    ],
  },
  {
    title: "Tools",
    items: [
      { icon: <Link2 className="h-4 w-4" />, label: "API" },
      { icon: <FunctionSquare className="h-4 w-4" />, label: "Function" },
      { icon: <Puzzle className="h-4 w-4" />, label: "Integration" },
      { icon: <Server className="h-4 w-4" />, label: "MCP" },
    ],
  },
  {
    title: "Logic",
    items: [
      { icon: <Settings2 className="h-4 w-4" />, label: "Set" },
      { icon: <GitBranch className="h-4 w-4" />, label: "Condition" },
      { icon: <Sliders className="h-4 w-4" />, label: "Operator" },
      { icon: <Code2 className="h-4 w-4" />, label: "Code" },
      { icon: <Workflow className="h-4 w-4" />, label: "Workflow" },
      { icon: <Square className="h-4 w-4" />, label: "End" },
    ],
  },
]

/**
 * NodeLibrary — floating white card panel listing all available node types
 * organized into sections (Playbook/Crew, Tools, Logic).
 */
export default function NodeLibrary() {
  return (
    <div className="w-44 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
      {sections.map((section, si) => (
        <div key={si}>
          {/* Section divider (except before first) */}
          {si > 0 && <div className="mx-3 border-t border-gray-100" />}

          {/* Optional section title */}
          {section.title && (
            <p className="px-4 pb-0.5 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {section.title}
            </p>
          )}

          {/* Items */}
          <ul className="py-1">
            {section.items.map((item) => (
              <li key={item.label}>
                <button
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('actionType', item.dragType ?? item.label)}
                  className="flex w-full cursor-grab items-center gap-3 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50 active:cursor-grabbing"
                >
                  <span className="text-gray-400">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
