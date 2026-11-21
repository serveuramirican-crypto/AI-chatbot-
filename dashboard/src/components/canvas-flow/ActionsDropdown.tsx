"use client"

import React, { useState } from "react"
import {
  ChevronRight,
  Bot,
  FileCode,
  Wrench,
  GitBranch,
  MessageSquare,
  CreditCard,
  LayoutGrid,
  MousePointerClick,
  Mic,
  Sparkles,
  Zap,
  Braces,
  Network,
  Code,
  Brain,
  PhoneForwarded,
  Settings,
  TerminalSquare,
  X,
} from "lucide-react"

interface ActionsDropdownProps {
  onClose?: () => void
  onActionSelect?: (label: string) => void
}

interface ActionItem {
  icon: React.ReactNode
  label: string
  color?: string
  children?: ActionItem[]
}

const actions: ActionItem[] = [
  {
    icon: <Bot className="h-4 w-4 text-violet-400" />,
    label: "Agentic AI",
    children: [
      { icon: <Bot className="h-4 w-4 text-blue-400" />, label: "AI Agent" },
      { icon: <Sparkles className="h-4 w-4 text-violet-400" />, label: "Playbook" },
    ],
  },
  {
    icon: <FileCode className="h-4 w-4 text-sky-400" />,
    label: "Scripted Dialogue",
    children: [
      { icon: <MessageSquare className="h-4 w-4 text-sky-400" />, label: "Message" },
      { icon: <LayoutGrid className="h-4 w-4 text-orange-400" />, label: "Carousel" },
      { icon: <CreditCard className="h-4 w-4 text-emerald-400" />, label: "Cards" },
      { icon: <MousePointerClick className="h-4 w-4 text-indigo-400" />, label: "Buttons" },
      { icon: <Mic className="h-4 w-4 text-pink-400" />, label: "Listen" },
    ],
  },
  {
    icon: <Wrench className="h-4 w-4 text-amber-400" />,
    label: "Tools & Integrations",
    children: [
      { icon: <Network className="h-4 w-4 text-green-400" />, label: "API" },
      { icon: <Braces className="h-4 w-4 text-blue-400" />, label: "Function" },
      { icon: <Zap className="h-4 w-4 text-yellow-400" />, label: "Tool" },
      { icon: <Brain className="h-4 w-4 text-purple-400" />, label: "KB search" },
    ],
  },
  {
    icon: <GitBranch className="h-4 w-4 text-emerald-400" />,
    label: "Logic & Routing",
    children: [
      { icon: <GitBranch className="h-4 w-4 text-emerald-400" />, label: "Condition" },
      { icon: <Code className="h-4 w-4 text-slate-300" />, label: "Javascript" },
      { icon: <PhoneForwarded className="h-4 w-4 text-rose-400" />, label: "Call forward" },
      { icon: <Settings className="h-4 w-4 text-gray-400" />, label: "Custom action" },
    ],
  },
]

/**
 * Actions Dropdown — context menu that appears at the terminal end of a
 * connector line, allowing the user to seamlessly branch and add nodes.
 */
export default function ActionsDropdown({ onClose, onActionSelect }: ActionsDropdownProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  return (
    <div className="w-56 rounded-2xl bg-[#0f121a]/95 backdrop-blur-xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.7)] text-white select-none relative z-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-2.5">
        <span className="text-xs font-bold tracking-tight text-white/90">Add Next Action</span>
        {onClose && (
          <button
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded-md text-white/40 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Menu items */}
      <ul className="p-1.5 space-y-0.5">
        {actions.map((item) => (
          <li
            key={item.label}
            className="relative"
            onMouseEnter={() => setHoveredItem(item.label)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <button className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition group">
              <span className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 border border-white/5 group-hover:bg-white/15 transition shadow-xs">
                  {item.icon}
                </div>
                <span>{item.label}</span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-white/30 group-hover:text-white/80 transition" />
            </button>

            {/* Submenu */}
            {item.children && hoveredItem === item.label && (
              <div className="absolute left-full top-0 ml-1.5 w-48 rounded-2xl bg-[#0f121a]/95 backdrop-blur-xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.7)] p-1.5 z-50 animate-in fade-in slide-in-from-left-2 duration-150">
                <ul className="space-y-0.5">
                  {item.children.map((child) => (
                    <li key={child.label}>
                      <button
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onActionSelect) onActionSelect(child.label)
                        }}
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 border border-white/5 shadow-xs">
                          {child.icon}
                        </div>
                        <span className="truncate">{child.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
